const STORAGE_KEY = "task-manager.tasks";
const MAX_TITLE_LENGTH = 120;
const MAX_DETAILS_LENGTH = 400;

const REPEAT_PATTERNS = Object.freeze({
  NONE: "none",
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
});

const LEGACY_FALLBACK_OFFSET_MS = 24 * 60 * 60 * 1000;

function generateTaskId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isValidDate(value) {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

function normalizeRepeatPattern(value) {
  return Object.values(REPEAT_PATTERNS).includes(value) ? value : REPEAT_PATTERNS.NONE;
}

function validateTitle(title) {
  const normalizedTitle = typeof title === "string" ? title.trim() : "";

  if (!normalizedTitle) {
    throw new Error("Please enter a task name.");
  }

  if (normalizedTitle.length > MAX_TITLE_LENGTH) {
    throw new Error(`Task names can be at most ${MAX_TITLE_LENGTH} characters long.`);
  }

  return normalizedTitle;
}

function validateDetails(details) {
  const normalizedDetails = typeof details === "string" ? details.trim() : "";

  if (normalizedDetails.length > MAX_DETAILS_LENGTH) {
    throw new Error(`Task details can be at most ${MAX_DETAILS_LENGTH} characters long.`);
  }

  return normalizedDetails;
}

function normalizeStoredDetails(details) {
  if (typeof details !== "string") {
    return "";
  }

  return details.trim().slice(0, MAX_DETAILS_LENGTH);
}

function buildDueAt(dateValue, timeValue) {
  if (!dateValue || !timeValue) {
    throw new Error("Please choose both a task date and time.");
  }

  const candidate = new Date(`${dateValue}T${timeValue}`);

  if (!isValidDate(candidate)) {
    throw new Error("Please choose a valid task date and time.");
  }

  return candidate.toISOString();
}

function sanitizeTaskInput(taskInput = {}) {
  return {
    title: validateTitle(taskInput.title),
    details: validateDetails(taskInput.details),
    dueAt: buildDueAt(taskInput.dueDate, taskInput.dueTime),
    repeat: normalizeRepeatPattern(taskInput.repeat),
  };
}

function createLegacyDueAt(createdAt) {
  if (isValidDate(createdAt)) {
    return new Date(new Date(createdAt).getTime() + LEGACY_FALLBACK_OFFSET_MS).toISOString();
  }

  return new Date(Date.now() + LEGACY_FALLBACK_OFFSET_MS).toISOString();
}

function normalizeTask(task) {
  if (!task || typeof task !== "object") {
    return null;
  }

  const title = typeof task.title === "string" ? task.title.trim() : "";

  if (!title) {
    return null;
  }

  const createdAt = isValidDate(task.createdAt) ? new Date(task.createdAt).toISOString() : new Date().toISOString();
  const dueAt = isValidDate(task.dueAt) ? new Date(task.dueAt).toISOString() : createLegacyDueAt(createdAt);
  const completed = Boolean(task.completed);

  return {
    id: typeof task.id === "string" && task.id ? task.id : generateTaskId(),
    title,
    details: normalizeStoredDetails(task.details),
    dueAt,
    repeat: normalizeRepeatPattern(task.repeat),
    completed,
    createdAt,
    completedAt: completed && isValidDate(task.completedAt) ? new Date(task.completedAt).toISOString() : null,
    overdueAt: !completed && isValidDate(task.overdueAt) ? new Date(task.overdueAt).toISOString() : null,
    notifiedAt: !completed && isValidDate(task.notifiedAt) ? new Date(task.notifiedAt).toISOString() : null,
  };
}

function writeTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function readTasks() {
  try {
    const rawTasks = localStorage.getItem(STORAGE_KEY);

    if (!rawTasks) {
      return [];
    }

    const parsedTasks = JSON.parse(rawTasks);

    if (!Array.isArray(parsedTasks)) {
      return [];
    }

    const normalizedTasks = parsedTasks.map(normalizeTask).filter(Boolean);

    if (JSON.stringify(parsedTasks) !== JSON.stringify(normalizedTasks)) {
      writeTasks(normalizedTasks);
    }

    return normalizedTasks;
  } catch (error) {
    return [];
  }
}

function getTasks() {
  return readTasks();
}

function createTask(taskInput) {
  const nextTask = {
    id: generateTaskId(),
    ...sanitizeTaskInput(taskInput),
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    overdueAt: null,
    notifiedAt: null,
  };

  const tasks = readTasks();
  writeTasks([nextTask, ...tasks]);
  return nextTask;
}

function updateTask(id, taskInput) {
  const nextTaskData = sanitizeTaskInput(taskInput);
  const tasks = readTasks();
  let updatedTask = null;

  const nextTasks = tasks.map((task) => {
    if (task.id !== id) {
      return task;
    }

    updatedTask = {
      ...task,
      ...nextTaskData,
      overdueAt: null,
      notifiedAt: null,
    };

    return updatedTask;
  });

  if (!updatedTask) {
    throw new Error("Task not found.");
  }

  writeTasks(nextTasks);
  return updatedTask;
}

function deleteTask(id) {
  const tasks = readTasks();
  const taskToDelete = tasks.find((task) => task.id === id);

  if (!taskToDelete) {
    throw new Error("Task not found.");
  }

  writeTasks(tasks.filter((task) => task.id !== id));
  return taskToDelete;
}

function addRepeatInterval(baseDate, repeat) {
  const nextDate = new Date(baseDate.getTime());

  switch (repeat) {
    case REPEAT_PATTERNS.DAILY:
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case REPEAT_PATTERNS.WEEKLY:
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case REPEAT_PATTERNS.MONTHLY:
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case REPEAT_PATTERNS.NONE:
    default:
      nextDate.setDate(nextDate.getDate() + 1);
      break;
  }

  return nextDate;
}

function calculateNextDueAt(dueAt, repeat, referenceTime = new Date()) {
  if (repeat === REPEAT_PATTERNS.NONE) {
    return null;
  }

  const referenceTimestamp = new Date(referenceTime).getTime();
  let nextDueDate = new Date(dueAt);

  do {
    nextDueDate = addRepeatInterval(nextDueDate, repeat);
  } while (nextDueDate.getTime() <= referenceTimestamp);

  return nextDueDate.toISOString();
}

function buildRecurringTask(task, referenceTime = new Date()) {
  const nextDueAt = calculateNextDueAt(task.dueAt, task.repeat, referenceTime);

  if (!nextDueAt) {
    return null;
  }

  return {
    id: generateTaskId(),
    title: task.title,
    details: task.details,
    dueAt: nextDueAt,
    repeat: task.repeat,
    completed: false,
    createdAt: new Date(referenceTime).toISOString(),
    completedAt: null,
    overdueAt: null,
    notifiedAt: null,
  };
}

function toggleTaskCompletion(id) {
  const tasks = readTasks();
  const now = new Date();
  const nowIso = now.toISOString();
  let updatedTask = null;
  let recurringTask = null;

  const nextTasks = tasks.map((task) => {
    if (task.id !== id) {
      return task;
    }

    if (task.completed) {
      updatedTask = task;
      return task;
    }

    updatedTask = {
      ...task,
      completed: true,
      completedAt: nowIso,
      overdueAt: null,
      notifiedAt: null,
    };

    return updatedTask;
  });

  if (!updatedTask) {
    throw new Error("Task not found.");
  }

  if (updatedTask.completed && updatedTask.repeat !== REPEAT_PATTERNS.NONE) {
    recurringTask = buildRecurringTask(updatedTask, now);

    if (recurringTask) {
      nextTasks.unshift(recurringTask);
    }
  }

  writeTasks(nextTasks);

  return {
    task: updatedTask,
    recurringTask,
  };
}

function processDueTasks(referenceTime = new Date()) {
  const tasks = readTasks();
  const referenceTimestamp = new Date(referenceTime).getTime();
  const referenceIso = new Date(referenceTime).toISOString();
  let didUpdate = false;
  const newlyIncompleteTasks = [];

  const nextTasks = tasks.map((task) => {
    if (task.completed || new Date(task.dueAt).getTime() > referenceTimestamp) {
      return task;
    }

    let nextTask = task;

    if (!task.overdueAt) {
      nextTask = {
        ...nextTask,
        overdueAt: referenceIso,
      };
      didUpdate = true;
    }

    if (!task.notifiedAt) {
      if (nextTask === task) {
        nextTask = {
          ...nextTask,
        };
      }

      nextTask.notifiedAt = referenceIso;
      newlyIncompleteTasks.push(nextTask);
      didUpdate = true;
    }

    return nextTask;
  });

  if (didUpdate) {
    writeTasks(nextTasks);
  }

  return {
    didUpdate,
    newlyIncompleteTasks,
  };
}

export {
  MAX_DETAILS_LENGTH,
  MAX_TITLE_LENGTH,
  REPEAT_PATTERNS,
  createTask,
  deleteTask,
  getTasks,
  processDueTasks,
  toggleTaskCompletion,
  updateTask,
};
