import {
  REPEAT_PATTERNS,
  createTask,
  deleteTask,
  getTasks,
  processDueTasks,
  toggleTaskCompletion,
  updateTask,
} from "./taskService.js";
import {
  FILTERS,
  SORT_ORDERS,
  getTaskCounts,
  getVisibleTasks,
  isFilterValue,
  isSortOrder,
} from "./filter.js";
import { createUI } from "./ui.js";

const DUE_CHECK_INTERVAL_MS = 15000;

const state = {
  activeFilter: FILTERS.ALL,
  editingTaskId: null,
  sortOrder: SORT_ORDERS.SOONEST,
  tasks: [],
};

function syncTasks() {
  state.tasks = getTasks();
}

function render(ui) {
  syncTasks();

  const referenceTime = new Date();

  ui.render({
    tasks: getVisibleTasks(state.tasks, state.activeFilter, state.sortOrder, referenceTime),
    counts: getTaskCounts(state.tasks, referenceTime),
    activeFilter: state.activeFilter,
    sortOrder: state.sortOrder,
    editingTaskId: state.editingTaskId,
    referenceTime,
  });
}

function showIncompleteToast(ui, tasks) {
  if (tasks.length === 0) {
    return;
  }

  if (tasks.length === 1) {
    ui.showToast(`"${tasks[0].title}" is now incomplete.`, "error");
    return;
  }

  ui.showToast(`${tasks.length} tasks are now incomplete.`, "error");
}

function runDueCheck(ui) {
  const { didUpdate, newlyIncompleteTasks } = processDueTasks();

  if (newlyIncompleteTasks.length > 0) {
    showIncompleteToast(ui, newlyIncompleteTasks);
  }

  if (didUpdate && state.editingTaskId === null) {
    render(ui);
  }

  return didUpdate;
}

function buildApp() {
  const ui = createUI({
    onAddTask(taskInput) {
      try {
        createTask(taskInput);
        state.editingTaskId = null;
        ui.resetForm();
        ui.setFormMessage("Task scheduled successfully.", "success");
        render(ui);
        ui.showToast("Task saved.", "success");
        ui.focusTitleInput();
      } catch (error) {
        ui.setFormMessage(error.message, "error");
        ui.showToast(error.message, "error");
        ui.focusTitleInput();
      }
    },

    onToggleTask(id) {
      try {
        const result = toggleTaskCompletion(id);
        ui.setFormMessage("");
        render(ui);

        if (result.task.completed) {
          const toastMessage =
            result.recurringTask && result.task.repeat !== REPEAT_PATTERNS.NONE
              ? "Task completed. Next recurring reminder created."
              : "Task marked complete.";

        ui.showToast(toastMessage, "success");
        return;
      }
      } catch (error) {
        ui.showToast(error.message, "error");
      }
    },

    onDeleteTask(id) {
      try {
        const task = deleteTask(id);

        if (state.editingTaskId === id) {
          state.editingTaskId = null;
        }

        ui.setFormMessage("");
        render(ui);
        ui.showToast(`Deleted "${task.title}".`, "success");
      } catch (error) {
        ui.showToast(error.message, "error");
      }
    },

    onStartEditTask(id) {
      state.editingTaskId = id;
      ui.setFormMessage("");
      render(ui);
    },

    onSaveEditTask(id, taskInput) {
      try {
        updateTask(id, taskInput);
        state.editingTaskId = null;
        ui.setFormMessage("");
        render(ui);
        ui.showToast("Task updated.", "success");
      } catch (error) {
        ui.showToast(error.message, "error");
      }
    },

    onCancelEditTask() {
      state.editingTaskId = null;
      ui.setFormMessage("");
      render(ui);
    },

    onFilterChange(filter) {
      state.activeFilter = isFilterValue(filter) ? filter : FILTERS.ALL;
      state.editingTaskId = null;
      render(ui);
    },

    onSortChange(sortOrder) {
      state.sortOrder = isSortOrder(sortOrder) ? sortOrder : SORT_ORDERS.SOONEST;
      render(ui);
    },
  });

  const didUpdateOnLoad = runDueCheck(ui);

  if (!didUpdateOnLoad) {
    render(ui);
  }

  ui.focusTitleInput();

  window.setInterval(() => {
    runDueCheck(ui);
  }, DUE_CHECK_INTERVAL_MS);
}

buildApp();
