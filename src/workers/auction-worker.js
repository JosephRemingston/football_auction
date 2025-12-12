// src/workers/auction-worker.js
// Simple poller worker that checks Redis sorted set and settles due auctions.
const mongoose = require('mongoose');
const config = require('../config');
const { client: redis } = require('../config/redis');
const { getDueAuctions } = require('../services/timer.service');
const { settleAuction } = require('../services/auction.service');

let running = false;

async function main(mongoUri) {
  // connect mongoose if not already
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri, { autoIndex: true });
  }

  running = true;
  console.log('Auction worker started');

  while (running) {
    try {
      const due = await getDueAuctions();
      if (due && due.length) {
        for (const auctionId of due) {
          try {
            const result = await settleAuction(auctionId);
            if (result && result.settled) {
              console.log('Settled auction', auctionId, 'winner', result.winner, 'amount', result.amount);
              // publish event to notify sockets about settlement (pub/sub key "auction:events")
              await redis.publish('auction:events', JSON.stringify({
                type: 'auction_settled',
                auctionId,
                winner: result.winner,
                amount: result.amount
              }));
            } else {
              console.log('Auction settlement result', result);
              // publish ended with no sale
              await redis.publish('auction:events', JSON.stringify({
                type: 'auction_ended_no_sale',
                auctionId,
                reason: result ? result.reason : 'unknown'
              }));
            }
          } catch (err) {
            console.error('Error settling auction', auctionId, err);
          }
        }
      }
    } catch (err) {
      console.error('Worker loop error', err);
    }

    // sleep 1s
    await new Promise((res) => setTimeout(res, 1000));
  }
}

module.exports = { main };
