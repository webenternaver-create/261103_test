/**
 * Main application script in pure JavaScript (No TSX)
 * 내 업무 플래너 (My Work Planner)
 */

import './style.css';
import { loadTasksFromStorage, saveTasksToStorage } from './storage.js';
import {
  getTodayLocalDateString,
  getTomorrowLocalDateString,
  formatKoreanDate,
  calculateDueDateStatus,
} from './date.js';

// --- State ---
let tasks = loadTasksFromStorage().tasks;
let storageError = null;
let toastTimeout = null;
let toastMessage = null;

let newTitle = '';
let newPriority = 'normal'; // default: normal (보통)
let newDueDate = '';
let formError = null;

let filters = {
  status: 'all',
  priority: 'all',
  search: '',
  sortBy: 'createdAt_desc',
};

let editingTask = null;
let editError = null;
let deletingTask = null;

// --- Helper Functions ---
function generateUniqueId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(msg) {
  toastMessage = msg;
  renderToast();
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastMessage = null;
    renderToast();
  }, 2500);
}

// --- Icons (Inline SVG) ---
const icons = {
  checkCircle: `<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
  checkIcon: `<svg class="w-4 h-4 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>`,
  hardDrive: `<svg class="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3zm0 5h16M8 16h.01M12 16h.01"></path></svg>`,
  listTodo: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>`,
  clock: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
  clockSm: `<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
  alertCircle: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
  alertCircleSm: `<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
  calendarSm: `<svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`,
  edit: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>`,
  trash: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`,
  plus: `<svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>`,
  penLine: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>`,
  search: `<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>`,
  checkSquare: `<svg class="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>`,
  arrowUp: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>`,
  close: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`,
};

// --- Actions ---

