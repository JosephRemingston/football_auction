// src/config/redis.js
const IORedis = require('ioredis');
const { redisUrl } = require('./index');

const client = new IORedis(redisUrl);

client.on('error', (err) => {
  console.error('Redis error', err);
});

module.exports = { client };
