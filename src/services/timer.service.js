// src/services/timer.service.js
// Manage Redis sorted set of ending auctions
const { client: redis } = require('../config/redis');

// zset key for auctions
const ZSET_KEY = 'auctions:ending';

/**
 * scheduleAuctionEnd - add auction to the sorted set with score=endTimestamp
 * @param {string} auctionId
 * @param {number|Date} endTs - ms epoch or Date
 */
async function scheduleAuctionEnd(auctionId, endTs) {
  const score = (endTs instanceof Date) ? endTs.getTime() : Number(endTs);
  await redis.zadd(ZSET_KEY, score, auctionId);
  // also set a convenience key with end time
  await redis.set(`auction:${auctionId}:end`, score);
}

/**
 * removeAuctionEnd - remove auction from zset (called when settled/cancelled)
 */
async function removeAuctionEnd(auctionId) {
  await redis.zrem(ZSET_KEY, auctionId);
  await redis.del(`auction:${auctionId}:end`);
}

/**
 * getDueAuctions - return array of auctionIds whose end <= now
 */
async function getDueAuctions() {
  const now = Date.now();
  const items = await redis.zrangebyscore(ZSET_KEY, 0, now, 'LIMIT', 0, 100);
  return items;
}

module.exports = { scheduleAuctionEnd, removeAuctionEnd, getDueAuctions, ZSET_KEY };