function handleAddTask(e) {
  if (e) e.preventDefault();

  const trimmed = newTitle.trim();
  if (!trimmed) {
    if (newTitle.length > 0) {
      formError = '공백만으로는 업무를 등록할 수 없습니다. 유효한 업무명을 1자 이상 입력해 주세요.';
    } else {
      formError = '업무명을 입력해 주세요. (공백 제외 1자 이상)';
    }
    renderApp();
    const inputEl = document.getElementById('task-title-input');
    if (inputEl) inputEl.focus();
    return;
  }

  formError = null;

  const newTask = {
    id: generateUniqueId(),
    title: trimmed,
    priority: newPriority,
    dueDate: newDueDate ? newDueDate : null,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  const nextTasks = [newTask, ...tasks];
  const res = saveTasksToStorage(nextTasks);
  if (!res.success) {
    storageError = res.errorMessage || '저장되지 않았습니다.';
    renderApp();
    return;
  }

  tasks = nextTasks;
  newTitle = '';
  newPriority = 'normal';
  newDueDate = '';
  storageError = null;
  showToast('새 업무가 등록되었습니다.');
  renderApp();
}

function handleToggleComplete(id) {
  const nextTasks = tasks.map((t) => {
    if (t.id === id) {
      return {
        ...t,
        completed: !t.completed,
        updatedAt: new Date().toISOString(),
      };
    }
    return t;
  });

  const res = saveTasksToStorage(nextTasks);
  if (!res.success) {
    storageError = res.errorMessage || '저장되지 않았습니다.';
    renderApp();
    return;
  }

  tasks = nextTasks;
  storageError = null;
  renderApp();
}

function handleSaveEdit(e) {
  if (e) e.preventDefault();
  if (!editingTask) return;

  const titleEl = document.getElementById('edit-title-input');
  const titleVal = titleEl ? titleEl.value.trim() : '';

  if (!titleVal) {
    editError = '업무명을 1자 이상 입력해 주세요 (공백 불가).';
    renderModals();
    return;
  }

  const updated = {
    ...editingTask,
    title: titleVal,
    updatedAt: new Date().toISOString(),
  };

  const nextTasks = tasks.map((t) => (t.id === updated.id ? updated : t));
  const res = saveTasksToStorage(nextTasks);
  if (!res.success) {
    storageError = res.errorMessage || '저장되지 않았습니다.';
    renderApp();
    return;
  }

  tasks = nextTasks;
  editingTask = null;
  editError = null;
  storageError = null;
  showToast('업무 내용이 수정되었습니다.');
  renderApp();
}

function handleConfirmDelete(id) {
  const nextTasks = tasks.filter((t) => t.id !== id);
  const res = saveTasksToStorage(nextTasks);
  if (!res.success) {
    storageError = res.errorMessage || '저장되지 않았습니다.';
    renderApp();
    return;
  }

  tasks = nextTasks;
  deletingTask = null;
  storageError = null;
  showToast('선택한 업무가 삭제되었습니다.');
  renderApp();
}

// --- Counts & Filtering ---

function computeCounts() {
  const todayStr = getTodayLocalDateString();
  let pending = 0;
  let dueToday = 0;
  let overdue = 0;
  let completed = 0;

  for (const t of tasks) {
    if (t.completed) {
      completed++;
    } else {
      pending++;
      if (t.dueDate === todayStr) {
        dueToday++;
      } else if (t.dueDate && t.dueDate < todayStr) {
        overdue++;
      }
    }
  }

  return {
    all: tasks.length,
    pending,
    dueToday,
    overdue,
    completed,
  };
}

function getFilteredTasks() {
  const todayStr = getTodayLocalDateString();
  let result = [...tasks];

  // Status
  if (filters.status === 'pending') {
    result = result.filter((t) => !t.completed);
  } else if (filters.status === 'dueToday') {
    result = result.filter((t) => !t.completed && t.dueDate === todayStr);
  } else if (filters.status === 'overdue') {
    result = result.filter((t) => !t.completed && Boolean(t.dueDate && t.dueDate < todayStr));
  } else if (filters.status === 'completed') {
    result = result.filter((t) => t.completed);
  }

  // Priority
  if (filters.priority !== 'all') {
    result = result.filter((t) => t.priority === filters.priority);
  }

  // Search
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter((t) => t.title.toLowerCase().includes(q));
  }

  // Sort
  const priorityWeight = { high: 3, normal: 2, low: 1 };
  result.sort((a, b) => {
    if (filters.sortBy === 'createdAt_desc') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (filters.sortBy === 'priority_desc') {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    if (filters.sortBy === 'title_asc') {
      return a.title.localeCompare(b.title, 'ko');
    }
    if (filters.sortBy === 'dueDate_asc') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    return 0;
  });

  return result;
}

// --- Render Methods ---

function renderApp() {
  const root = document.getElementById('root');
  if (!root) return;

  const counts = computeCounts();
  const displayedTasks = getFilteredTasks();
  const hasActiveFilters =
    filters.status !== 'all' || filters.priority !== 'all' || filters.search.trim() !== '';

  const todayStr = getTodayLocalDateString();
  const tomorrowStr = getTomorrowLocalDateString();

  root.innerHTML = `
    <div class="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <!-- Header -->
      <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto flex max-w-4xl flex-col gap-2.5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              ${icons.checkCircle}
            </div>
            <div>
              <h1 class="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                내 업무 플래너
              </h1>
              <p className="text-xs text-slate-500">
                개인 업무 및 마감 일정 관리
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2 text-xs text-slate-600 border border-slate-200">
            ${icons.hardDrive}
            <span>이 브라우저에 저장되며 다른 기기와 자동 동기화되지 않습니다</span>
          </div>
        </div>
      </header>

      <!-- Main Viewport -->
      <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-7 sm:px-6 sm:py-10">
        <!-- Storage Failure Alert -->
        ${
          storageError
            ? `
          <div role="alert" class="mb-6 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm">
            <div class="flex items-start gap-3">
              <span class="text-rose-600">${icons.alertCircle}</span>
              <div>
                <p class="text-sm font-bold text-rose-900">저장되지 않았습니다</p>
                <p class="mt-0.5 text-xs text-rose-700">${escapeHtml(storageError)}</p>
              </div>
            </div>
            <button id="dismiss-storage-error" class="rounded p-1 text-rose-600 hover:bg-rose-100 cursor-pointer">
              ${icons.close}
            </button>
          </div>
        `
            : ''
        }

        <!-- Stats Strip -->
        <section aria-label="업무 요약 통계" class="mb-8 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <div class="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              ${icons.listTodo}
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-500">전체 업무</p>
              <p class="text-xl font-bold text-slate-900 tabular-nums">${counts.all}건</p>
            </div>
          </div>

          <div class="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              ${icons.clock}
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-500">미완료</p>
              <p class="text-xl font-bold text-slate-900 tabular-nums">${counts.pending}건</p>
            </div>
          </div>

          <div class="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              counts.overdue > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'
            }">
              ${icons.alertCircle}
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-500">기한 지남</p>
              <p class="text-xl font-bold tabular-nums ${counts.overdue > 0 ? 'text-rose-600' : 'text-slate-900'}">
                ${counts.overdue}건
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              ${icons.checkCircle}
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-500">완료됨</p>
              <p class="text-xl font-bold text-slate-900 tabular-nums">${counts.completed}건</p>
            </div>
          </div>
        </section>

        <!-- SECTION 1: Input Area (Clearly Framed) -->
        <section aria-label="업무 등록 영역" class="mb-10">
          <div class="mb-2.5 flex items-center justify-between px-1">
            <span class="text-xs font-bold uppercase tracking-wider text-blue-600">
              작성 영역
            </span>
          </div>

          <div class="rounded-2xl border-2 border-blue-100 bg-white p-5 shadow-sm sm:p-7">
            <div class="mb-5 flex flex-col gap-1 border-b border-slate-100 pb-4">
              <div class="flex items-center gap-2">
                <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  ${icons.penLine}
                </div>
                <h2 class="text-base sm:text-lg font-bold text-slate-900">
                  새 업무 등록
                </h2>
              </div>
              <p class="text-xs text-slate-500 pl-9">
                할 일과 마감일, 우선순위를 지정하여 체계적으로 관리하세요.
              </p>
            </div>

            <form id="task-add-form" class="space-y-5">
              <!-- Title -->
              <div>
                <div class="flex items-center justify-between">
                  <label for="task-title-input" class="block text-xs font-bold text-slate-800">
                    업무명 <span class="text-rose-500">*</span>
                  </label>
                  <span class="text-[11px] text-slate-400">공백 제외 필수 입력</span>
                </div>
                <div class="mt-1.5">
                  <input
                    id="task-title-input"
                    type="text"
                    value="${escapeHtml(newTitle)}"
                    placeholder="예: 2분기 사업 결과 보고서 초안 작성"
                    class="w-full rounded-xl border px-4 py-3 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                      formError
                        ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-500/20'
                        : 'border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-600/20'
                    }"
                  />
                </div>
                ${
                  formError
                    ? `
                  <div class="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                    ${icons.alertCircleSm}
                    <span>${escapeHtml(formError)}</span>
                  </div>
                `
                    : ''
                }
              </div>

              <!-- Priority & Due Date -->
              <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                <!-- Priority: 높음 / 보통 / 낮음 -->
                <div>
                  <label class="block text-xs font-bold text-slate-800">
                    우선순위 <span class="font-normal text-slate-500">(기본값: 보통)</span>
                  </label>
                  <div class="mt-2 grid grid-cols-3 gap-2" role="radiogroup">
                    <button
                      type="button"
                      data-priority="high"
                      class="priority-select-btn flex h-11 items-center justify-center gap-1.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                        newPriority === 'high'
                          ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/30'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }"
                    >
                      <span class="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0"></span>
                      <span>높음</span>
                    </button>

                    <button
                      type="button"
                      data-priority="normal"
                      class="priority-select-btn flex h-11 items-center justify-center gap-1.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                        newPriority === 'normal'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/30'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }"
                    >
                      <span class="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0"></span>
                      <span>보통</span>
                    </button>

                    <button
                      type="button"
                      data-priority="low"
                      class="priority-select-btn flex h-11 items-center justify-center gap-1.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                        newPriority === 'low'
                          ? 'border-slate-500 bg-slate-100 text-slate-800 ring-2 ring-slate-400/30'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }"
                    >
                      <span class="h-2.5 w-2.5 rounded-full bg-slate-400 shrink-0"></span>
                      <span>낮음</span>
                    </button>
                  </div>
                </div>

                <!-- Due Date -->
                <div>
                  <div class="flex items-center justify-between">
                    <label for="task-due-date-input" class="block text-xs font-bold text-slate-800">
                      마감일 <span class="font-normal text-slate-500">(선택사항)</span>
                    </label>
                    ${
                      newDueDate
                        ? `
                      <button
                        type="button"
                        id="clear-due-date-btn"
                        class="text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2 cursor-pointer"
                      >
                        마감일 지우기
                      </button>
                    `
                        : ''
                    }
                  </div>

                  <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      id="task-due-date-input"
                      type="date"
                      value="${newDueDate}"
                      class="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-xs sm:text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                    <div class="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        id="btn-date-today"
                        class="flex-1 sm:flex-none h-11 px-3.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                          newDueDate === todayStr
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }"
                      >
                        오늘
                      </button>
                      <button
                        type="button"
                        id="btn-date-tomorrow"
                        class="flex-1 sm:flex-none h-11 px-3.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                          newDueDate === tomorrowStr
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }"
                      >
                        내일
                      </button>
                    </div>
                  </div>
                  <p class="mt-1.5 text-[11px] text-slate-500">
                    ${newDueDate ? '선택한 마감일이 적용됩니다.' : '미선택 시 ‘마감일 없음’으로 자동 표기됩니다.'}
                  </p>
                </div>
              </div>

              <!-- Submit Button -->
              <div class="pt-2 flex justify-end">
                <button
                  type="submit"
                  class="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:bg-blue-800 transition-colors cursor-pointer"
                >
                  ${icons.plus}
                  <span>업무 등록</span>
                </button>
              </div>
            </form>
          </div>
        </section>

        <!-- SECTION 2: Task List (Distinct Visual Boundary) -->
        <section aria-labelledby="task-list-heading" class="space-y-5 pt-2">
          <!-- Section Divider & Header -->
          <div class="border-t-2 border-slate-200 pt-6">
            <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <h2 id="task-list-heading" class="text-lg sm:text-xl font-bold text-slate-900">
                    업무 목록
                  </h2>
                  <span class="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 tabular-nums">
                    ${displayedTasks.length}건
                  </span>
                </div>
                <p class="mt-0.5 text-xs text-slate-500">
                  체크박스로 완료 상태를 변경하고 마감 일정을 확인하세요.
                </p>
              </div>
            </div>
          </div>

          <!-- Filter Bar -->
          ${
            tasks.length > 0 || hasActiveFilters
              ? `
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3.5">
              <!-- Status Tabs -->
              <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs -mx-1 px-1 scrollbar-none">
                <button
                  type="button"
                  data-filter-status="all"
                  class="filter-status-btn flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    filters.status === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }"
                >
                  <span>전체</span>
                  <span class="rounded-full px-1.5 py-0.2 text-[11px] tabular-nums font-bold ${
                    filters.status === 'all' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
                  }">${counts.all}</span>
                </button>

                <button
                  type="button"
                  data-filter-status="pending"
                  class="filter-status-btn flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    filters.status === 'pending'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }"
                >
                  <span>미완료</span>
                  <span class="rounded-full px-1.5 py-0.2 text-[11px] tabular-nums font-bold ${
                    filters.status === 'pending' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
                  }">${counts.pending}</span>
                </button>

                <button
                  type="button"
                  data-filter-status="dueToday"
                  class="filter-status-btn flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    filters.status === 'dueToday'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }"
                >
                  <span class="flex items-center gap-1">
                    <span class="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                    <span>오늘 마감</span>
                  </span>
                  <span class="rounded-full px-1.5 py-0.2 text-[11px] tabular-nums font-bold ${
                    filters.status === 'dueToday' ? 'bg-blue-700 text-blue-100' : 'bg-blue-50 text-blue-700'
                  }">${counts.dueToday}</span>
                </button>

                <button
                  type="button"
                  data-filter-status="overdue"
                  class="filter-status-btn flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    filters.status === 'overdue'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : counts.overdue > 0
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }"
                >
                  <span class="flex items-center gap-1">
                    <span class="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                    <span>기한 지남</span>
                  </span>
                  <span class="rounded-full px-1.5 py-0.2 text-[11px] tabular-nums font-bold ${
                    filters.status === 'overdue' ? 'bg-rose-700 text-rose-100' : 'bg-rose-100 text-rose-800'
                  }">${counts.overdue}</span>
                </button>

                <button
                  type="button"
                  data-filter-status="completed"
                  class="filter-status-btn flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    filters.status === 'completed'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }"
                >
                  <span>완료</span>
                  <span class="rounded-full px-1.5 py-0.2 text-[11px] tabular-nums font-bold ${
                    filters.status === 'completed' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
                  }">${counts.completed}</span>
                </button>
              </div>

              <!-- Search & Selects -->
              <div class="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div class="relative flex-1">
                  <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">${icons.search}</span>
                  <input
                    id="search-input"
                    type="text"
                    value="${escapeHtml(filters.search)}"
                    placeholder="업무명으로 검색..."
                    class="w-full h-10 rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <div class="flex-1 sm:flex-none flex items-center gap-1.5">
                    <label for="priority-filter-select" class="text-xs font-semibold text-slate-600 whitespace-nowrap">우선순위:</label>
                    <select
                      id="priority-filter-select"
                      class="w-full sm:w-auto h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 cursor-pointer"
                    >
                      <option value="all" ${filters.priority === 'all' ? 'selected' : ''}>모든 우선순위</option>
                      <option value="high" ${filters.priority === 'high' ? 'selected' : ''}>높음</option>
                      <option value="normal" ${filters.priority === 'normal' ? 'selected' : ''}>보통</option>
                      <option value="low" ${filters.priority === 'low' ? 'selected' : ''}>낮음</option>
                    </select>
                  </div>

                  <div class="flex-1 sm:flex-none flex items-center gap-1.5">
                    <label for="sort-select" class="text-xs font-semibold text-slate-600 whitespace-nowrap">정렬:</label>
                    <select
                      id="sort-select"
                      class="w-full sm:w-auto h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 cursor-pointer"
                    >
                      <option value="createdAt_desc" ${filters.sortBy === 'createdAt_desc' ? 'selected' : ''}>최신 등록순</option>
                      <option value="dueDate_asc" ${filters.sortBy === 'dueDate_asc' ? 'selected' : ''}>마감일 임박순</option>
                      <option value="priority_desc" ${filters.sortBy === 'priority_desc' ? 'selected' : ''}>우선순위 높은순</option>
                      <option value="title_asc" ${filters.sortBy === 'title_asc' ? 'selected' : ''}>가나다순</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          `
              : ''
          }

          <!-- Items or Empty State -->
          ${
            displayedTasks.length === 0
              ? renderEmptyState(hasActiveFilters && tasks.length > 0)
              : `
            <div class="space-y-3">
              ${displayedTasks.map((t) => renderTaskItem(t)).join('')}
            </div>
          `
          }
        </section>
      </main>

      <!-- Footer -->
      <footer class="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div class="mx-auto max-w-4xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p class="font-semibold text-slate-700">© 내 업무 플래너</p>
          <p class="text-slate-500">
            이 브라우저에 저장되며 다른 기기와 자동 동기화되지 않습니다
          </p>
        </div>
      </footer>

      <!-- Modals Container -->
      <div id="modal-container"></div>

      <!-- Toast Container -->
      <div id="toast-container"></div>
    </div>
  `;

  renderModals();
  renderToast();
  attachEventListeners();
}

