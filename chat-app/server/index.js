import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { configureSockets } from './sockets/sockets.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import Room from './models/Room.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);

// Socket.io configuration
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for dev simplicity
    methods: ['GET', 'POST'],
  },
});

// Middlewares
app.use(cors());
app.use(express.json());

// REST APIs
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Configure Socket.io connection handlers
configureSockets(io);

// Seed Default Rooms/Channels
const seedRooms = async () => {
  try {
    const defaultRooms = [
      { name: 'general', description: 'General discussion and chat.' },
      { name: 'gaming', description: 'Find players, share screenshots, talk games!' },
      { name: 'coding', description: 'Talk syntax, review code, share logic.' },
      { name: 'random', description: 'Unstructured, off-topic memes & fun.' },
    ];

    for (const r of defaultRooms) {
      const exists = await Room.findOne({ name: r.name });
      if (!exists) {
        await Room.create(r);
        console.log(`Seeded default room: #${r.name}`);
      }
    }
  } catch (err) {
    console.error('Error seeding default rooms:', err.message);
  }
};

// Start Server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await seedRooms();
});
