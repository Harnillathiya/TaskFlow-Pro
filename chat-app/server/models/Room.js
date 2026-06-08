import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a room name'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [2, 'Room name must be at least 2 characters'],
      match: [/^[a-z0-9-_]+$/, 'Room name can only contain lowercase letters, numbers, hyphens, and underscores'],
    },
    description: {
      type: String,
      default: '',
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Room = mongoose.model('Room', roomSchema);
export default Room;