function renderTaskItem(task) {
  const dateStatus = calculateDueDateStatus(task.dueDate, task.completed);

  const priorityConfigs = {
    high: { text: '높음', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200', dotClass: 'bg-rose-500' },
    normal: { text: '보통', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', dotClass: 'bg-blue-600' },
    low: { text: '낮음', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', dotClass: 'bg-slate-400' },
  };
  const pConfig = priorityConfigs[task.priority] || priorityConfigs.normal;

  return `
    <article
      class="group relative flex flex-col gap-3.5 rounded-xl border p-4.5 sm:p-5 transition-all ${
        task.completed
          ? 'border-slate-200 bg-slate-50/70'
          : dateStatus.isOverdue
          ? 'border-rose-200 bg-rose-50/30 shadow-xs'
          : dateStatus.isDueToday
          ? 'border-blue-200 bg-blue-50/30 shadow-xs'
          : 'border-slate-200 bg-white shadow-xs hover:border-slate-300'
      }"
    >
      <!-- Top Row: Checkbox + Priority + Status Badges -->
      <div class="flex flex-wrap items-center justify-between gap-2.5">
        <div class="flex flex-wrap items-center gap-2">
          <!-- Complete Checkbox -->
          <button
            type="button"
            data-action="toggle-complete"
            data-id="${task.id}"
            role="checkbox"
            aria-checked="${task.completed}"
            aria-label="'${escapeHtml(task.title)}' 완료 상태 전환"
            class="flex h-6 w-6 items-center justify-center rounded-md border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 shrink-0 ${
              task.completed
                ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50/30 text-transparent'
            }"
          >
            ${icons.checkIcon}
          </button>

          <!-- Priority: Color and Explicit Text -->
          <span class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold shrink-0 ${pConfig.badgeClass}">
            <span class="h-2 w-2 rounded-full shrink-0 ${pConfig.dotClass}"></span>
            <span>우선순위: ${pConfig.text}</span>
          </span>

          <!-- Overdue Badge -->
          ${
            dateStatus.isOverdue
              ? `
            <span class="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 shrink-0">
              ${icons.alertCircleSm}
              <span>기한 지남</span>
            </span>
          `
              : ''
          }

          <!-- Due Today Badge -->
          ${
            dateStatus.isDueToday
              ? `
            <span class="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 shrink-0">
              ${icons.clockSm}
              <span>오늘 마감</span>
            </span>
          `
              : ''
          }

          <!-- Completed Badge -->
          ${
            task.completed
              ? `
            <span class="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 shrink-0">
              완료됨
            </span>
          `
              : ''
          }

          <!-- D-Day Badge -->
          ${
            dateStatus.isUpcoming && dateStatus.diffDays !== null
              ? `
            <span class="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 tabular-nums shrink-0">
              D-${dateStatus.diffDays}
            </span>
          `
              : ''
          }
        </div>

        <!-- Desktop Action Buttons -->
        <div class="hidden sm:flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-action="open-edit"
            data-id="${task.id}"
            class="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer shadow-2xs"
            title="업무 수정"
          >
            <span class="text-slate-500">${icons.edit}</span>
            <span>수정</span>
          </button>

          <button
            type="button"
            data-action="open-delete"
            data-id="${task.id}"
            class="flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer shadow-2xs"
            title="업무 삭제"
          >
            <span class="text-rose-500">${icons.trash}</span>
            <span>삭제</span>
          </button>
        </div>
      </div>

      <!-- Title with Clear Strike-through on Completed -->
      <div class="min-w-0 flex-1">
        <h3
          class="text-base sm:text-lg break-words leading-relaxed transition-colors select-text ${
            task.completed
              ? 'text-slate-400 line-through decoration-slate-400 decoration-2 font-normal'
              : 'text-slate-900 font-bold tracking-tight'
          }"
        >
          ${escapeHtml(task.title)}
        </h3>
      </div>

      <!-- Footer Row: Due Date & Mobile Action Buttons -->
      <div class="flex flex-col gap-2.5 pt-2 border-t border-slate-100 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:pt-0">
        <!-- Date Display -->
        <div class="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          ${icons.calendarSm}
          <span class="text-slate-500">마감일:</span>
          <span class="font-semibold ${
            task.dueDate ? (dateStatus.isOverdue ? 'text-rose-700' : 'text-slate-800') : 'text-slate-500 font-normal'
          }">
            ${formatKoreanDate(task.dueDate)}
          </span>
        </div>

        <!-- Mobile Action Buttons -->
        <div class="flex sm:hidden items-center justify-end gap-2 pt-1">
          <button
            type="button"
            data-action="open-edit"
            data-id="${task.id}"
            class="flex-1 flex h-9.5 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 active:bg-slate-100 cursor-pointer shadow-2xs"
          >
            <span class="text-slate-500">${icons.edit}</span>
            <span>수정</span>
          </button>

          <button
            type="button"
            data-action="open-delete"
            data-id="${task.id}"
            class="flex-1 flex h-9.5 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/50 px-3 text-xs font-semibold text-rose-600 active:bg-rose-100 cursor-pointer shadow-2xs"
          >
            <span class="text-rose-600">${icons.trash}</span>
            <span>삭제</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderEmptyState(hasActiveFilters) {
  if (hasActiveFilters) {
    return `
      <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-xs">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          ${icons.checkSquare}
        </div>
        <h3 class="mt-3 text-sm font-semibold text-slate-900">
          조건에 일치하는 업무가 없습니다
        </h3>
        <p class="mt-1 text-xs text-slate-500 max-w-sm">
          선택한 필터나 검색어에 맞는 업무 항목이 없습니다. 다른 조건으로 검색해 보세요.
        </p>
        <button
          type="button"
          id="btn-reset-filters"
          class="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          필터 초기화
        </button>
      </div>
    `;
  }

  return `
    <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50/20 px-6 py-14 text-center">
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-xs border border-blue-100">
        ${icons.checkSquare}
      </div>

      <h3 class="mt-4 text-base font-semibold text-slate-900">
        등록된 업무가 없습니다
      </h3>

      <p class="mt-1.5 max-w-md text-xs sm:text-sm leading-relaxed text-slate-600">
        오늘 해야 할 일이나 중요한 마감 업무를 상단 입력창에 등록해 보세요.
      </p>

      <div class="mt-6 w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xs">
        <p class="text-xs font-semibold text-slate-800">
          📌 시작하기 팁
        </p>
        <ul class="mt-2 space-y-1.5 text-xs text-slate-600">
          <li class="flex items-start gap-1.5">
            <span class="text-blue-600 font-bold">1.</span>
            <span>업무명을 작성하고 마감일(선택사항)과 우선순위를 고르세요.</span>
          </li>
          <li class="flex items-start gap-1.5">
            <span class="text-blue-600 font-bold">2.</span>
            <span>오늘 마감 업무는 <span class="font-medium text-blue-600">‘오늘 마감’</span>, 지난 날짜의 미완료 업무는 <span class="font-medium text-rose-600">‘기한 지남’</span>으로 표시됩니다.</span>
          </li>
          <li class="flex items-start gap-1.5">
            <span class="text-blue-600 font-bold">3.</span>
            <span>입력한 모든 내용은 브라우저에 안전하게 즉시 저장됩니다.</span>
          </li>
        </ul>
      </div>

      <div class="mt-5 flex items-center gap-1.5 text-xs font-medium text-blue-700">
        <span class="animate-bounce">${icons.arrowUp}</span>
        <span>위 입력창에 첫 업무를 등록해 보세요</span>
      </div>
    </div>
  `;
}

function renderModals() {
  const container = document.getElementById('modal-container');
  if (!container) return;

  if (editingTask) {
    const todayStr = getTodayLocalDateString();
    const tomorrowStr = getTomorrowLocalDateString();

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" role="dialog" aria-modal="true">
        <div class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl transition-all">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <h2 class="text-base sm:text-lg font-bold text-slate-900">
              업무 수정
            </h2>
            <button type="button" id="close-edit-modal" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer">
              ${icons.close}
            </button>
          </div>

          <form id="edit-task-form" class="mt-5 space-y-5">
            <div>
              <label for="edit-title-input" class="block text-xs font-bold text-slate-800">
                업무명 <span class="text-rose-500">*</span>
              </label>
              <input
                id="edit-title-input"
                type="text"
                value="${escapeHtml(editingTask.title)}"
                class="mt-1.5 w-full rounded-xl border px-4 py-3 text-sm sm:text-base text-slate-900 focus:outline-none focus:ring-2 focus:border-blue-600 focus:ring-blue-600/20"
                autofocus
              />
              ${
                editError
                  ? `
                <div class="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
                  ${icons.alertCircleSm}
                  <span>${escapeHtml(editError)}</span>
                </div>
              `
                  : ''
              }
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-800">
                우선순위
              </label>
              <div class="mt-1.5 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  data-edit-priority="high"
                  class="edit-priority-btn flex h-11 items-center justify-center gap-1.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    editingTask.priority === 'high'
                      ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/30'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }"
                >
                  <span class="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0"></span>
                  <span>높음</span>
                </button>
                <button
                  type="button"
                  data-edit-priority="normal"
                  class="edit-priority-btn flex h-11 items-center justify-center gap-1.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    editingTask.priority === 'normal'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/30'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }"
                >
                  <span class="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0"></span>
                  <span>보통</span>
                </button>
                <button
                  type="button"
                  data-edit-priority="low"
                  class="edit-priority-btn flex h-11 items-center justify-center gap-1.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    editingTask.priority === 'low'
                      ? 'border-slate-500 bg-slate-100 text-slate-800 ring-2 ring-slate-400/30'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }"
                >
                  <span class="h-2.5 w-2.5 rounded-full bg-slate-400 shrink-0"></span>
                  <span>낮음</span>
                </button>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between">
                <label for="edit-due-date-input" class="block text-xs font-bold text-slate-800">
                  마감일 <span class="font-normal text-slate-500">(선택사항)</span>
                </label>
                ${
                  editingTask.dueDate
                    ? `
                  <button
                    type="button"
                    id="edit-clear-due-date"
                    class="text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2 cursor-pointer"
                  >
                    마감일 지우기
                  </button>
                `
                    : ''
                }
              </div>
              <div class="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  id="edit-due-date-input"
                  type="date"
                  value="${editingTask.dueDate || ''}"
                  class="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-xs sm:text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    id="edit-date-today"
                    class="flex-1 sm:flex-none h-11 px-3.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                      editingTask.dueDate === todayStr
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }"
                  >
                    오늘
                  </button>
                  <button
                    type="button"
                    id="edit-date-tomorrow"
                    class="flex-1 sm:flex-none h-11 px-3.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                      editingTask.dueDate === tomorrowStr
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }"
                  >
                    내일
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                id="cancel-edit-btn"
                class="flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                class="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-xs sm:text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer shadow-xs"
              >
                <span>변경사항 저장</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    return;
  }

  if (deletingTask) {
    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" role="dialog" aria-modal="true">
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all">
          <div class="flex items-start justify-between gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              ${icons.trash}
            </div>
            <button type="button" id="close-delete-modal" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer">
              ${icons.close}
            </button>
          </div>

          <div class="mt-3">
            <h2 class="text-base font-semibold text-slate-900">
              업무를 삭제하시겠습니까?
            </h2>
            <p class="mt-2 text-xs leading-relaxed text-slate-600">
              선택한 업무 <span class="font-semibold text-slate-900">‘${escapeHtml(deletingTask.title)}’</span> 항목만 삭제되며, 삭제 후에는 복구할 수 없습니다.
            </p>
          </div>

          <div class="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              id="cancel-delete-btn"
              class="flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              id="confirm-delete-btn"
              class="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-5 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer shadow-xs"
            >
              <span>선택 항목 삭제</span>
            </button>
          </div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
}

function renderToast() {
  const container = document.getElementById('toast-container');
  if (!container) return;

  if (toastMessage) {
    container.innerHTML = `
      <div
        role="status"
        class="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4.5 py-3 text-xs sm:text-sm font-semibold text-white shadow-xl"
      >
        <span class="text-emerald-400">${icons.checkIcon}</span>
        <span>${escapeHtml(toastMessage)}</span>
      </div>
    `;
  } else {
    container.innerHTML = '';
  }
}

// --- Event Listeners Attachment ---

function attachEventListeners() {
  // Dismiss storage error
  const dismissBtn = document.getElementById('dismiss-storage-error');
  if (dismissBtn) {
    dismissBtn.onclick = () => {
      storageError = null;
      renderApp();
    };
  }

  // Form title input
  const titleInput = document.getElementById('task-title-input');
  if (titleInput) {
    titleInput.oninput = (e) => {
      newTitle = e.target.value;
      if (formError) {
        formError = null;
      }
    };
  }

  // Form priority selection buttons
  const priorityBtns = document.querySelectorAll('.priority-select-btn');
  priorityBtns.forEach((btn) => {
    btn.onclick = () => {
      newPriority = btn.getAttribute('data-priority');
      renderApp();
    };
  });

  // Form due date input
  const dueDateInput = document.getElementById('task-due-date-input');
  if (dueDateInput) {
    dueDateInput.onchange = (e) => {
      newDueDate = e.target.value;
      renderApp();
    };
  }

  // Form clear due date button
  const clearDateBtn = document.getElementById('clear-due-date-btn');
  if (clearDateBtn) {
    clearDateBtn.onclick = () => {
      newDueDate = '';
      renderApp();
    };
  }

  // Form quick date buttons
  const dateTodayBtn = document.getElementById('btn-date-today');
  if (dateTodayBtn) {
    dateTodayBtn.onclick = () => {
      newDueDate = getTodayLocalDateString();
      renderApp();
    };
  }

  const dateTomorrowBtn = document.getElementById('btn-date-tomorrow');
  if (dateTomorrowBtn) {
    dateTomorrowBtn.onclick = () => {
      newDueDate = getTomorrowLocalDateString();
      renderApp();
    };
  }

  // Form submit
  const addForm = document.getElementById('task-add-form');
  if (addForm) {
    addForm.onsubmit = handleAddTask;
  }

  // Status Filter tabs
  const statusFilterBtns = document.querySelectorAll('.filter-status-btn');
  statusFilterBtns.forEach((btn) => {
    btn.onclick = () => {
      filters.status = btn.getAttribute('data-filter-status');
      renderApp();
    };
  });

  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.oninput = (e) => {
      filters.search = e.target.value;
      renderApp();
      // Keep focus on search input after re-render
      const el = document.getElementById('search-input');
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    };
  }

  // Priority filter dropdown
  const prioritySelect = document.getElementById('priority-filter-select');
  if (prioritySelect) {
    prioritySelect.onchange = (e) => {
      filters.priority = e.target.value;
      renderApp();
    };
  }

  // Sort dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.onchange = (e) => {
      filters.sortBy = e.target.value;
      renderApp();
    };
  }

  // Reset filters
  const resetFiltersBtn = document.getElementById('btn-reset-filters');
  if (resetFiltersBtn) {
    resetFiltersBtn.onclick = () => {
      filters = {
        status: 'all',
        priority: 'all',
        search: '',
        sortBy: 'createdAt_desc',
      };
      renderApp();
    };
  }

  // Task item actions delegation
  const completeButtons = document.querySelectorAll('[data-action="toggle-complete"]');
  completeButtons.forEach((btn) => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      if (id) handleToggleComplete(id);
    };
  });

  const editButtons = document.querySelectorAll('[data-action="open-edit"]');
  editButtons.forEach((btn) => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const target = tasks.find((t) => t.id === id);
      if (target) {
        editingTask = { ...target };
        editError = null;
        renderModals();
        attachModalListeners();
      }
    };
  });

  const deleteButtons = document.querySelectorAll('[data-action="open-delete"]');
  deleteButtons.forEach((btn) => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const target = tasks.find((t) => t.id === id);
      if (target) {
        deletingTask = target;
        renderModals();
        attachModalListeners();
      }
    };
  });
}

function attachModalListeners() {
  // Edit modal
  const closeEditBtn = document.getElementById('close-edit-modal');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const onCancelEdit = () => {
    editingTask = null;
    editError = null;
    renderModals();
  };
  if (closeEditBtn) closeEditBtn.onclick = onCancelEdit;
  if (cancelEditBtn) cancelEditBtn.onclick = onCancelEdit;

  const editForm = document.getElementById('edit-task-form');
  if (editForm) {
    editForm.onsubmit = handleSaveEdit;
  }

  const editPriorityBtns = document.querySelectorAll('.edit-priority-btn');
  editPriorityBtns.forEach((btn) => {
    btn.onclick = () => {
      if (editingTask) {
        editingTask.priority = btn.getAttribute('data-edit-priority');
        renderModals();
        attachModalListeners();
      }
    };
  });

  const editDueDateInput = document.getElementById('edit-due-date-input');
  if (editDueDateInput) {
    editDueDateInput.onchange = (e) => {
      if (editingTask) {
        editingTask.dueDate = e.target.value || null;
        renderModals();
        attachModalListeners();
      }
    };
  }

  const editClearDate = document.getElementById('edit-clear-due-date');
  if (editClearDate) {
    editClearDate.onclick = () => {
      if (editingTask) {
        editingTask.dueDate = null;
        renderModals();
        attachModalListeners();
      }
    };
  }

  const editDateToday = document.getElementById('edit-date-today');
  if (editDateToday) {
    editDateToday.onclick = () => {
      if (editingTask) {
        editingTask.dueDate = getTodayLocalDateString();
        renderModals();
        attachModalListeners();
      }
    };
  }

  const editDateTomorrow = document.getElementById('edit-date-tomorrow');
  if (editDateTomorrow) {
    editDateTomorrow.onclick = () => {
      if (editingTask) {
        editingTask.dueDate = getTomorrowLocalDateString();
        renderModals();
        attachModalListeners();
      }
    };
  }

  // Delete modal
  const closeDeleteBtn = document.getElementById('close-delete-modal');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  const onCancelDelete = () => {
    deletingTask = null;
    renderModals();
  };
  if (closeDeleteBtn) closeDeleteBtn.onclick = onCancelDelete;
  if (cancelDeleteBtn) cancelDeleteBtn.onclick = onCancelDelete;

  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.onclick = () => {
      if (deletingTask) {
        handleConfirmDelete(deletingTask.id);
      }
    };
  }
}

// Initial render
document.addEventListener('DOMContentLoaded', () => {
  renderApp();
});
renderApp();
