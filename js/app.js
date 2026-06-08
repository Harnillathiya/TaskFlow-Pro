/* =====================================================
   app.js — Main App Initialization & Routing
   TaskFlow Pro
   ===================================================== */

window.App = {
  currentView: 'kanban',

  init() {
    // 1-7. Initialize all modules in order
    window.Store.init();
    window.ThemeManager.init();
    window.TaskManager.init();
    window.KanbanBoard.init();
    window.PomodoroTimer.init();
    window.AnalyticsDashboard.init();
    window.SearchFilter.init();

    // 8-11. App-level setup
    this.initNavigation();
    this.initSidebar();
    this.initKeyboardShortcuts();
    this.initImportExport();

    // 12. Subscribe to Store changes to re-render views
    window.Store.subscribe(() => {
      window.KanbanBoard.render();
      window.PomodoroTimer.populateTaskSelect();
      window.PomodoroTimer.updateSessionDots();

      if (this.currentView === 'analytics') {
        window.AnalyticsDashboard.render();
      }
    });

    // 13. Add sample tasks if first launch
    if (window.Store.getState().tasks.length === 0) {
      this.addSampleTasks();
    }

    console.log('%c✅ TaskFlow Pro initialized', 'color: #818cf8; font-weight: bold; font-size: 14px;');
  },

  /* ---------- Navigation ---------- */

  initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        if (view) this.switchView(view);
      });
    });
  },

  switchView(viewName) {
    // Hide all views
    const views = document.querySelectorAll('.view');
    views.forEach(v => v.classList.remove('active'));

    // Show target view
    const target = document.getElementById(viewName + '-view');
    if (target) target.classList.add('active');

    // Update nav active state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    this.currentView = viewName;

    // Trigger view-specific renders
    if (viewName === 'analytics') {
      // Re-render charts when switching to analytics
      requestAnimationFrame(() => {
        window.AnalyticsDashboard.render();
      });
    }

    if (viewName === 'timer') {
      window.PomodoroTimer.populateTaskSelect();
      window.PomodoroTimer.updateSessionDots();
    }

    // Close sidebar on mobile
    this._closeSidebar();
  },

  /* ---------- Sidebar ---------- */

  initSidebar() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => this._openSidebar());
    }

    if (overlay) {
      overlay.addEventListener('click', () => this._closeSidebar());
    }

    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        if (sidebar) {
          sidebar.classList.toggle('collapsed');
        }
      });
    }
  },

  _openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  _closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  },

  /* ---------- Keyboard Shortcuts ---------- */

  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K — Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const search = document.getElementById('search-input');
        if (search) search.focus();
      }

      // Escape — Close modals
      if (e.key === 'Escape') {
        const taskModal = document.getElementById('task-modal');
        const confirmModal = document.getElementById('confirm-modal');
        const filterDropdown = document.getElementById('filter-dropdown');

        if (confirmModal && !confirmModal.classList.contains('hidden')) {
          window.TaskManager.closeConfirmModal();
        } else if (taskModal && !taskModal.classList.contains('hidden')) {
          window.TaskManager.closeModal();
        }
        if (filterDropdown) filterDropdown.classList.add('hidden');
      }

      // N — New task (when not in an input)
      if (e.key === 'n' || e.key === 'N') {
        const active = document.activeElement;
        const isInput = active && (
          active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT' ||
          active.isContentEditable
        );
        if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          window.TaskManager.openModal();
        }
      }
    });
  },

  /* ---------- Import / Export ---------- */

  initImportExport() {
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file-input');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        window.Store.exportData();
        this.showToast('Data exported successfully', 'success');
      });
    }

    if (importBtn && importFileInput) {
      importBtn.addEventListener('click', () => {
        importFileInput.click();
      });

      importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = window.Store.importData(ev.target.result);
          if (result) {
            this.showToast('Data imported successfully', 'success');
          } else {
            this.showToast('Import failed: Invalid file format', 'error');
          }
          // Reset file input
          importFileInput.value = '';
        };
        reader.onerror = () => {
          this.showToast('Import failed: Could not read file', 'error');
        };
        reader.readAsText(file);
      });
    }
  },

  /* ---------- Toast Notifications ---------- */

  showToast(message, type) {
    type = type || 'info';
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    const icons = {
      success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20,6 9,17 4,12"/></svg>',
      error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
    `;

    // Close button
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
      });
    }

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-enter');
    });

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  },

  /* ---------- Sample Tasks ---------- */

  addSampleTasks() {
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const today = new Date(now);
    const in3Days = new Date(now); in3Days.setDate(now.getDate() + 3);
    const in2Days = new Date(now); in2Days.setDate(now.getDate() + 2);
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);

    const fmt = (d) => d.toISOString().split('T')[0];

    const samples = [
      {
        title: 'Design new landing page',
        description: 'Create a modern, responsive landing page for the new product launch. Include hero section, features grid, and testimonials.',
        category: 'work',
        priority: 'high',
        status: 'in-progress',
        dueDate: fmt(tomorrow),
        tags: ['design', 'ui', 'frontend'],
        pomodoroCount: 3
      },
      {
        title: 'Morning workout routine',
        description: '30-minute HIIT session followed by 10 minutes of stretching. Track progress in fitness journal.',
        category: 'health',
        priority: 'medium',
        status: 'todo',
        dueDate: fmt(today),
        tags: ['fitness', 'daily'],
        pomodoroCount: 0
      },
      {
        title: 'Read Clean Code chapter 5',
        description: 'Chapter 5: Formatting — understand vertical and horizontal formatting principles. Take notes on key concepts.',
        category: 'learning',
        priority: 'low',
        status: 'todo',
        dueDate: fmt(in3Days),
        tags: ['reading', 'programming'],
        pomodoroCount: 1
      },
      {
        title: 'Review monthly budget',
        description: 'Analyze last month\'s expenses, update the spreadsheet, and plan next month\'s savings goals.',
        category: 'finance',
        priority: 'high',
        status: 'todo',
        dueDate: fmt(in2Days),
        tags: ['budget', 'monthly'],
        pomodoroCount: 0
      },
      {
        title: 'Buy groceries',
        description: 'Weekly grocery shopping: fruits, vegetables, proteins, and pantry staples. Check for coupons.',
        category: 'personal',
        priority: 'medium',
        status: 'done',
        dueDate: fmt(yesterday),
        tags: ['shopping', 'weekly'],
        completedAt: yesterday.toISOString(),
        pomodoroCount: 0
      },
      {
        title: 'Prepare team presentation',
        description: 'Q2 results presentation for the leadership team. Include metrics, charts, and key takeaways.',
        category: 'work',
        priority: 'urgent',
        status: 'in-progress',
        dueDate: fmt(today),
        tags: ['presentation', 'leadership', 'q2'],
        pomodoroCount: 2
      }
    ];

    samples.forEach(task => window.Store.addTask(task));

    // Log the completed task
    const completedTask = window.Store.getTasks().find(t => t.status === 'done');
    if (completedTask) {
      window.Store.logCompletion(completedTask.id, fmt(yesterday));
    }

    // Set initial streak
    window.Store.getState().streak = { current: 1, lastDate: fmt(yesterday) };
    window.Store.save();
  }
};

/* ---------- Bootstrap ---------- */
document.addEventListener('DOMContentLoaded', () => App.init());
