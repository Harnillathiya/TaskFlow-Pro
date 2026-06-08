/* =====================================================
   theme.js — Dark/Light Mode Manager
   TaskFlow Pro
   ===================================================== */

window.ThemeManager = {
  THEME_KEY: 'taskflow_theme',

  init() {
    const saved = this._load();
    if (saved) {
      this.set(saved);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.set(prefersDark ? 'dark' : 'light');
    }

    // Bind toggle checkbox
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('change', () => this.toggle());
    }

    // Listen for system preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Only auto-switch if no explicit preference saved
        if (!this._load()) {
          this.set(e.matches ? 'dark' : 'light');
        }
      });
    }
  },

  toggle() {
    const current = this.get();
    const next = current === 'dark' ? 'light' : 'dark';
    this.set(next);
    this._save(next);

    // Redraw charts if analytics module is loaded
    if (window.AnalyticsDashboard && typeof window.AnalyticsDashboard.render === 'function') {
      // Small delay so CSS variables update first
      requestAnimationFrame(() => {
        window.AnalyticsDashboard.render();
      });
    }
  },

  set(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      // Checkbox checked = dark mode
      toggle.checked = theme === 'dark';
    }
  },

  get() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  },

  _save(theme) {
    try {
      localStorage.setItem(this.THEME_KEY, theme);
    } catch (e) {
      console.warn('ThemeManager: Could not save to localStorage.', e);
    }
  },

  _load() {
    try {
      return localStorage.getItem(this.THEME_KEY);
    } catch (e) {
      return null;
    }
  }
};
