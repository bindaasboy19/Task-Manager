import { REPEAT_PATTERNS } from "./taskService.js";
import { TASK_STATUSES, getTaskStatus } from "./filter.js";

const EMPTY_STATE_COPY = {
  all: {
    title: "No tasks yet",
    description: "Add your first scheduled task to start building momentum.",
  },
  pending: {
    title: "No pending tasks",
    description: "There is nothing waiting in the future right now.",
  },
  incomplete: {
    title: "No incomplete tasks",
    description: "Nice work. You do not have any missed deadlines at the moment.",
  },
  completed: {
    title: "No completed tasks",
    description: "Finished tasks will show up here once you check them off.",
  },
};

const repeatLabels = {
  [REPEAT_PATTERNS.NONE]: "One time",
  [REPEAT_PATTERNS.DAILY]: "Every day",
  [REPEAT_PATTERNS.WEEKLY]: "Every week",
  [REPEAT_PATTERNS.MONTHLY]: "Every month",
};

const statusCopy = {
  [TASK_STATUSES.PENDING]: {
    label: "Pending",
    className: "task-pill--pending",
  },
  [TASK_STATUSES.INCOMPLETE]: {
    label: "Incomplete",
    className: "task-pill--incomplete",
  },
  [TASK_STATUSES.COMPLETED]: {
    label: "Completed",
    className: "task-pill--completed",
  },
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function formatTaskCount(count) {
  if (count === 0) {
    return "No tasks yet";
  }

  return `${count} task${count === 1 ? "" : "s"} scheduled`;
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function toLocalDateValue(dateLike) {
  const date = new Date(dateLike);

  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

function toLocalTimeValue(dateLike) {
  const date = new Date(dateLike);

  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function getDefaultSchedule() {
  const nextHour = new Date();
  nextHour.setMinutes(nextHour.getMinutes() + 60);
  nextHour.setSeconds(0, 0);

  const remainder = nextHour.getMinutes() % 15;

  if (remainder !== 0) {
    nextHour.setMinutes(nextHour.getMinutes() + (15 - remainder));
  }

  return {
    dueDate: toLocalDateValue(nextHour),
    dueTime: toLocalTimeValue(nextHour),
  };
}

function formatDateTime(dateLike) {
  return dateTimeFormatter.format(new Date(dateLike));
}

function formatRepeatLabel(repeat) {
  return repeatLabels[repeat] || repeatLabels[REPEAT_PATTERNS.NONE];
}

function formatDetails(details) {
  return escapeHtml(details).replace(/\n/g, "<br>");
}

function createRepeatOptionsMarkup(selectedRepeat) {
  return Object.entries(repeatLabels)
    .map(([value, label]) => `<option value="${value}" ${value === selectedRepeat ? "selected" : ""}>${label}</option>`)
    .join("");
}

function createViewMarkup(task, status) {
  const safeTitle = escapeHtml(task.title);
  const safeDetails = task.details ? formatDetails(task.details) : "";
  const statusBadge = statusCopy[status];

  return `
    <div class="task-item__header">
      <p class="task-item__title ${task.completed ? "task-item__title--completed" : ""}">${safeTitle}</p>
      <div class="task-item__pills">
        <span class="task-pill ${statusBadge.className}">${statusBadge.label}</span>
        ${
          task.repeat !== REPEAT_PATTERNS.NONE
            ? `<span class="task-pill task-pill--repeat">${escapeHtml(formatRepeatLabel(task.repeat))}</span>`
            : ""
        }
      </div>
    </div>

    ${safeDetails ? `<p class="task-item__details">${safeDetails}</p>` : ""}

    <div class="task-item__meta-grid">
      <p class="task-item__meta">
        <span>Due</span>
        <strong>${escapeHtml(formatDateTime(task.dueAt))}</strong>
      </p>
      <p class="task-item__meta">
        <span>Created</span>
        <strong>${escapeHtml(formatDateTime(task.createdAt))}</strong>
      </p>
      <p class="task-item__meta ${status === TASK_STATUSES.INCOMPLETE ? "task-item__meta--alert" : ""}">
        <span>${status === TASK_STATUSES.INCOMPLETE ? "Incomplete since" : "Repeat"}</span>
        <strong>${escapeHtml(status === TASK_STATUSES.INCOMPLETE ? formatDateTime(task.overdueAt || task.dueAt) : formatRepeatLabel(task.repeat))}</strong>
      </p>
    </div>
  `;
}

function createEditMarkup(task) {
  const safeTitle = escapeHtml(task.title);
  const safeDetails = escapeHtml(task.details);

  return `
    <div class="task-item__edit">
      <div class="task-item__edit-grid">
        <label class="task-edit-field task-edit-field--wide">
          <span>Task name</span>
          <input
            class="field-control"
            type="text"
            maxlength="120"
            value="${safeTitle}"
            data-role="edit-title"
            data-id="${task.id}"
          >
        </label>

        <label class="task-edit-field task-edit-field--wide">
          <span>Task details</span>
          <textarea
            class="field-control"
            rows="4"
            maxlength="400"
            data-role="edit-details"
            data-id="${task.id}"
          >${safeDetails}</textarea>
        </label>

        <label class="task-edit-field">
          <span>Date</span>
          <input
            class="field-control"
            type="date"
            value="${toLocalDateValue(task.dueAt)}"
            data-role="edit-date"
            data-id="${task.id}"
          >
        </label>

        <label class="task-edit-field">
          <span>Time</span>
          <input
            class="field-control"
            type="time"
            value="${toLocalTimeValue(task.dueAt)}"
            data-role="edit-time"
            data-id="${task.id}"
          >
        </label>

        <label class="task-edit-field">
          <span>Repeat reminder</span>
          <select class="field-control" data-role="edit-repeat" data-id="${task.id}">
            ${createRepeatOptionsMarkup(task.repeat)}
          </select>
        </label>
      </div>

      <div class="task-item__edit-actions">
        <button class="task-action task-action--ghost" type="button" data-action="save-edit" data-id="${task.id}">
          Save
        </button>
        <button class="task-action" type="button" data-action="cancel-edit" data-id="${task.id}">
          Cancel
        </button>
      </div>
    </div>
  `;
}

function createTaskMarkup(task, isEditing, referenceTime) {
  const status = getTaskStatus(task, referenceTime);

  return `
    <li
      class="task-item ${status === TASK_STATUSES.COMPLETED ? "task-item--completed" : ""} ${status === TASK_STATUSES.INCOMPLETE ? "task-item--incomplete" : ""} ${isEditing ? "task-item--editing" : ""}"
      data-task-id="${task.id}"
    >
      <div class="task-item__main">
        <input
          class="task-item__toggle"
          type="checkbox"
          data-role="toggle"
          data-id="${task.id}"
          aria-label="${task.completed ? `${escapeHtml(task.title)} is completed` : `Mark ${escapeHtml(task.title)} as completed`}"
          ${task.completed ? "checked" : ""}
          ${task.completed ? "disabled" : ""}
        >

        <div class="task-item__content">
          ${isEditing ? createEditMarkup(task) : createViewMarkup(task, status)}
        </div>
      </div>

      <div class="task-item__actions">
        ${
          isEditing
            ? ""
            : `
              <button class="task-action task-action--ghost" type="button" data-action="edit" data-id="${task.id}">
                Edit
              </button>
            `
        }
        <button class="task-action task-action--delete" type="button" data-action="delete" data-id="${task.id}">
          Delete
        </button>
      </div>
    </li>
  `;
}

export function createUI(handlers) {
  const elements = {
    form: document.querySelector("#task-form"),
    titleInput: document.querySelector("#task-title"),
    detailsInput: document.querySelector("#task-details"),
    dateInput: document.querySelector("#task-date"),
    timeInput: document.querySelector("#task-time"),
    repeatSelect: document.querySelector("#task-repeat"),
    formMessage: document.querySelector("#form-message"),
    filterButtons: Array.from(document.querySelectorAll("[data-filter]")),
    sortSelect: document.querySelector("#sort-select"),
    taskList: document.querySelector("#task-list"),
    emptyState: document.querySelector("#empty-state"),
    taskCounter: document.querySelector("#task-counter"),
    taskBreakdown: document.querySelector("#task-breakdown"),
    statTotal: document.querySelector("#stat-total"),
    statCompleted: document.querySelector("#stat-completed"),
    statIncomplete: document.querySelector("#stat-incomplete"),
    toastRegion: document.querySelector("#toast-region"),
  };

  function getFormPayload() {
    return {
      title: elements.titleInput.value,
      details: elements.detailsInput.value,
      dueDate: elements.dateInput.value,
      dueTime: elements.timeInput.value,
      repeat: elements.repeatSelect.value,
    };
  }

  function getEditPayload(taskElement) {
    return {
      title: taskElement.querySelector('[data-role="edit-title"]')?.value ?? "",
      details: taskElement.querySelector('[data-role="edit-details"]')?.value ?? "",
      dueDate: taskElement.querySelector('[data-role="edit-date"]')?.value ?? "",
      dueTime: taskElement.querySelector('[data-role="edit-time"]')?.value ?? "",
      repeat: taskElement.querySelector('[data-role="edit-repeat"]')?.value ?? REPEAT_PATTERNS.NONE,
    };
  }

  function bindEvents() {
    elements.form.addEventListener("submit", (event) => {
      event.preventDefault();
      handlers.onAddTask(getFormPayload());
    });

    elements.filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        handlers.onFilterChange(button.dataset.filter);
      });
    });

    elements.sortSelect.addEventListener("change", (event) => {
      handlers.onSortChange(event.target.value);
    });

    elements.taskList.addEventListener("change", (event) => {
      const checkbox = event.target.closest('[data-role="toggle"]');

      if (!checkbox) {
        return;
      }

      handlers.onToggleTask(checkbox.dataset.id);
    });

    elements.taskList.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-action]");

      if (!actionButton) {
        return;
      }

      const { action, id } = actionButton.dataset;
      const parentTask = actionButton.closest("[data-task-id]");

      if (action === "edit") {
        handlers.onStartEditTask(id);
        return;
      }

      if (action === "delete") {
        handlers.onDeleteTask(id);
        return;
      }

      if (action === "save-edit") {
        handlers.onSaveEditTask(id, getEditPayload(parentTask));
        return;
      }

      if (action === "cancel-edit") {
        handlers.onCancelEditTask();
      }
    });

    elements.taskList.addEventListener("keydown", (event) => {
      const taskElement = event.target.closest("[data-task-id]");

      if (!taskElement) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        handlers.onCancelEditTask();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        handlers.onSaveEditTask(taskElement.dataset.taskId, getEditPayload(taskElement));
      }
    });
  }

  function updateEmptyState(tasks, activeFilter) {
    const copy = EMPTY_STATE_COPY[activeFilter] || EMPTY_STATE_COPY.all;
    const hasTasks = tasks.length > 0;

    elements.taskList.hidden = !hasTasks;
    elements.emptyState.hidden = hasTasks;

    if (!hasTasks) {
      elements.emptyState.innerHTML = `
        <h2>${copy.title}</h2>
        <p>${copy.description}</p>
      `;
    }
  }

  function updateCounts(counts) {
    elements.taskCounter.textContent = formatTaskCount(counts.total);
    elements.taskBreakdown.textContent = `${counts.completed} completed • ${counts.pending} pending • ${counts.incomplete} incomplete`;
    elements.statTotal.textContent = String(counts.total);
    elements.statCompleted.textContent = String(counts.completed);
    elements.statIncomplete.textContent = String(counts.incomplete);
  }

  function updateFilterButtons(activeFilter) {
    elements.filterButtons.forEach((button) => {
      const isActive = button.dataset.filter === activeFilter;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
  }

  function renderTaskList(tasks, editingTaskId, referenceTime) {
    elements.taskList.innerHTML = tasks
      .map((task) => createTaskMarkup(task, task.id === editingTaskId, referenceTime))
      .join("");

    if (!editingTaskId) {
      return;
    }

    requestAnimationFrame(() => {
      const editInput = elements.taskList.querySelector(`[data-role="edit-title"][data-id="${editingTaskId}"]`);

      if (editInput) {
        editInput.focus();
        editInput.select();
      }
    });
  }

  function setFormMessage(message = "", tone = "neutral") {
    elements.formMessage.textContent = message;
    elements.formMessage.classList.remove("form-message--error", "form-message--success");

    if (!message) {
      return;
    }

    if (tone === "error") {
      elements.formMessage.classList.add("form-message--error");
    }

    if (tone === "success") {
      elements.formMessage.classList.add("form-message--success");
    }
  }

  function resetForm() {
    const defaultSchedule = getDefaultSchedule();

    elements.form.reset();
    elements.titleInput.value = "";
    elements.detailsInput.value = "";
    elements.dateInput.value = defaultSchedule.dueDate;
    elements.timeInput.value = defaultSchedule.dueTime;
    elements.repeatSelect.value = REPEAT_PATTERNS.NONE;
  }

  function focusTitleInput() {
    elements.titleInput.focus();
  }

  function showToast(message, tone = "neutral") {
    const toast = document.createElement("div");
    toast.className = `toast ${tone === "success" ? "toast--success" : ""} ${tone === "error" ? "toast--error" : ""}`.trim();
    toast.textContent = message;

    elements.toastRegion.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("toast--visible");
    });

    window.setTimeout(() => {
      toast.classList.remove("toast--visible");

      window.setTimeout(() => {
        toast.remove();
      }, 220);
    }, 2800);
  }

  function render({ tasks, counts, activeFilter, sortOrder, editingTaskId, referenceTime }) {
    updateCounts(counts);
    updateFilterButtons(activeFilter);
    elements.sortSelect.value = sortOrder;
    renderTaskList(tasks, editingTaskId, referenceTime);
    updateEmptyState(tasks, activeFilter);
  }

  resetForm();
  bindEvents();

  return {
    focusTitleInput,
    render,
    resetForm,
    setFormMessage,
    showToast,
  };
}
