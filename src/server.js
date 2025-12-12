// src/server.js
const http = require('http');
const mongoose = require('mongoose');
const { createClient } = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');
const socketHandler = require('./sockets/socket-handler');
const app = require('./app');
const config = require('./config');
const { client: redis } = require('./config/redis');
const { main: startWorker } = require('./workers/auction-worker');

async function start() {
  // connect mongo
  await mongoose.connect(config.mongoUri, { autoIndex: true });
  console.log('Connected to MongoDB');

  // setup http + socket.io
  const server = http.createServer(app);
  const io = require('socket.io')(server, {
    cors: { origin: '*' },
    pingTimeout: 30000
  });

  // Redis adapter for socket.io
  const pubClient = createClient(config.redisUrl);
  const subClient = pubClient.duplicate();

  // await pubClient.connect();
  // await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));
  console.log('Socket.IO Redis adapter configured');

  // start socket handlers
  socketHandler(io);

  // subscribe to auction events (worker publishes to 'auction:events')
  const sub = createClient(config.redisUrl);
  // await sub.connect();
  await sub.subscribe('auction:events', (message) => {
    try {
      const ev = JSON.parse(message);
      if (ev.type === 'auction_settled') {
        // broadcast to room viewers that auction settled
        io.to(`room_${ev.auctionId}`).emit('auction_settled', { auctionId: ev.auctionId, winner: ev.winner, amount: ev.amount });
      } else if (ev.type === 'auction_ended_no_sale') {
        io.to(`room_${ev.auctionId}`).emit('auction_ended_no_sale', { auctionId: ev.auctionId, reason: ev.reason });
      }
    } catch (err) {
      console.error('Error handling auction event', err);
    }
  });

  // start worker in the same process for simplicity (in prod run separately)
  startWorker(config.mongoUri).catch((err) => console.error('Worker error', err));

  // start server
  const port = config.port;
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start', err);
  process.exit(1);
});
