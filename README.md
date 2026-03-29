# Task Manager Web App

A responsive task manager built with HTML, CSS, and vanilla JavaScript.

The app supports:

- Task name
- Task details
- Due date and time
- Repeat reminders
- Pending, incomplete, and completed states
- Local storage persistence
- Responsive desktop and mobile layouts

## Features

### Task Creation

Users can create tasks with:

- `title`
- `details`
- `due date`
- `due time`
- `repeat` frequency

### Task States

Each task can appear in one of these states:

- `Pending`: due time is still in the future
- `Incomplete`: due time passed and the task was not completed
- `Completed`: task was checked off

Completed tasks stay completed and cannot be changed back to incomplete or pending.

### Repeat Reminders

Users can choose one of these repeat options:

- `One time`
- `Every day`
- `Every week`
- `Every month`

When a repeating task is completed, the app automatically creates the next occurrence using the same title, details, and repeat rule.

### Persistence

All tasks are stored in `localStorage`, so data remains available after refresh.

- Storage key: `task-manager.tasks`

### Filters and Sorting

Users can filter tasks by:

- `All`
- `Pending`
- `Incomplete`
- `Completed`

Users can sort tasks by due time:

- `Soonest first`
- `Latest first`

### Responsive UI

The interface is designed to work well on:

- desktop screens
- tablets
- mobile phones

Responsive improvements include:

- adaptive grid layout
- stacked form controls on smaller screens
- scrollable filter chips on small devices
- mobile-friendly task action layout
- responsive stat cards and toast positioning

## Project Structure

```text
.
├── index.html
├── styles.css
└── js
    ├── main.js
    ├── taskService.js
    ├── filter.js
    └── ui.js
```

## File Responsibilities

- `index.html`: app structure and semantic markup
- `styles.css`: visual styling and responsive layout
- `js/taskService.js`: task CRUD, persistence, overdue processing, repeat scheduling
- `js/filter.js`: task status calculation, filtering, sorting, counters
- `js/ui.js`: rendering, form handling, task card markup, toast messages
- `js/main.js`: app initialization and feature wiring

## Task Data Shape

Each task is stored in a structure similar to:

```js
{
  id: "unique-id",
  title: "Task title",
  details: "Optional notes",
  dueAt: "2026-03-30T15:30:00.000Z",
  repeat: "none",
  completed: false,
  createdAt: "2026-03-30T10:00:00.000Z",
  completedAt: null,
  overdueAt: null,
  notifiedAt: null
}
```

## How Overdue Detection Works

- The app checks due tasks on load
- It continues checking on an interval while the page is open
- If a task reaches its due time and is still unfinished, it becomes `Incomplete`
- A toast notification is shown when tasks first become incomplete

## How to Run

Because the app uses ES modules, the safest way to run it locally is with a simple local server.

Example:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Notes

- No external libraries are required
- No build step is required
- The app is ready to deploy as a static site
- Existing older tasks in local storage are normalized when loaded
