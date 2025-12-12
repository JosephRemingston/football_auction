// src/sockets/socket-handler.js
const Auction = require('../models/auction.model');
const Room = require('../models/room.model');
const auctionService = require('../services/auction.service');
const { socketAuthMiddleware } = require('../middleware/auth.middleware');

module.exports = function(io) {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`Socket connected: ${socket.id} user=${user.username}`);

    socket.on('join_room', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) return socket.emit('error', { message: 'Room not found' });
        socket.join(`room_${roomId}`);
        socket.emit('room_joined', { room });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('leave_room', ({ roomId }) => {
      socket.leave(`room_${roomId}`);
      socket.emit('left_room', { roomId });
    });

    socket.on('place_bid', async ({ auctionId, amount }) => {
      try {
        if (!auctionId || typeof amount !== 'number') {
          return socket.emit('bid_rejected', { reason: 'invalid_payload' });
        }
        const auction = await Auction.findById(auctionId);
        if (!auction) return socket.emit('bid_rejected', { reason: 'auction_not_found' });

        // Fetch room settings if desired
        const room = await Room.findById(auction.roomId);
        const roomSettings = room ? room.settings : null;

        const result = await auctionService.placeBid({ auctionId, userId: socket.user._id, amount, roomSettings });

        // Broadcast update to room
        io.to(`room_${auction.roomId}`).emit('new_highest_bid', {
          auctionId: result.auctionId,
          highestBid: result.highestBid,
          timeLeft: result.timeLeft
        });
      } catch (err) {
        socket.emit('bid_rejected', { reason: err.message || 'server_error' });
      }
    });

    socket.on('disconnect', (reason) => {
      // optional: handle presence
      console.log(`Socket disconnected: ${socket.id} reason=${reason}`);
    });
  });
};
