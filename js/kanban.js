/* =====================================================
   kanban.js — Kanban Board & Drag-Drop
   TaskFlow Pro
   ===================================================== */

window.KanbanBoard = {
  _touchDragData: null,
  _touchGhost: null,

  CATEGORY_ICONS: {
    work: '💼',
    personal: '🏠',
    health: '💪',
    learning: '📚',
    finance: '💰'
  },

  PRIORITY_COLORS: {
    urgent: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e'
  },

  init() {
    this.render();
    this._initDropZones();
  },

  render(tasks) {
    const allTasks = tasks || window.Store.getTasks();
    const columns = {
      'todo': document.getElementById('tasks-todo'),
      'in-progress': document.getElementById('tasks-in-progress'),
      'done': document.getElementById('tasks-done')
    };

    // Clear columns
    Object.values(columns).forEach(col => { if (col) col.innerHTML = ''; });

    const grouped = { 'todo': [], 'in-progress': [], 'done': [] };
    allTasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Sort: urgent/high first, then by due date
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    Object.keys(grouped).forEach(status => {
      grouped[status].sort((a, b) => {
        const pDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        if (pDiff !== 0) return pDiff;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
    });

    Object.keys(columns).forEach(status => {
      const col = columns[status];
      if (!col) return;

      if (grouped[status].length === 0) {
        col.innerHTML = this.getEmptyStateHTML(status);
      } else {
        grouped[status].forEach(task => {
          const card = this.createTaskCard(task);
          col.appendChild(card);
        });
      }
    });

    this.updateCounts(grouped);
  },

  createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('data-id', task.id);
    card.setAttribute('draggable', 'true');
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', task.title);

    // Priority border
    card.style.borderLeft = `3px solid ${this.PRIORITY_COLORS[task.priority] || this.PRIORITY_COLORS.medium}`;

    // Due date check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let dueDateHTML = '';
    let isOverdue = false;

    if (task.dueDate) {
      const due = new Date(task.dueDate + 'T00:00:00');
      isOverdue = due < today && task.status !== 'done';
      const isToday = due.getTime() === today.getTime();
      const formatted = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      let dueCls = 'task-due';
      if (isOverdue) dueCls += ' overdue';
      else if (isToday) dueCls += ' due-today';

      dueDateHTML = `
        <span class="${dueCls}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          ${formatted}${isOverdue ? ' · Overdue' : ''}${isToday ? ' · Today' : ''}
        </span>`;
    }

    // Tags
    let tagsHTML = '';
    if (task.tags && task.tags.length > 0) {
      tagsHTML = '<div class="task-tags">' +
        task.tags.slice(0, 3).map(tag => `<span class="task-tag">${this._escapeHTML(tag)}</span>`).join('') +
        (task.tags.length > 3 ? `<span class="task-tag task-tag-more">+${task.tags.length - 3}</span>` : '') +
        '</div>';
    }

    // Description (truncated)
    const desc = task.description
      ? `<p class="task-desc">${this._escapeHTML(task.description.length > 80 ? task.description.slice(0, 80) + '…' : task.description)}</p>`
      : '';

    // Pomodoro count
    const pomodoroHTML = task.pomodoroCount > 0
      ? `<span class="task-pomodoro" title="${task.pomodoroCount} pomodoro session(s)">🍅 ${task.pomodoroCount}</span>`
      : '';

    card.innerHTML = `
      <div class="task-card-header">
        <span class="task-category-badge category-${task.category}">${this.CATEGORY_ICONS[task.category] || '📋'} ${task.category}</span>
        <span class="task-priority-dot priority-${task.priority}" title="${task.priority} priority"></span>
      </div>
      <h3 class="task-title">${this._escapeHTML(task.title)}</h3>
      ${desc}
      <div class="task-card-footer">
        ${dueDateHTML}
        ${pomodoroHTML}
      </div>
      ${tagsHTML}
    `;

    // Click to edit
    card.addEventListener('click', (e) => {
      // Don't trigger on drag
      if (card.classList.contains('dragging')) return;
      window.TaskManager.openModal(task.id);
    });

    // HTML5 Drag events
    card.addEventListener('dragstart', (e) => this.handleDragStart(e, task.id));
    card.addEventListener('dragend', (e) => this.handleDragEnd(e));

    // Touch events for mobile drag-drop
    card.addEventListener('touchstart', (e) => this._handleTouchStart(e, task.id), { passive: false });
    card.addEventListener('touchmove', (e) => this._handleTouchMove(e), { passive: false });
    card.addEventListener('touchend', (e) => this._handleTouchEnd(e), { passive: false });

    return card;
  },

  /* ---------- HTML5 Drag & Drop ---------- */

  handleDragStart(e, taskId) {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => {
      e.target.classList.add('dragging');
    });
  },

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
  },

  _initDropZones() {
    const columnBodies = document.querySelectorAll('.column-body');
    columnBodies.forEach(body => {
      body.addEventListener('dragover', (e) => this.handleDragOver(e));
      body.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      body.addEventListener('drop', (e) => this.handleDrop(e));
    });
  },

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const col = e.currentTarget;
    if (col) col.classList.add('drag-over');
  },

  handleDragLeave(e) {
    const col = e.currentTarget;
    if (col) col.classList.remove('drag-over');
  },

  handleDrop(e) {
    e.preventDefault();
    const col = e.currentTarget;
    if (col) col.classList.remove('drag-over');

    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const column = col.closest('.kanban-column');
    if (!column) return;
    const newStatus = column.getAttribute('data-status');
    if (!newStatus) return;

    const task = window.Store.getTask(taskId);
    if (task && task.status !== newStatus) {
      window.Store.updateTask(taskId, { status: newStatus });

      const statusLabels = { 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done' };
      if (window.App && window.App.showToast) {
        window.App.showToast(`Moved to ${statusLabels[newStatus] || newStatus}`, 'info');
      }
    }
  },

  /* ---------- Touch Drag & Drop (Mobile) ---------- */

  _handleTouchStart(e, taskId) {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const card = e.currentTarget;

    this._touchDragData = {
      taskId: taskId,
      startX: touch.clientX,
      startY: touch.clientY,
      isDragging: false,
      sourceCard: card,
      longPressTimer: setTimeout(() => {
        this._touchDragData.isDragging = true;
        card.classList.add('dragging');

        // Create ghost
        this._touchGhost = card.cloneNode(true);
        this._touchGhost.classList.add('drag-ghost');
        this._touchGhost.style.cssText = `
          position: fixed;
          pointer-events: none;
          z-index: 10000;
          opacity: 0.85;
          width: ${card.offsetWidth}px;
          transform: rotate(3deg) scale(1.05);
          left: ${touch.clientX - card.offsetWidth / 2}px;
          top: ${touch.clientY - 30}px;
        `;
        document.body.appendChild(this._touchGhost);
      }, 300)
    };
  },

  _handleTouchMove(e) {
    if (!this._touchDragData) return;

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - this._touchDragData.startX);
    const dy = Math.abs(touch.clientY - this._touchDragData.startY);

    // Cancel long press if moved too much before it fires
    if (!this._touchDragData.isDragging && (dx > 10 || dy > 10)) {
      clearTimeout(this._touchDragData.longPressTimer);
      this._touchDragData = null;
      return;
    }

    if (!this._touchDragData.isDragging) return;

    e.preventDefault();

    // Move ghost
    if (this._touchGhost) {
      this._touchGhost.style.left = (touch.clientX - this._touchGhost.offsetWidth / 2) + 'px';
      this._touchGhost.style.top = (touch.clientY - 30) + 'px';
    }

    // Highlight drop target
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    document.querySelectorAll('.column-body').forEach(b => b.classList.remove('drag-over'));
    if (target) {
      const colBody = target.closest('.column-body');
      if (colBody) colBody.classList.add('drag-over');
    }
  },

  _handleTouchEnd(e) {
    if (!this._touchDragData) return;

    clearTimeout(this._touchDragData.longPressTimer);

    if (this._touchDragData.isDragging) {
      const touch = e.changedTouches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);

      if (target) {
        const colBody = target.closest('.column-body');
        if (colBody) {
          const column = colBody.closest('.kanban-column');
          if (column) {
            const newStatus = column.getAttribute('data-status');
            const task = window.Store.getTask(this._touchDragData.taskId);
            if (task && task.status !== newStatus) {
              window.Store.updateTask(this._touchDragData.taskId, { status: newStatus });
              const statusLabels = { 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done' };
              if (window.App && window.App.showToast) {
                window.App.showToast(`Moved to ${statusLabels[newStatus] || newStatus}`, 'info');
              }
            }
          }
        }
      }

      this._touchDragData.sourceCard.classList.remove('dragging');
      document.querySelectorAll('.column-body').forEach(b => b.classList.remove('drag-over'));

      if (this._touchGhost) {
        this._touchGhost.remove();
        this._touchGhost = null;
      }
    } else {
      // It was a tap, not a drag — open modal
      window.TaskManager.openModal(this._touchDragData.taskId);
    }

    this._touchDragData = null;
  },

  /* ---------- Helpers ---------- */

  updateCounts(grouped) {
    if (!grouped) {
      const tasks = window.Store.getTasks();
      grouped = { 'todo': [], 'in-progress': [], 'done': [] };
      tasks.forEach(t => {
        if (grouped[t.status]) grouped[t.status].push(t);
      });
    }

    const counts = {
      'count-todo': grouped['todo'].length,
      'count-in-progress': grouped['in-progress'].length,
      'count-done': grouped['done'].length
    };

    Object.keys(counts).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = counts[id];
    });
  },

  getEmptyStateHTML(status) {
    const messages = {
      'todo': { icon: '📋', text: 'No tasks yet', sub: 'Click "New Task" to get started' },
      'in-progress': { icon: '🚀', text: 'Nothing in progress', sub: 'Drag tasks here to start working' },
      'done': { icon: '🎉', text: 'No completed tasks', sub: 'Complete tasks to see them here' }
    };
    const msg = messages[status] || messages['todo'];
    return `
      <div class="empty-column">
        <span class="empty-icon">${msg.icon}</span>
        <p class="empty-text">${msg.text}</p>
        <p class="empty-sub">${msg.sub}</p>
      </div>
    `;
  },

  _escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
