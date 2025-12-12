// src/services/auction.service.js
const Auction = require('../models/auction.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');
const Redlock = require('redlock').default;
const { client: redis } = require('../config/redis');
const { scheduleAuctionEnd, removeAuctionEnd } = require('./timer.service');
const config = require('../config');

const redlock = new Redlock([redis], {
  retryCount: 3,
  retryDelay: 200,
  driftFactor: 0.01
});

/**
 * computeMinNextBid - returns minimal next bid given current and room settings
 */
function computeMinNextBid(currentAmount, roomSettings) {
  if (!currentAmount) currentAmount = 0;
  if (!roomSettings) {
    // default percent increment
    const inc = Math.max(1, Math.round(currentAmount * config.minIncrementPct));
    return currentAmount + inc;
  }
  if (roomSettings.bidIncrementType === 'fixed') {
    return currentAmount + (roomSettings.bidIncrementValue || 1);
  } else {
    const pct = (roomSettings.bidIncrementValue || config.minIncrementPct * 100) / 100;
    const inc = Math.max(1, Math.round(currentAmount * pct));
    return currentAmount + inc;
  }
}

/**
 * createAuction - create & schedule auction
 */
async function createAuction({ roomId, playerId, startTime = Date.now(), durationSec = 30, reservePrice = 0 }) {
  const start = (startTime instanceof Date) ? startTime : new Date(Number(startTime));
  const end = new Date(start.getTime() + durationSec * 1000);
  const auction = await Auction.create({
    roomId,
    playerId,
    startTime: start,
    endTime: end,
    reservePrice,
    status: 'running'
  });

  await scheduleAuctionEnd(auction._id.toString(), end.getTime());
  return auction;
}

/**
 * placeBid - core authoritative bid handling
 */
async function placeBid({ auctionId, userId, amount, roomSettings = null }) {
  // Acquire per-auction lock
  const lockKey = `locks:auction:${auctionId}`;
  let lock;
  try {
    lock = await redlock.acquire([lockKey], 2000);
  } catch (err) {
    throw new Error('Could not acquire lock; try again');
  }

  try {
    const auction = await Auction.findById(auctionId);
    if (!auction) throw new Error('Auction not found');
    if (auction.status !== 'running') throw new Error('Auction not running');

    const now = Date.now();
    if (auction.endTime.getTime() <= now) throw new Error('Auction already ended');

    const current = auction.highestBid?.amount || auction.reservePrice || 0;
    const minNext = computeMinNextBid(current, roomSettings);
    if (amount < minNext) throw new Error(`Bid too low; min next is ${minNext}`);

    // Check user balance (we assume simple immediate deduction/reserve not implemented fully here)
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    if ((user.balance || 0) < amount) throw new Error('Insufficient balance');

    // Append bid and update highestBid
    auction.bids.push({ userId, amount, timestamp: new Date(), isAuto: false });
    auction.highestBid = { userId, amount, timestamp: new Date() };

    // Anti-snipe: extend if within window
    const timeLeftSec = Math.ceil((auction.endTime.getTime() - Date.now()) / 1000);
    if (timeLeftSec <= config.antiSnipeWindowSec) {
      auction.endTime = new Date(Date.now() + config.antiSnipeExtendSec * 1000);
      // reschedule in Redis
      await scheduleAuctionEnd(auction._id.toString(), auction.endTime.getTime());
    }

    await auction.save();
    await lock.release();

    return {
      auctionId: auction._id.toString(),
      highestBid: auction.highestBid,
      timeLeft: Math.ceil((auction.endTime.getTime() - Date.now()) / 1000)
    };
  } catch (err) {
    if (lock) await lock.release().catch(() => {});
    throw err;
  }
}

/**
 * settleAuction - called by worker when auction ends
 * attempts to mark auction ended and transfer funds (simple)
 */
async function settleAuction(auctionId) {
  const lockKey = `locks:auction:settle:${auctionId}`;
  let lock;
  try {
    lock = await redlock.acquire([lockKey], 5000);
  } catch (err) {
    // another worker is settling
    return null;
  }

  try {
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      await removeAuctionEnd(auctionId);
      await lock.release();
      return null;
    }
    if (auction.status !== 'running') {
      await removeAuctionEnd(auctionId);
      await lock.release();
      return null;
    }

    // Mark ended
    auction.status = 'ended';
    await auction.save();

    // determine winner
    const winnerBid = auction.highestBid;
    if (!winnerBid || !winnerBid.userId) {
      // No sale — cleanup
      await removeAuctionEnd(auctionId);
      await lock.release();
      return { auctionId, settled: false, reason: 'no_bids' };
    }

    // Basic money transfer: deduct winner balance and mark settled
    // NOTE: For production, use transactions and reserve funds at bid time.
    const session = await mongoose.startSession();
    let settled = false;
    try {
      session.startTransaction();
      const winner = await User.findById(winnerBid.userId).session(session);
      if (!winner) {
        await session.abortTransaction();
        await lock.release();
        return { auctionId, settled: false, reason: 'winner_not_found' };
      }
      if ((winner.balance || 0) < winnerBid.amount) {
        // Insufficient balance at settle — treat as failed
        await session.abortTransaction();
        auction.status = 'ended';
        await auction.save();
        await removeAuctionEnd(auctionId);
        await lock.release();
        return { auctionId, settled: false, reason: 'insufficient_balance_at_settle' };
      }
      winner.balance -= winnerBid.amount;
      await winner.save({ session });

      auction.status = 'settled';
      await auction.save({ session });

      await session.commitTransaction();
      settled = true;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    await removeAuctionEnd(auctionId);
    await lock.release();

    return { auctionId, settled, winner: winnerBid.userId.toString(), amount: winnerBid.amount };
  } catch (err) {
    if (lock) await lock.release().catch(() => {});
    throw err;
  }
}

module.exports = { createAuction, placeBid, settleAuction, computeMinNextBid };
