import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Hash, 
  Send, 
  Plus, 
  Settings, 
  LogOut, 
  Users, 
  MessageSquare, 
  Menu, 
  X, 
  User as UserIcon,
  Sparkles,
  Info
} from 'lucide-react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Global Socket Instance
let socket;

const AVATARS = ['💬', '👾', '🚀', '🐱', '🦊', '🐼', '🐨', '🤖', '🦊', '🦁'];

function App() {
  // Navigation & Authentication
  const [view, setView] = useState('login'); // 'login' | 'register' | 'chat'
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('talksphere_token') || '');

  // Form Inputs
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Chat States
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [allUsers, setAllUsers] = useState([]); // Maps all registered users to their statuses
  const [typingUsers, setTypingUsers] = useState({}); // { roomId: { username1, username2 } }
  
  // UI Control States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewRoomModalOpen, setIsNewRoomModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', description: '' });
  const [profileForm, setProfileForm] = useState({ username: '', avatar: '', statusText: '' });

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto Scroll Message Feed
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load User Session on App Start
  useEffect(() => {
    if (token) {
      loadUserProfile();
    }
  }, [token]);

  // Handle Socket Connections when user logs in / out
  useEffect(() => {
    if (currentUser && token) {
      // Initialize Socket connection
      socket = io(API_URL);

      socket.on('connect', () => {
        console.log('Connected to socket server');
        socket.emit('user_connected', currentUser._id);
      });

      // Presence Update
      socket.on('user_presence', (data) => {
        setAllUsers((prevUsers) => {
          const index = prevUsers.findIndex((u) => u._id === data.userId);
          if (index !== -1) {
            const updated = [...prevUsers];
            updated[index] = { ...updated[index], status: data.status };
            return updated;
          } else {
            // If new user registered and went online, add them
            return [...prevUsers, { _id: data.userId, username: data.username, avatar: data.avatar, status: data.status }];
          }
        });
      });

      // Typing indicators
      socket.on('user_typing', ({ roomId, username }) => {
        setTypingUsers((prev) => {
          const currentTyping = prev[roomId] ? new Set(prev[roomId]) : new Set();
          currentTyping.add(username);
          return { ...prev, [roomId]: currentTyping };
        });
      });

      socket.on('user_stopped_typing', ({ roomId, userId }) => {
        setTypingUsers((prev) => {
          if (!prev[roomId]) return prev;
          const currentTyping = new Set(prev[roomId]);
          
          // Look up user's username
          const user = allUsers.find(u => u._id === userId);
          if (user) {
            currentTyping.delete(user.username);
          }
          return { ...prev, [roomId]: currentTyping };
        });
      });

      // Listen for new messages
      socket.on('new_message', (msg) => {
        if (activeRoom && msg.room === activeRoom._id) {
          setMessages((prev) => [...prev, msg]);
        }
      });

      // Fetch Channels / Rooms
      fetchRooms();
      // Fetch User Statuses
      fetchUsers();

      setView('chat');
    } else {
      if (socket) {
        socket.disconnect();
      }
    }

    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('user_presence');
        socket.off('user_typing');
        socket.off('user_stopped_typing');
        socket.off('new_message');
      }
    };
  }, [currentUser, activeRoom, allUsers]);

  // Load Messages on active room change
  useEffect(() => {
    if (activeRoom && token) {
      fetchMessages(activeRoom._id);
      
      // Join Room socket room
      socket.emit('join_room', { roomId: activeRoom._id, userId: currentUser._id });
    }
  }, [activeRoom]);

  // Auth Operations
  const loadUserProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data);
        setProfileForm({ username: data.username, avatar: data.avatar, statusText: data.statusText || '' });
      } else {
        // Token expired / invalid
        logout();
      }
    } catch (err) {
      console.error(err);
      logout();
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = view === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = view === 'login' 
      ? { email: authForm.email, password: authForm.password }
      : { username: authForm.username, email: authForm.email, password: authForm.password, avatar: selectedAvatar };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('talksphere_token', data.token);
        setToken(data.token);
        setCurrentUser(data);
        setProfileForm({ username: data.username, avatar: data.avatar, statusText: data.statusText || '' });
        setAuthForm({ username: '', email: '', password: '' });
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Connection to backend failed. Make sure your server is running.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('talksphere_token');
    setToken('');
    setCurrentUser(null);
    setView('login');
    setActiveRoom(null);
    setMessages([]);
    if (socket) socket.disconnect();
  };

  // REST API Methods
  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRooms(data);
        if (data.length > 0 && !activeRoom) {
          setActiveRoom(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    // For simplicity, we can load users by requesting them or pulling online presences.
    // Let's call our profile get endpoints or get user mock logs. Since there's no bulk user lookup REST endpoint in our spec,
    // let's fetch all users from a custom auth REST path or simply initialize them dynamically.
    // Wait, let's create a route for fetching all users. But since we don't have it defined in auth routes, let's add one quickly or populate dynamically.
    // Actually, we can fetch all users by calling GET /api/auth/me or adding a query route. Let's add a GET /api/auth/users endpoint inside the backend router shortly, or we can just fetch users using a REST query.
    // Let's create an endpoint in Express. Yes! I will modify routes/auth.js to add GET /api/auth/users to get all users. This is important for showing the direct message list!
  };

  const fetchMessages = async (roomId) => {
    try {
      const res = await fetch(`${API_URL}/api/rooms/${roomId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRoomSubmit = async (e) => {
    e.preventDefault();
    if (!newRoom.name.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newRoom.name, description: newRoom.description })
      });
      const data = await res.json();

      if (res.ok) {
        setRooms((prev) => [...prev, data]);
        setActiveRoom(data);
        setIsNewRoomModalOpen(false);
        setNewRoom({ name: '', description: '' });
      } else {
        alert(data.message || 'Failed to create room');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();

      if (res.ok) {
        setCurrentUser(data);
        setIsProfileModalOpen(false);
        // Refresh users
        if (socket) {
          socket.emit('user_connected', data._id); // Update online avatar/username
        }
      } else {
        alert(data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Chat Messaging Events
  const handleSendMessageSubmit = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeRoom) return;

    // Emit send message event over WS
    socket.emit('send_message', {
      roomId: activeRoom._id,
      senderId: currentUser._id,
      content: messageText.trim()
    });

    setMessageText('');
    
    // Stop typing
    socket.emit('stop_typing', { roomId: activeRoom._id });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // Keyboard typing handlers
  const handleMessageInputChange = (e) => {
    setMessageText(e.target.value);

    if (activeRoom && currentUser) {
      // Emit typing status
      socket.emit('typing', { roomId: activeRoom._id, username: currentUser.username });

      // Throttle/Clear timeout to stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { roomId: activeRoom._id });
      }, 1500);
    }
  };

  // Setup auxiliary endpoints fetch on login
  const fetchAllInitialData = () => {
    fetchRooms();
    // Fetch users (if we add the users list endpoint)
    fetchUsersList();
  };

  const fetchUsersList = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAllUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllInitialData();
    }
  }, [token]);

  return (
    <div className="app-container">
      {/* AUTH VIEWS */}
      {view !== 'chat' && (
        <div className="auth-wrapper animate-scale">
          <div className="auth-card">
            <span className="auth-logo">TalkSphere</span>
            <p className="auth-subtitle">
              {view === 'login' ? 'Welcome back! Sign in to chat.' : 'Create your account and jump in.'}
            </p>

            {error && <div className="error-banner">{error}</div>}

            <form onSubmit={handleAuthSubmit}>
              {view === 'register' && (
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input 
                    type="text" 
                    className="form-input"
                    required
                    value={authForm.username}
                    onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="form-input"
                  required
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input"
                  required
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                />
              </div>

              {view === 'register' && (
                <div className="form-group">
                  <label className="form-label">Select Profile Icon</label>
                  <div className="avatar-selector">
                    {AVATARS.map((avatar) => (
                      <div 
                        key={avatar}
                        className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                        onClick={() => setSelectedAvatar(avatar)}
                      >
                        {avatar}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Processing...' : view === 'login' ? 'Login' : 'Sign Up'}
              </button>
            </form>

            <div className="auth-footer">
              {view === 'login' ? (
                <span>
                  Don't have an account?{' '}
                  <span className="auth-link" onClick={() => setView('register')}>Sign Up</span>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <span className="auth-link" onClick={() => setView('login')}>Login</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHAT MAIN APP VIEW */}
      {view === 'chat' && currentUser && (
        <div className="chat-layout animate-fade">
          {/* Sidebar overlay for mobile toggle */}
          <div 
            className={`sidebar-toggle-overlay ${isSidebarOpen ? 'open' : ''}`}
            onClick={() => setIsSidebarOpen(false)}
          ></div>

          {/* Sidebar */}
          <div className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
              <span className="sidebar-logo">TalkSphere</span>
              <button className="sidebar-btn" onClick={() => setIsNewRoomModalOpen(true)}>
                <Plus size={18} />
              </button>
            </div>

            <div className="sidebar-scrollable">
              {/* Rooms/Channels section */}
              <div>
                <h3 className="section-title">Rooms & Channels</h3>
                <div className="rooms-list">
                  {rooms.map((room) => (
                    <div 
                      key={room._id} 
                      className={`room-item ${activeRoom?._id === room._id ? 'active' : ''}`}
                      onClick={() => {
                        setActiveRoom(room);
                        setIsSidebarOpen(false);
                      }}
                    >
                      <div className="room-name-wrapper">
                        <span className="room-hash">#</span>
                        <span>{room.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connected users list */}
              <div>
                <h3 className="section-title">Members ({allUsers.length})</h3>
                <div className="users-list">
                  {allUsers.map((user) => (
                    <div key={user._id} className="user-item">
                      <div className="user-avatar-wrapper">
                        {user.avatar}
                        <div className={`status-dot ${user.status === 'online' ? 'online' : 'offline'}`}></div>
                      </div>
                      <div className="user-info-text">
                        <span className="user-username">{user.username} {user._id === currentUser._id && '(You)'}</span>
                        <span className="user-status-text">{user.statusText || (user.status === 'online' ? 'active' : 'offline')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* User footer profile card */}
            <div className="sidebar-footer">
              <div className="profile-summary" onClick={() => setIsProfileModalOpen(true)}>
                <div className="user-avatar-wrapper">
                  {currentUser.avatar}
                  <div className="status-dot online"></div>
                </div>
                <div className="user-info-text">
                  <span className="user-username">{currentUser.username}</span>
                  <span className="user-status-text">Status: {currentUser.statusText || 'Available'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="sidebar-btn" onClick={() => setIsProfileModalOpen(true)}>
                  <Settings size={16} />
                </button>
                <button className="sidebar-btn" onClick={logout}>
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Main Chat Feed */}
          <div className="chat-pane">
            {activeRoom ? (
              <>
                {/* Header */}
                <div className="chat-header">
                  <div className="chat-header-title">
                    <span className="chat-header-name">
                      <Hash size={20} className="room-hash" />
                      {activeRoom.name}
                    </span>
                    <span className="chat-header-desc">{activeRoom.description || 'Welcome to this room!'}</span>
                  </div>
                  {/* Mobile menu open toggler */}
                  <button className="sidebar-btn" style={{ display: 'none' }} id="mobile-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
                    <Menu size={18} />
                  </button>
                </div>

                {/* Message Streams */}
                <div className="messages-container">
                  {messages.length === 0 ? (
                    <div className="empty-chat-state">
                      <MessageSquare className="empty-chat-icon" />
                      <h3>No messages in #{activeRoom.name} yet</h3>
                      <p>Start the conversation by typing a message below!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOutgoing = msg.sender?._id === currentUser._id;
                      const sender = msg.sender || { username: 'Deleted User', avatar: '💬' };
                      return (
                        <div key={msg._id} className={`message-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                          <div className="message-avatar">
                            {sender.avatar}
                          </div>
                          <div className="message-content-group">
                            <div className="message-info" style={{ justifyContent: isOutgoing ? 'flex-end' : 'flex-start' }}>
                              <span className="username">{sender.username}</span>
                              <span className="time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="message-bubble">
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Typing display */}
                <div className="typing-status-bar">
                  {typingUsers[activeRoom._id] && Array.from(typingUsers[activeRoom._id]).filter(u => u !== currentUser.username).length > 0 && (
                    <>
                      <Sparkles size={14} className="animate-pulse" />
                      <span>
                        {Array.from(typingUsers[activeRoom._id]).filter(u => u !== currentUser.username).join(', ')} is typing...
                      </span>
                    </>
                  )}
                </div>

                {/* Form Input */}
                <div className="chat-input-area">
                  <form onSubmit={handleSendMessageSubmit} className="chat-input-form">
                    <input 
                      type="text" 
                      className="chat-input"
                      placeholder={`Send message to #${activeRoom.name}...`}
                      value={messageText}
                      onChange={handleMessageInputChange}
                    />
                    <button type="submit" className="chat-send-btn" disabled={!messageText.trim()}>
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="empty-chat-state">
                <MessageSquare size={64} className="empty-chat-icon" style={{ fontSize: '4rem', marginBottom: '16px' }} />
                <h3>Welcome to TalkSphere!</h3>
                <p>Select a room/channel from the sidebar, or create a new one to begin messaging.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE NEW ROOM MODAL */}
      {isNewRoomModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewRoomModalOpen(false)}>
          <div className="modal-content animate-scale" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Create New Room</h2>
            <form onSubmit={handleCreateRoomSubmit}>
              <div className="form-group">
                <label className="form-label">Room Name</label>
                <input 
                  type="text" 
                  className="form-input"
                  required
                  placeholder="e.g. memes"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                />
                <span className="user-status-text" style={{ display: 'block', marginTop: '6px' }}>
                  Only lowercase letters, numbers, hyphens, and underscores allowed.
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="What is this channel about?"
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                />
              </div>
              <div className="modal-buttons">
                <button type="button" className="btn-secondary" onClick={() => setIsNewRoomModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Create Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProfileModalOpen(false)}>
          <div className="modal-content animate-scale" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Customize Profile</h2>
            <form onSubmit={handleUpdateProfileSubmit}>
              <div className="profile-modal-avatar">
                {profileForm.avatar}
              </div>

              <div className="form-group">
                <label className="form-label">Select Avatar Icon</label>
                <div className="avatar-selector">
                  {AVATARS.map((avatar) => (
                    <div 
                      key={avatar}
                      className={`avatar-option ${profileForm.avatar === avatar ? 'selected' : ''}`}
                      onClick={() => setProfileForm({ ...profileForm, avatar })}
                    >
                      {avatar}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input 
                  type="text" 
                  className="form-input"
                  required
                  value={profileForm.username}
                  onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Custom Status</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="What's your focus today?"
                  value={profileForm.statusText}
                  onChange={(e) => setProfileForm({ ...profileForm, statusText: e.target.value })}
                />
              </div>

              <div className="modal-buttons">
                <button type="button" className="btn-secondary" onClick={() => setIsProfileModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
