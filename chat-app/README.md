# 💬 TalkSphere — Real-time Chat Application

A premium, full-featured **Real-time Chat App** built with a **Node.js/Express & Socket.io** backend, **MongoDB** database, and a **Vite + React** frontend. It features instant group messaging, active user presence tracking, and typing indicators.

---

## Features

*   **Real-time Group Chat**: Instant bi-directional messaging powered by Socket.io.
*   **Persistent Messaging**: Message history loaded automatically from MongoDB on joining a channel.
*   **Custom Channels/Rooms**: Users can create new chat rooms with descriptions (e.g. `#gaming`, `#coding`).
*   **User Presence Tracking**: Live indicators showing online/offline status updates dynamically.
*   **Typing Indicators**: Real-time feedback showing which channel members are currently typing.
*   **Profile Customization**: Users can update their display name, status messages, and select custom emoji avatars.
*   **JWT Security**: User registration and login verified with hashed passwords and secure JSON Web Tokens.

---

## Tech Stack

*   **Backend**: Node.js, Express, Socket.io, MongoDB, Mongoose, JWT (jsonwebtoken), Bcryptjs.
*   **Frontend**: React (Vite), Socket.io Client, Lucide React (Icons), HTML5, Vanilla CSS.

---

## Project Structure

```text
chat-app/
├── server/
│   ├── config/             # DB Connection Config
│   ├── middleware/         # Auth Route Protections
│   ├── models/             # User, Room, Message Schemas
│   ├── routes/             # Authentication & Channel API Routes
│   ├── sockets/            # Socket.io Event Handling
│   ├── index.js            # Server entry point
│   └── .env                # Config Environment File
└── client/
    ├── src/
    │   ├── App.jsx         # React UI Controller
    │   ├── App.css         # App-specific Layout Styles
    │   ├── index.css       # Global design theme & variables
    │   └── main.jsx        # Bootstrap entry
    └── index.html          # HTML Shell
```

---

## Installation & Setup

### Prerequisites
*   Node.js installed (v18+)
*   MongoDB installed and running locally, or a MongoDB Atlas cloud URI.

### 1. Setup Backend Server
Navigate to the server directory:
```bash
cd chat-app/server
```

Install server dependencies:
```bash
npm install
```

Configure your environment variables in `chat-app/server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/talksphere
JWT_SECRET=talkspheresecret123
```
*(Note: If you are using MongoDB Atlas, replace the `MONGO_URI` with your connection string).*

Start the backend server in development mode:
```bash
npm run dev
```
The server will start on `http://localhost:5000` and automatically seed the default rooms (`#general`, `#gaming`, `#coding`, `#random`).

---

### 2. Setup Frontend Client
Open a new terminal and navigate to the client directory:
```bash
cd chat-app/client
```

Install client dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```
The client dashboard will start running (usually on `http://localhost:5173`). Open the link in multiple browser tabs to test real-time chatting, status updates, and typing alerts side-by-side!
