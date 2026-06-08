/* =====================================================
   tasks.js — Task CRUD Operations & Modal
   TaskFlow Pro
   ===================================================== */

window.TaskManager = {
  _editingTaskId: null,

  init() {
    // Open modal — "New Task" button
    const addBtn = document.getElementById('add-task-btn');
    if (addBtn) addBtn.addEventListener('click', () => this.openModal());

    // Close modal buttons
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());

    const cancelBtn = document.getElementById('modal-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

    // Click overlay to close
    const overlay = document.getElementById('task-modal');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal();
      });
    }

    // Form submit
    const form = document.getElementById('task-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSave(e));
    }

    // Delete button in modal
    const deleteBtn = document.getElementById('modal-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (this._editingTaskId) {
          const task = window.Store.getTask(this._editingTaskId);
          this.showConfirmModal(this._editingTaskId, task ? task.title : 'this task');
        }
      });
    }

    // Confirm modal buttons
    const confirmCancel = document.getElementById('confirm-cancel-btn');
    if (confirmCancel) confirmCancel.addEventListener('click', () => this.closeConfirmModal());

    const confirmDelete = document.getElementById('confirm-delete-btn');
    if (confirmDelete) {
      confirmDelete.addEventListener('click', () => {
        const taskId = confirmDelete.getAttribute('data-task-id');
        if (taskId) {
          window.Store.deleteTask(taskId);
          this.closeConfirmModal();
          this.closeModal();
          if (window.App && window.App.showToast) {
            window.App.showToast('Task deleted successfully', 'success');
          }
        }
      });
    }

    // Confirm modal overlay click
    const confirmOverlay = document.getElementById('confirm-modal');
    if (confirmOverlay) {
      confirmOverlay.addEventListener('click', (e) => {
        if (e.target === confirmOverlay) this.closeConfirmModal();
      });
    }
  },

  openModal(taskId) {
    const modal = document.getElementById('task-modal');
    const title = document.getElementById('modal-title');
    const deleteBtn = document.getElementById('modal-delete-btn');

    if (!modal) return;

    if (taskId) {
      const task = window.Store.getTask(taskId);
      if (!task) return;
      this._editingTaskId = taskId;
      this.populateForm(task);
      if (title) title.textContent = 'Edit Task';
      if (deleteBtn) deleteBtn.classList.remove('hidden');
    } else {
      this._editingTaskId = null;
      this.clearForm();
      if (title) title.textContent = 'New Task';
      if (deleteBtn) deleteBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus the title input
    requestAnimationFrame(() => {
      const titleInput = document.getElementById('task-title');
      if (titleInput) titleInput.focus();
    });

    // Trap focus
    this._trapFocus(modal);
  },

  closeModal() {
    const modal = document.getElementById('task-modal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    this._editingTaskId = null;
    this._removeFocusTrap();
  },

  handleSave(e) {
    e.preventDefault();

    const titleInput = document.getElementById('task-title');
    const titleVal = titleInput ? titleInput.value.trim() : '';

    if (!titleVal) {
      if (titleInput) {
        titleInput.classList.add('input-error');
        titleInput.focus();
        setTimeout(() => titleInput.classList.remove('input-error'), 2000);
      }
      return;
    }

    const data = this.getFormData();

    if (this._editingTaskId) {
      // Update
      window.Store.updateTask(this._editingTaskId, data);
      if (window.App && window.App.showToast) {
        window.App.showToast('Task updated successfully', 'success');
      }
    } else {
      // Create
      window.Store.addTask(data);
      if (window.App && window.App.showToast) {
        window.App.showToast('Task created successfully', 'success');
      }
    }

    this.closeModal();
  },

  handleDelete(taskId) {
    const task = window.Store.getTask(taskId);
    if (task) {
      this.showConfirmModal(taskId, task.title);
    }
  },

  getFormData() {
    const tagsRaw = (document.getElementById('task-tags')?.value || '').trim();
    const tags = tagsRaw
      ? tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0)
      : [];

    return {
      title: (document.getElementById('task-title')?.value || '').trim(),
      description: (document.getElementById('task-description')?.value || '').trim(),
      category: document.getElementById('task-category')?.value || 'work',
      priority: document.getElementById('task-priority')?.value || 'medium',
      status: document.getElementById('task-status')?.value || 'todo',
      dueDate: document.getElementById('task-due-date')?.value || null,
      tags: tags
    };
  },

  populateForm(task) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('task-id', task.id);
    setVal('task-title', task.title);
    setVal('task-description', task.description);
    setVal('task-category', task.category);
    setVal('task-priority', task.priority);
    setVal('task-status', task.status);
    setVal('task-due-date', task.dueDate);
    setVal('task-tags', (task.tags || []).join(', '));
  },

  clearForm() {
    const form = document.getElementById('task-form');
    if (form) form.reset();

    const taskId = document.getElementById('task-id');
    if (taskId) taskId.value = '';

    // Reset selects to defaults
    const cat = document.getElementById('task-category');
    if (cat) cat.value = 'work';

    const pri = document.getElementById('task-priority');
    if (pri) pri.value = 'medium';

    const status = document.getElementById('task-status');
    if (status) status.value = 'todo';
  },

  showConfirmModal(taskId, title) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-task-title');
    const deleteBtn = document.getElementById('confirm-delete-btn');

    if (!modal) return;

    if (titleEl) titleEl.textContent = title || 'this task';
    if (deleteBtn) deleteBtn.setAttribute('data-task-id', taskId);

    modal.classList.remove('hidden');
    modal.classList.add('active');

    // Focus the cancel button for safety
    requestAnimationFrame(() => {
      const cancelBtn = document.getElementById('confirm-cancel-btn');
      if (cancelBtn) cancelBtn.focus();
    });
  },

  closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.classList.add('hidden');
  },

  /* ---------- Focus Trap ---------- */

  _focusTrapHandler: null,

  _trapFocus(container) {
    const focusable = container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    this._focusTrapHandler = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', this._focusTrapHandler);
  },

  _removeFocusTrap() {
    const modal = document.getElementById('task-modal');
    if (modal && this._focusTrapHandler) {
      modal.removeEventListener('keydown', this._focusTrapHandler);
      this._focusTrapHandler = null;
    }
  }
};
