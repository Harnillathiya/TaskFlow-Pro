/* =====================================================
   search.js — Search & Filter
   TaskFlow Pro
   ===================================================== */

window.SearchFilter = {
  activeFilters: { priority: [], category: [], due: [] },
  searchQuery: '',
  debounceTimer: null,

  init() {
    // Search input with debounce
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.handleSearch(e.target.value);
        }, 300);
      });

      // Clear on Escape while focused
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          searchInput.blur();
          this.handleSearch('');
        }
      });
    }

    // Filter chip clicks
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const type = chip.getAttribute('data-filter');
        const value = chip.getAttribute('data-value');
        if (type && value) {
          this.toggleFilter(type, value);
          chip.classList.toggle('active');
        }
      });
    });

    // Clear filters button
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearFilters());
    }

    // Filter dropdown toggle
    const filterToggle = document.getElementById('filter-toggle-btn');
    const filterDropdown = document.getElementById('filter-dropdown');
    if (filterToggle && filterDropdown) {
      filterToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        filterDropdown.classList.toggle('hidden');
      });

      // Close dropdown on outside click
      document.addEventListener('click', (e) => {
        if (!filterDropdown.contains(e.target) && e.target !== filterToggle && !filterToggle.contains(e.target)) {
          filterDropdown.classList.add('hidden');
        }
      });
    }
  },

  handleSearch(query) {
    this.searchQuery = query.trim().toLowerCase();
    this.applyFilters();
  },

  toggleFilter(type, value) {
    if (!this.activeFilters[type]) {
      this.activeFilters[type] = [];
    }

    const idx = this.activeFilters[type].indexOf(value);
    if (idx === -1) {
      this.activeFilters[type].push(value);
    } else {
      this.activeFilters[type].splice(idx, 1);
    }

    this.updateFilterBadge();
    this.applyFilters();
  },

  applyFilters() {
    let tasks = window.Store.getTasks();

    // 1. Search query filter
    if (this.searchQuery) {
      tasks = tasks.filter(t => {
        const title = (t.title || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const tags = (t.tags || []).join(' ').toLowerCase();
        return title.includes(this.searchQuery) ||
               desc.includes(this.searchQuery) ||
               tags.includes(this.searchQuery);
      });
    }

    // 2. Priority filter
    if (this.activeFilters.priority.length > 0) {
      tasks = tasks.filter(t => this.activeFilters.priority.includes(t.priority));
    }

    // 3. Category filter
    if (this.activeFilters.category.length > 0) {
      tasks = tasks.filter(t => this.activeFilters.category.includes(t.category));
    }

    // 4. Due date filter
    if (this.activeFilters.due.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const weekLater = new Date(today);
      weekLater.setDate(weekLater.getDate() + 7);
      const weekStr = weekLater.toISOString().split('T')[0];

      tasks = tasks.filter(t => {
        return this.activeFilters.due.some(filter => {
          switch (filter) {
            case 'overdue':
              return t.dueDate && t.dueDate < todayStr && t.status !== 'done';
            case 'today':
              return t.dueDate && t.dueDate === todayStr;
            case 'week':
              return t.dueDate && t.dueDate >= todayStr && t.dueDate <= weekStr;
            case 'nodate':
              return !t.dueDate;
            default:
              return true;
          }
        });
      });
    }

    window.KanbanBoard.render(tasks);
  },

  clearFilters() {
    this.activeFilters = { priority: [], category: [], due: [] };
    this.searchQuery = '';

    // Clear search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    // Remove active class from all chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.classList.remove('active');
    });

    this.updateFilterBadge();
    window.KanbanBoard.render();
  },

  updateFilterBadge() {
    const total = this.activeFilters.priority.length +
                  this.activeFilters.category.length +
                  this.activeFilters.due.length;

    const badge = document.getElementById('active-filter-badge');
    if (badge) {
      if (total > 0) {
        badge.textContent = total;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  },

  highlightMatch(text, query) {
    if (!query || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
};
