/* =====================================================
   analytics.js — Charts & Stats Dashboard
   TaskFlow Pro
   ===================================================== */

window.AnalyticsDashboard = {
  init() {
    this.render();
  },

  render() {
    this.updateStats();
    this.drawWeeklyChart();
    this.drawCategoryChart();
    this.drawPriorityChart();
    this.updateCompletionRate();
  },

  /* ---------- Stats Cards ---------- */

  updateStats() {
    const tasks = window.Store.getTasks();
    const state = window.Store.getState();

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const streak = state.streak.current || 0;

    // Total pomodoro sessions
    let totalPomodoros = 0;
    Object.values(state.sessions).forEach(c => { totalPomodoros += c; });

    this._animateCounter('stat-total-tasks', total);
    this._animateCounter('stat-completed', completed);
    this._animateCounter('stat-streak', streak);
    this._animateCounter('stat-pomodoros', totalPomodoros);
  },

  _animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;

    const current = parseInt(el.textContent) || 0;
    if (current === target) { el.textContent = target; return; }

    const duration = 600;
    const start = performance.now();
    const diff = target - current;

    const step = (timestamp) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(current + diff * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  /* ---------- Weekly Bar Chart ---------- */

  drawWeeklyChart() {
    const canvas = document.getElementById('weekly-chart');
    if (!canvas) return;

    const ctx = this._setupCanvas(canvas);
    const width = canvas.width;
    const height = canvas.height;

    const data = window.Store.getCompletionsForWeek();
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const colors = this.getCanvasColors();

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (data.every(d => d.count === 0)) {
      this._drawEmptyState(ctx, width, height, 'No completions this week');
      return;
    }

    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const barWidth = chartW / data.length * 0.6;
    const gap = chartW / data.length;

    // Y-axis gridlines & labels
    ctx.strokeStyle = colors.grid;
    ctx.fillStyle = colors.textSecondary;
    ctx.font = `${11 * (window.devicePixelRatio || 1)}px Inter, sans-serif`;
    ctx.textAlign = 'right';

    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const val = Math.round((maxCount / ySteps) * i);
      const y = padding.top + chartH - (chartH / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(val, padding.left - 8, y + 4);
    }

    // Animate bars
    this._animateBars(ctx, data, {
      padding, chartH, barWidth, gap, maxCount, colors
    });
  },

  _animateBars(ctx, data, opts) {
    const { padding, chartH, barWidth, gap, maxCount, colors } = opts;
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    const dpr = window.devicePixelRatio || 1;
    const duration = 800;
    const start = performance.now();

    const drawFrame = (timestamp) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      // Clear bars area
      ctx.clearRect(padding.left, padding.top, width - padding.left - padding.right, chartH + 5);

      // Redraw gridlines
      ctx.strokeStyle = colors.grid;
      const ySteps = 4;
      for (let i = 0; i <= ySteps; i++) {
        const y = padding.top + chartH - (chartH / ySteps) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
      }

      // Draw bars
      data.forEach((d, i) => {
        const barH = (d.count / maxCount) * chartH * eased;
        const x = padding.left + gap * i + (gap - barWidth) / 2;
        const y = padding.top + chartH - barH;

        // Gradient
        const grad = ctx.createLinearGradient(x, y, x, y + barH);
        grad.addColorStop(0, colors.primary);
        grad.addColorStop(1, colors.primaryDark);

        // Rounded top
        const radius = Math.min(6 * dpr, barWidth / 2, barH);
        ctx.beginPath();
        if (barH > 0) {
          ctx.moveTo(x, y + barH);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.lineTo(x + barWidth - radius, y);
          ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
          ctx.lineTo(x + barWidth, y + barH);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // Value label above bar
        if (d.count > 0 && eased > 0.5) {
          ctx.fillStyle = colors.text;
          ctx.font = `bold ${11 * dpr}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(d.count, x + barWidth / 2, y - 6 * dpr);
        }
      });

      // X labels
      ctx.fillStyle = colors.textSecondary;
      ctx.font = `${11 * dpr}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      data.forEach((d, i) => {
        const x = padding.left + gap * i + gap / 2;
        ctx.fillText(d.day, x, height - 10 * dpr);
      });

      if (progress < 1) requestAnimationFrame(drawFrame);
    };

    requestAnimationFrame(drawFrame);
  },

  /* ---------- Category Doughnut Chart ---------- */

  drawCategoryChart() {
    const canvas = document.getElementById('category-chart');
    if (!canvas) return;

    const ctx = this._setupCanvas(canvas);
    const width = canvas.width;
    const height = canvas.height;
    const colors = this.getCanvasColors();

    ctx.clearRect(0, 0, width, height);

    const tasks = window.Store.getTasks();
    const categories = {};
    tasks.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + 1;
    });

    const catEntries = Object.entries(categories).filter(([, v]) => v > 0);

    if (catEntries.length === 0) {
      this._drawEmptyState(ctx, width, height, 'No tasks to display');
      this._clearLegend();
      return;
    }

    const total = catEntries.reduce((s, [, v]) => s + v, 0);
    const catColors = {
      work: '#818cf8',
      personal: '#f472b6',
      health: '#34d399',
      learning: '#fbbf24',
      finance: '#60a5fa'
    };

    const cx = width / 2;
    const cy = height / 2;
    const outerR = Math.min(width, height) / 2 - 30;
    const innerR = outerR * 0.58;

    let startAngle = -Math.PI / 2;

    // Animate
    const duration = 800;
    const startTime = performance.now();

    const drawFrame = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const sweepLimit = Math.PI * 2 * eased;

      ctx.clearRect(0, 0, width, height);
      let angle = -Math.PI / 2;

      catEntries.forEach(([cat, count]) => {
        const slice = (count / total) * Math.PI * 2;
        const actualSlice = Math.min(slice, Math.max(0, sweepLimit - (angle - (-Math.PI / 2))));

        if (actualSlice > 0) {
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
          ctx.arc(cx, cy, outerR, angle, angle + actualSlice);
          ctx.arc(cx, cy, innerR, angle + actualSlice, angle, true);
          ctx.closePath();
          ctx.fillStyle = catColors[cat] || '#94a3b8';
          ctx.fill();
        }

        angle += slice;
      });

      // Center hole text
      if (eased > 0.5) {
        ctx.fillStyle = colors.text;
        ctx.font = `bold ${18 * (window.devicePixelRatio || 1)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total, cx, cy - 6);
        ctx.font = `${11 * (window.devicePixelRatio || 1)}px Inter, sans-serif`;
        ctx.fillStyle = colors.textSecondary;
        ctx.fillText('tasks', cx, cy + 14);
      }

      if (progress < 1) requestAnimationFrame(drawFrame);
    };

    requestAnimationFrame(drawFrame);

    // Legend
    this._renderLegend(catEntries, catColors, total);
  },

  _renderLegend(catEntries, catColors, total) {
    const legend = document.getElementById('category-legend');
    if (!legend) return;

    const icons = { work: '💼', personal: '🏠', health: '💪', learning: '📚', finance: '💰' };

    legend.innerHTML = catEntries.map(([cat, count]) => {
      const pct = Math.round((count / total) * 100);
      return `
        <div class="legend-item">
          <span class="legend-dot" style="background: ${catColors[cat] || '#94a3b8'}"></span>
          <span class="legend-label">${icons[cat] || ''} ${cat}</span>
          <span class="legend-value">${count} (${pct}%)</span>
        </div>`;
    }).join('');
  },

  _clearLegend() {
    const legend = document.getElementById('category-legend');
    if (legend) legend.innerHTML = '';
  },

  /* ---------- Priority Horizontal Bar Chart ---------- */

  drawPriorityChart() {
    const canvas = document.getElementById('priority-chart');
    if (!canvas) return;

    const ctx = this._setupCanvas(canvas);
    const width = canvas.width;
    const height = canvas.height;
    const colors = this.getCanvasColors();
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, width, height);

    const tasks = window.Store.getTasks();
    const priorities = [
      { key: 'urgent', label: '🔴 Urgent', color: '#ef4444' },
      { key: 'high', label: '🟠 High', color: '#f97316' },
      { key: 'medium', label: '🟡 Medium', color: '#eab308' },
      { key: 'low', label: '🟢 Low', color: '#22c55e' }
    ];

    priorities.forEach(p => {
      p.count = tasks.filter(t => t.priority === p.key).length;
    });

    const maxCount = Math.max(...priorities.map(p => p.count), 1);

    if (priorities.every(p => p.count === 0)) {
      this._drawEmptyState(ctx, width, height, 'No tasks to display');
      return;
    }

    const padding = { top: 20, right: 40, bottom: 20, left: 100 };
    const chartW = width - padding.left - padding.right;
    const barHeight = ((height - padding.top - padding.bottom) / priorities.length) * 0.6;
    const rowHeight = (height - padding.top - padding.bottom) / priorities.length;

    // Animate
    const duration = 800;
    const startTime = performance.now();

    const drawFrame = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      ctx.clearRect(0, 0, width, height);

      priorities.forEach((p, i) => {
        const y = padding.top + rowHeight * i + (rowHeight - barHeight) / 2;
        const barW = (p.count / maxCount) * chartW * eased;

        // Label
        ctx.fillStyle = colors.text;
        ctx.font = `${12 * dpr}px Inter, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.label, padding.left - 12 * dpr, y + barHeight / 2);

        // Bar
        if (barW > 0) {
          const radius = Math.min(6 * dpr, barHeight / 2, barW);
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(padding.left + barW - radius, y);
          ctx.quadraticCurveTo(padding.left + barW, y, padding.left + barW, y + radius);
          ctx.lineTo(padding.left + barW, y + barHeight - radius);
          ctx.quadraticCurveTo(padding.left + barW, y + barHeight, padding.left + barW - radius, y + barHeight);
          ctx.lineTo(padding.left, y + barHeight);
          ctx.closePath();

          const grad = ctx.createLinearGradient(padding.left, y, padding.left + barW, y);
          grad.addColorStop(0, p.color);
          grad.addColorStop(1, p.color + 'aa');
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // Count text
        if (p.count > 0 && eased > 0.3) {
          ctx.fillStyle = colors.text;
          ctx.font = `bold ${12 * dpr}px Inter, sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillText(p.count, padding.left + barW + 8 * dpr, y + barHeight / 2);
        }
      });

      if (progress < 1) requestAnimationFrame(drawFrame);
    };

    requestAnimationFrame(drawFrame);
  },

  /* ---------- Completion Rate Ring ---------- */

  updateCompletionRate() {
    const tasks = window.Store.getTasks();
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const percentEl = document.getElementById('completion-percent');
    if (percentEl) percentEl.textContent = pct + '%';

    const circle = document.getElementById('completion-circle');
    if (circle) {
      const r = 70;
      const circumference = 2 * Math.PI * r;
      const offset = circumference * (1 - pct / 100);
      circle.style.strokeDasharray = circumference;
      circle.style.strokeDashoffset = offset;
    }
  },

  /* ---------- Canvas Helpers ---------- */

  _setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    // Use the HTML attribute size or computed size
    const w = canvas.getAttribute('width') || rect.width || 500;
    const h = canvas.getAttribute('height') || rect.height || 260;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    // Re-scale for our calculations — canvas.width/height already scaled
    // We work in the unscaled coordinate space
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    return ctx;
  },

  getCanvasColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      text: style.getPropertyValue('--text-primary').trim() || '#e2e8f0',
      textSecondary: style.getPropertyValue('--text-secondary').trim() || '#94a3b8',
      grid: (style.getPropertyValue('--border-color') || 'rgba(148,163,184,0.15)').trim(),
      primary: style.getPropertyValue('--primary') || '#818cf8',
      primaryDark: style.getPropertyValue('--primary-dark') || '#6366f1',
      bg: style.getPropertyValue('--bg-primary') || '#0f172a'
    };
  },

  _drawEmptyState(ctx, width, height, message) {
    const dpr = window.devicePixelRatio || 1;
    const colors = this.getCanvasColors();
    ctx.fillStyle = colors.textSecondary;
    ctx.font = `${14 * dpr}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, width / 2, height / 2);
  }
};
