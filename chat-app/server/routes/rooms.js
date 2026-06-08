import express from 'express';
import Room from '../models/Room.js';
import Message from '../models/Message.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const rooms = await Room.find({});
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Private
router.post('/', protect, async (req, res) => {
  const { name, description } = req.body;

  try {
    const roomExists = await Room.findOne({ name });

    if (roomExists) {
      return res.status(400).json({ message: 'Room/Channel already exists' });
    }

    const room = await Room.create({
      name,
      description,
      members: [req.user._id],
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get messages for a room
// @route   GET /api/rooms/:roomId/messages
// @access  Private
router.get('/:roomId/messages', protect, async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.roomId })
      .populate('sender', 'username avatar status')
      .sort({ createdAt: 1 })
      .limit(100); // load last 100 messages

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
