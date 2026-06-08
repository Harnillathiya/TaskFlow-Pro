/* =====================================================
   store.js — State Management & localStorage
   TaskFlow Pro
   ===================================================== */

window.Store = {
  DATA_KEY: 'taskflow_pro_data',
  DATA_VERSION: 1,
  listeners: [],

  defaultState: {
    tasks: [],
    timerSettings: { work: 25, shortBreak: 5, longBreak: 15, autoStart: false },
    sessions: {},
    streak: { current: 0, lastDate: null },
    completionLog: {},
    version: 1
  },

  state: null,

  /* ---------- Lifecycle ---------- */

  init() {
    try {
      const raw = localStorage.getItem(this.DATA_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge with defaults so new keys are present after upgrades
        this.state = Object.assign({}, this.defaultState, parsed);
        // Ensure nested defaults
        this.state.timerSettings = Object.assign({}, this.defaultState.timerSettings, parsed.timerSettings || {});
        this.state.streak = Object.assign({}, this.defaultState.streak, parsed.streak || {});
        if (!Array.isArray(this.state.tasks)) this.state.tasks = [];
        if (!this.state.sessions) this.state.sessions = {};
        if (!this.state.completionLog) this.state.completionLog = {};
      } else {
        this.state = JSON.parse(JSON.stringify(this.defaultState));
      }
    } catch (e) {
      console.warn('Store: Failed to load from localStorage, using defaults.', e);
      this.state = JSON.parse(JSON.stringify(this.defaultState));
    }
    this.save();
  },

  save() {
    try {
      localStorage.setItem(this.DATA_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Store: Failed to save to localStorage.', e);
    }
  },

  getState() {
    return this.state;
  },

  /* ---------- Task CRUD ---------- */

  _generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  },

  addTask(task) {
    const newTask = Object.assign({
      id: this._generateId(),
      title: '',
      description: '',
      category: 'work',
      priority: 'medium',
      status: 'todo',
      dueDate: null,
      tags: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
      pomodoroCount: 0
    }, task);

    if (!newTask.id) newTask.id = this._generateId();
    this.state.tasks.push(newTask);

    if (newTask.status === 'done' && !newTask.completedAt) {
      newTask.completedAt = new Date().toISOString();
      this.logCompletion(newTask.id, this._todayStr());
      this.updateStreak();
    }

    this.save();
    this.notify();
    return newTask;
  },

  updateTask(id, updates) {
    const idx = this.state.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;

    const oldTask = this.state.tasks[idx];
    const wasNotDone = oldTask.status !== 'done';

    Object.assign(this.state.tasks[idx], updates);

    const updatedTask = this.state.tasks[idx];

    // Track completion transitions
    if (wasNotDone && updatedTask.status === 'done') {
      updatedTask.completedAt = updatedTask.completedAt || new Date().toISOString();
      this.logCompletion(updatedTask.id, this._todayStr());
      this.updateStreak();
    } else if (!wasNotDone && updatedTask.status !== 'done') {
      updatedTask.completedAt = null;
    }

    this.save();
    this.notify();
    return updatedTask;
  },

  deleteTask(id) {
    const idx = this.state.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.state.tasks.splice(idx, 1);
    this.save();
    this.notify();
    return true;
  },

  getTask(id) {
    return this.state.tasks.find(t => t.id === id) || null;
  },

  getTasks(filters) {
    let result = this.state.tasks.slice();
    if (!filters) return result;

    if (filters.status) {
      result = result.filter(t => t.status === filters.status);
    }
    if (filters.category) {
      result = result.filter(t => t.category === filters.category);
    }
    if (filters.priority) {
      result = result.filter(t => t.priority === filters.priority);
    }
    return result;
  },

  /* ---------- Sessions (Pomodoro) ---------- */

  addSession(dateStr) {
    const key = dateStr || this._todayStr();
    this.state.sessions[key] = (this.state.sessions[key] || 0) + 1;
    this.save();
    this.notify();
  },

  getSessions(dateStr) {
    const key = dateStr || this._todayStr();
    return this.state.sessions[key] || 0;
  },

  /* ---------- Streak ---------- */

  updateStreak() {
    const today = this._todayStr();
    const yesterday = this._dateOffset(-1);

    if (this.state.streak.lastDate === today) {
      // Already updated today — nothing to do
      return;
    }

    if (this.state.streak.lastDate === yesterday) {
      this.state.streak.current += 1;
    } else if (this.state.streak.lastDate !== today) {
      this.state.streak.current = 1;
    }
    this.state.streak.lastDate = today;
    this.save();
  },

  /* ---------- Completion Log ---------- */

  logCompletion(taskId, dateStr) {
    const key = dateStr || this._todayStr();
    if (!this.state.completionLog[key]) {
      this.state.completionLog[key] = [];
    }
    if (!this.state.completionLog[key].includes(taskId)) {
      this.state.completionLog[key].push(taskId);
    }
    this.save();
  },

  getCompletionsForWeek() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];
      const count = (this.state.completionLog[key] || []).length;
      result.push({ day: dayName, count: count, date: key });
    }
    return result;
  },

  /* ---------- Pub/Sub ---------- */

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  },

  notify() {
    this.listeners.forEach(fn => {
      try { fn(this.state); } catch (e) { console.error('Store listener error:', e); }
    });
  },

  /* ---------- Import / Export ---------- */

  exportData() {
    try {
      const json = JSON.stringify(this.state, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'taskflow_pro_backup_' + this._todayStr() + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return json;
    } catch (e) {
      console.error('Store: Export failed.', e);
      return null;
    }
  },

  importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.tasks)) {
        throw new Error('Invalid data format: tasks array missing');
      }
      this.state = Object.assign({}, this.defaultState, parsed);
      this.state.timerSettings = Object.assign({}, this.defaultState.timerSettings, parsed.timerSettings || {});
      this.state.streak = Object.assign({}, this.defaultState.streak, parsed.streak || {});
      this.save();
      this.notify();
      return true;
    } catch (e) {
      console.error('Store: Import failed.', e);
      return false;
    }
  },

  /* ---------- Helpers ---------- */

  _todayStr() {
    return new Date().toISOString().split('T')[0];
  },

  _dateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
};
