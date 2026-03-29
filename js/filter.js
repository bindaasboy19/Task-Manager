const FILTERS = Object.freeze({
  ALL: "all",
  PENDING: "pending",
  INCOMPLETE: "incomplete",
  COMPLETED: "completed",
});

const SORT_ORDERS = Object.freeze({
  SOONEST: "soonest",
  LATEST: "latest",
});

const TASK_STATUSES = Object.freeze({
  PENDING: "pending",
  INCOMPLETE: "incomplete",
  COMPLETED: "completed",
});

function isFilterValue(value) {
  return Object.values(FILTERS).includes(value);
}

function isSortOrder(value) {
  return Object.values(SORT_ORDERS).includes(value);
}

function getTaskStatus(task, referenceTime = new Date()) {
  if (task.completed) {
    return TASK_STATUSES.COMPLETED;
  }

  if (new Date(task.dueAt).getTime() <= new Date(referenceTime).getTime()) {
    return TASK_STATUSES.INCOMPLETE;
  }

  return TASK_STATUSES.PENDING;
}

function filterTasks(tasks, activeFilter = FILTERS.ALL, referenceTime = new Date()) {
  switch (activeFilter) {
    case FILTERS.PENDING:
      return tasks.filter((task) => getTaskStatus(task, referenceTime) === TASK_STATUSES.PENDING);
    case FILTERS.INCOMPLETE:
      return tasks.filter((task) => getTaskStatus(task, referenceTime) === TASK_STATUSES.INCOMPLETE);
    case FILTERS.COMPLETED:
      return tasks.filter((task) => getTaskStatus(task, referenceTime) === TASK_STATUSES.COMPLETED);
    case FILTERS.ALL:
    default:
      return [...tasks];
  }
}

function getSortTimestamp(task) {
  return new Date(task.dueAt || task.createdAt).getTime();
}

function sortTasksByDate(tasks, sortOrder = SORT_ORDERS.SOONEST) {
  const sortedTasks = [...tasks].sort((taskA, taskB) => getSortTimestamp(taskA) - getSortTimestamp(taskB));

  if (sortOrder === SORT_ORDERS.LATEST) {
    return sortedTasks.reverse();
  }

  return sortedTasks;
}

function getVisibleTasks(tasks, activeFilter = FILTERS.ALL, sortOrder = SORT_ORDERS.SOONEST, referenceTime = new Date()) {
  return sortTasksByDate(filterTasks(tasks, activeFilter, referenceTime), sortOrder);
}

function getTaskCounts(tasks, referenceTime = new Date()) {
  const counts = {
    total: tasks.length,
    completed: 0,
    pending: 0,
    incomplete: 0,
  };

  tasks.forEach((task) => {
    const status = getTaskStatus(task, referenceTime);

    if (status === TASK_STATUSES.COMPLETED) {
      counts.completed += 1;
      return;
    }

    if (status === TASK_STATUSES.INCOMPLETE) {
      counts.incomplete += 1;
      return;
    }

    counts.pending += 1;
  });

  return counts;
}

export {
  FILTERS,
  SORT_ORDERS,
  TASK_STATUSES,
  filterTasks,
  getTaskCounts,
  getTaskStatus,
  getVisibleTasks,
  isFilterValue,
  isSortOrder,
  sortTasksByDate,
};
