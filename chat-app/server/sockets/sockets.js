import User from '../models/User.js';
import Message from '../models/Message.js';
import Room from '../models/Room.js';

// Track online users: maps userId -> Set of socketIds
const onlineUsers = new Map();

export const configureSockets = (io) => {
  io.on('connection', (socket) => {
    let currentUserId = null;
    let currentRoomId = null;

    console.log(`Socket connected: ${socket.id}`);

    // User connects / authenticates identity
    socket.on('user_connected', async (userId) => {
      if (!userId) return;
      currentUserId = userId;

      // Add socket ID to user's set of sockets
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);

      try {
        // Set user status online in DB
        const user = await User.findByIdAndUpdate(
          userId,
          { status: 'online' },
          { new: true }
        );

        if (user) {
          // Broadcast presence update to all connected clients
          io.emit('user_presence', {
            userId: user._id,
            username: user.username,
            avatar: user.avatar,
            status: 'online',
          });
        }
      } catch (err) {
        console.error('Error updating user presence:', err.message);
      }
    });

    // Join Chat Room
    socket.on('join_room', ({ roomId, userId }) => {
      if (!roomId) return;
      
      // Leave previous room if any
      if (currentRoomId && currentRoomId !== roomId) {
        socket.leave(currentRoomId);
        socket.to(currentRoomId).emit('user_stopped_typing', { roomId: currentRoomId, userId: currentUserId });
      }

      currentRoomId = roomId;
      socket.join(roomId);
      console.log(`User ${userId} (Socket ${socket.id}) joined room: ${roomId}`);
    });

    // Typing Indicators
    socket.on('typing', ({ roomId, username }) => {
      if (!roomId) return;
      socket.to(roomId).emit('user_typing', { roomId, username, userId: currentUserId });
    });

    socket.on('stop_typing', ({ roomId, username }) => {
      if (!roomId) return;
      socket.to(roomId).emit('user_stopped_typing', { roomId, username, userId: currentUserId });
    });

    // Send Message
    socket.on('send_message', async ({ roomId, senderId, content }) => {
      if (!roomId || !senderId || !content.trim()) return;

      try {
        // Create and save message
        const newMessage = await Message.create({
          room: roomId,
          sender: senderId,
          content: content,
        });

        // Populate sender info
        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'username avatar status');

        // Broadcast to all sockets in the room (including sender)
        io.to(roomId).emit('new_message', populatedMessage);
      } catch (err) {
        console.error('Error sending message:', err.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      if (currentUserId && onlineUsers.has(currentUserId)) {
        const userSockets = onlineUsers.get(currentUserId);
        userSockets.delete(socket.id);

        // If user has no active sockets left, mark offline
        if (userSockets.size === 0) {
          onlineUsers.delete(currentUserId);

          try {
            const user = await User.findByIdAndUpdate(
              currentUserId,
              { status: 'offline' },
              { new: true }
            );

            if (user) {
              io.emit('user_presence', {
                userId: user._id,
                username: user.username,
                avatar: user.avatar,
                status: 'offline',
              });
            }
          } catch (err) {
            console.error('Error updating status on disconnect:', err.message);
          }
        }
      }

      if (currentRoomId && currentUserId) {
        socket.to(currentRoomId).emit('user_stopped_typing', { roomId: currentRoomId, userId: currentUserId });
      }
    });
  });
};
