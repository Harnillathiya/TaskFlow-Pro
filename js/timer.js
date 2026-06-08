/* =====================================================
   timer.js — Pomodoro Timer
   TaskFlow Pro
   ===================================================== */

window.PomodoroTimer = {
  state: {
    mode: 'work',
    timeLeft: 25 * 60,
    totalTime: 25 * 60,
    isRunning: false,
    intervalId: null,
    linkedTaskId: null
  },

  CIRCLE_LENGTH: 2 * Math.PI * 100, // ≈ 628.32

  init() {
    // Load settings from store
    const settings = window.Store.getState().timerSettings;
    this.state.timeLeft = settings.work * 60;
    this.state.totalTime = settings.work * 60;

    // Bind start/pause/reset
    const startBtn = document.getElementById('timer-start');
    const pauseBtn = document.getElementById('timer-pause');
    const resetBtn = document.getElementById('timer-reset');

    if (startBtn) startBtn.addEventListener('click', () => this.start());
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.pause());
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());

    // Mode tabs
    const tabs = document.querySelectorAll('.timer-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.getAttribute('data-mode');
        if (mode) this.switchMode(mode);
      });
    });

    // Settings inputs
    const settingWork = document.getElementById('setting-work');
    const settingShort = document.getElementById('setting-short');
    const settingLong = document.getElementById('setting-long');
    const settingAuto = document.getElementById('setting-auto');

    if (settingWork) {
      settingWork.value = settings.work;
      settingWork.addEventListener('change', () => this.handleSettingsChange());
    }
    if (settingShort) {
      settingShort.value = settings.shortBreak;
      settingShort.addEventListener('change', () => this.handleSettingsChange());
    }
    if (settingLong) {
      settingLong.value = settings.longBreak;
      settingLong.addEventListener('change', () => this.handleSettingsChange());
    }
    if (settingAuto) {
      settingAuto.checked = settings.autoStart;
      settingAuto.addEventListener('change', () => this.handleSettingsChange());
    }

    // Task select
    const taskSelect = document.getElementById('timer-task-select');
    if (taskSelect) {
      taskSelect.addEventListener('change', () => {
        this.state.linkedTaskId = taskSelect.value || null;
      });
    }

    this.populateTaskSelect();
    this.updateDisplay();
    this.updateSessionDots();
  },

  start() {
    if (this.state.isRunning) return;
    this.state.isRunning = true;

    const startBtn = document.getElementById('timer-start');
    const pauseBtn = document.getElementById('timer-pause');
    if (startBtn) startBtn.classList.add('hidden');
    if (pauseBtn) pauseBtn.classList.remove('hidden');

    // Add active class to timer card
    const card = document.querySelector('.timer-card');
    if (card) card.classList.add('active');

    this.state.intervalId = setInterval(() => this.tick(), 1000);
  },

  pause() {
    if (!this.state.isRunning) return;
    this.state.isRunning = false;

    clearInterval(this.state.intervalId);
    this.state.intervalId = null;

    const startBtn = document.getElementById('timer-start');
    const pauseBtn = document.getElementById('timer-pause');
    if (startBtn) startBtn.classList.remove('hidden');
    if (pauseBtn) pauseBtn.classList.add('hidden');
  },

  reset() {
    this.pause();

    const settings = window.Store.getState().timerSettings;
    let duration;
    switch (this.state.mode) {
      case 'short-break': duration = settings.shortBreak; break;
      case 'long-break': duration = settings.longBreak; break;
      default: duration = settings.work; break;
    }

    this.state.timeLeft = duration * 60;
    this.state.totalTime = duration * 60;
    this.updateDisplay();

    // Remove active class
    const card = document.querySelector('.timer-card');
    if (card) card.classList.remove('active');
  },

  tick() {
    this.state.timeLeft--;
    this.updateDisplay();

    if (this.state.timeLeft <= 0) {
      this.complete();
    }
  },

  complete() {
    this.pause();
    this.playBeep();

    if (this.state.mode === 'work') {
      // Log session
      const today = new Date().toISOString().split('T')[0];
      window.Store.addSession(today);

      // Update linked task pomodoro count
      if (this.state.linkedTaskId) {
        const task = window.Store.getTask(this.state.linkedTaskId);
        if (task) {
          window.Store.updateTask(this.state.linkedTaskId, {
            pomodoroCount: (task.pomodoroCount || 0) + 1
          });
        }
      }

      this.updateSessionDots();

      if (window.App && window.App.showToast) {
        window.App.showToast('🍅 Focus session complete! Great work!', 'success');
      }

      // Auto-start break
      const settings = window.Store.getState().timerSettings;
      if (settings.autoStart) {
        const sessionsToday = window.Store.getSessions();
        // Every 4 sessions → long break
        const nextMode = (sessionsToday % 4 === 0) ? 'long-break' : 'short-break';
        this.switchMode(nextMode);
        setTimeout(() => this.start(), 500);
        return;
      }
    } else {
      // Break finished
      if (window.App && window.App.showToast) {
        window.App.showToast('Break over! Ready to focus?', 'info');
      }

      const settings = window.Store.getState().timerSettings;
      if (settings.autoStart) {
        this.switchMode('work');
        setTimeout(() => this.start(), 500);
        return;
      }
    }

    // Remove active class
    const card = document.querySelector('.timer-card');
    if (card) card.classList.remove('active');
  },

  switchMode(mode) {
    if (this.state.isRunning) this.pause();

    this.state.mode = mode;

    const settings = window.Store.getState().timerSettings;
    let duration;
    switch (mode) {
      case 'short-break': duration = settings.shortBreak; break;
      case 'long-break': duration = settings.longBreak; break;
      default: duration = settings.work; break;
    }

    this.state.timeLeft = duration * 60;
    this.state.totalTime = duration * 60;

    // Update tabs
    const tabs = document.querySelectorAll('.timer-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });

    this.updateDisplay();

    // Remove active class
    const card = document.querySelector('.timer-card');
    if (card) card.classList.remove('active');
  },

  updateDisplay() {
    const mins = Math.floor(this.state.timeLeft / 60);
    const secs = this.state.timeLeft % 60;

    const minsEl = document.getElementById('timer-minutes');
    const secsEl = document.getElementById('timer-seconds');

    if (minsEl) minsEl.textContent = String(mins).padStart(2, '0');
    if (secsEl) secsEl.textContent = String(secs).padStart(2, '0');

    // Update progress ring
    const progress = this.state.totalTime > 0
      ? (this.state.totalTime - this.state.timeLeft) / this.state.totalTime
      : 0;
    this.updateRing(progress);

    // Update page title when running
    if (this.state.isRunning) {
      document.title = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} — TaskFlow Pro`;
    } else {
      document.title = 'TaskFlow Pro — Task Manager & Productivity';
    }
  },

  updateRing(progress) {
    const circle = document.getElementById('timer-circle');
    if (!circle) return;

    const offset = this.CIRCLE_LENGTH * (1 - progress);
    circle.style.strokeDasharray = this.CIRCLE_LENGTH;
    circle.style.strokeDashoffset = offset;
  },

  playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);

      // Second beep
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.6);
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.6);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.1);
      osc2.start(ctx.currentTime + 0.6);
      osc2.stop(ctx.currentTime + 1.1);

      // Cleanup
      setTimeout(() => ctx.close(), 2000);
    } catch (e) {
      console.warn('PomodoroTimer: Could not play beep.', e);
    }
  },

  populateTaskSelect() {
    const select = document.getElementById('timer-task-select');
    if (!select) return;

    const currentVal = select.value;

    // Keep first option
    while (select.options.length > 1) {
      select.remove(1);
    }

    const tasks = window.Store.getTasks().filter(t => t.status !== 'done');
    tasks.forEach(task => {
      const opt = document.createElement('option');
      opt.value = task.id;
      opt.textContent = task.title;
      select.appendChild(opt);
    });

    // Restore selection
    if (currentVal) {
      select.value = currentVal;
      this.state.linkedTaskId = select.value || null;
    }
  },

  updateSessionDots() {
    const dotsContainer = document.getElementById('session-dots');
    const countEl = document.getElementById('session-count');
    const count = window.Store.getSessions();

    if (countEl) countEl.textContent = count;

    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      const maxDots = Math.min(count, 12);
      for (let i = 0; i < maxDots; i++) {
        const dot = document.createElement('span');
        dot.className = 'session-dot filled';
        dotsContainer.appendChild(dot);
      }
      if (count > 12) {
        const more = document.createElement('span');
        more.className = 'session-dot-more';
        more.textContent = `+${count - 12}`;
        dotsContainer.appendChild(more);
      }
    }
  },

  handleSettingsChange() {
    const work = parseInt(document.getElementById('setting-work')?.value) || 25;
    const shortBreak = parseInt(document.getElementById('setting-short')?.value) || 5;
    const longBreak = parseInt(document.getElementById('setting-long')?.value) || 15;
    const autoStart = document.getElementById('setting-auto')?.checked || false;

    const settings = { work, shortBreak, longBreak, autoStart };
    window.Store.getState().timerSettings = settings;
    window.Store.save();

    // Reset timer if not running
    if (!this.state.isRunning) {
      this.reset();
    }
  }
};
