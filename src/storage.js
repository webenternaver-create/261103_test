/**
 * LocalStorage persistence module in pure JavaScript with error detection
 */

export const STORAGE_KEY = 'my_work_planner_tasks_v1';

export function loadTasksFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { tasks: [] };
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { tasks: [] };
    }
    return { tasks: parsed };
  } catch (err) {
    console.error('Failed to load tasks from localStorage', err);
    return {
      tasks: [],
      error: '저장된 업무 목록을 불러오는 중 오류가 발생했습니다.',
    };
  }
}

export function saveTasksToStorage(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return { success: true };
  } catch (err) {
    console.error('Failed to save tasks to localStorage', err);
    return {
      success: false,
      errorMessage: '저장되지 않았습니다. 브라우저 저장 공간 또는 권한을 확인해 주세요.',
    };
  }
}
