# 🚀 TaskFlow Pro

A premium, full-featured **Task Manager & Productivity App** built with pure HTML, CSS, and JavaScript — no frameworks, no dependencies.

**[🔗 Live Demo](https://harnil.github.io/taskflow-pro)** *(update with your actual URL after deployment)*

---

## ✨ Features

### 📋 Kanban Board
- Drag-and-drop task management across **To Do**, **In Progress**, and **Done** columns
- Touch support for mobile drag-and-drop
- Priority-based sorting with visual indicators
- Task cards with category badges, due dates, and tags

### ⏱️ Pomodoro Timer
- Configurable **Focus / Short Break / Long Break** modes
- Circular SVG progress ring with smooth animation
- Audio notification on timer completion
- Link timer sessions to specific tasks
- Session tracking with visual dots

### 📊 Analytics Dashboard
- **Weekly completion** bar chart (Canvas API)
- **Category breakdown** doughnut chart
- **Priority distribution** horizontal bar chart
- **Completion rate** circular ring display
- Real-time stat cards: Total Tasks, Completed, Streak, Pomodoros

### 🌗 Dark / Light Mode
- Smooth theme transitions
- System preference detection (`prefers-color-scheme`)
- Saved to localStorage

### 🏷️ Categories & Tags
- 5 categories: Work, Personal, Health, Learning, Finance
- Color-coded category badges
- Custom tags per task
- Filter by category

### 📅 Due Dates & Priority
- Date picker with overdue highlighting
- 4 priority levels: Low, Medium, High, Urgent
- Visual priority indicators (color-coded borders)

### 🔍 Search & Filter
- Real-time search with debounce
- Multi-criteria filtering (priority, category, due date)
- Combined search + filter
- Keyboard shortcut: `Ctrl+K` to focus search

### 💾 Data Persistence
- Auto-save to browser localStorage
- Import/Export tasks as JSON backup
- No backend required — works offline

---

## 🛠️ Tech Stack

| Technology | Usage |
|-----------|-------|
| **HTML5** | Semantic markup, ARIA accessibility |
| **CSS3** | Glassmorphism, CSS Grid, custom properties, animations |
| **JavaScript (ES6+)** | Vanilla JS, no frameworks or libraries |
| **Canvas API** | Charts and data visualization |
| **Web Audio API** | Timer completion sound |
| **localStorage** | Data persistence |
| **HTML5 Drag & Drop API** | Kanban board interaction |
| **Google Fonts** | Inter typeface |

**Zero dependencies. No npm. No build step.**

---

## 🚀 Quick Start

### Run Locally
Simply open `index.html` in any modern browser:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/taskflow-pro.git

# Open in browser (no server needed!)
open index.html
# or on Windows:
start index.html
```

### Deploy Free on GitHub Pages

1. **Create a GitHub repository** named `taskflow-pro`

2. **Push your code:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: TaskFlow Pro"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/taskflow-pro.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to repository **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** / **/ (root)**
   - Click **Save**

4. **Your app is live at:** `https://YOUR_USERNAME.github.io/taskflow-pro`

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | Create new task |
| `Ctrl+K` | Focus search bar |
| `Escape` | Close modal / dropdown |

---

## 📁 Project Structure

```
taskflow-pro/
├── index.html              # Single-page app shell
├── css/
│   ├── variables.css       # Design tokens & theme system
│   ├── base.css            # CSS reset & typography
│   ├── layout.css          # Grid layout & responsive
│   ├── components.css      # Buttons, forms, modals, toasts
│   ├── kanban.css          # Kanban board styles
│   ├── timer.css           # Pomodoro timer styles
│   ├── analytics.css       # Dashboard & chart styles
│   └── animations.css      # Keyframes & transitions
├── js/
│   ├── store.js            # State management & localStorage
│   ├── theme.js            # Dark/light mode toggle
│   ├── tasks.js            # Task CRUD & modal logic
│   ├── kanban.js           # Kanban board & drag-drop
│   ├── timer.js            # Pomodoro timer logic
│   ├── analytics.js        # Charts & statistics
│   ├── search.js           # Search & filter engine
│   └── app.js              # App init, routing & bootstrap
└── README.md
```

---

## 📸 Screenshots

*Screenshots will be added after deployment*

---

## 📄 License

MIT License — Free to use, modify, and distribute.

---

Built with ❤️ by [Your Name]
