/**
 * Date utility functions in pure JavaScript respecting the user's local timezone
 */

export function getTodayLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTomorrowLocalDateString() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

export function formatKoreanDate(dateStr) {
  if (!dateStr) return '마감일 없음';

  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  const date = new Date(year, month - 1, day);
  const dayName = WEEKDAYS_KO[date.getDay()];

  return `${year}. ${String(month).padStart(2, '0')}. ${String(day).padStart(2, '0')} (${dayName})`;
}

/**
 * Calculates due date status against the user's local today date.
 * Rules:
 * 1. Completed tasks are NEVER overdue ('기한 지남' 제외).
 * 2. Today is NEVER overdue ('오늘을 기한 지남으로 표시하지 마').
 * 3. Today's incomplete tasks show '오늘 마감'.
 * 4. Incomplete tasks before today show '기한 지남'.
 * 5. If no dueDate, shows '마감일 없음'.
 */
export function calculateDueDateStatus(dueDate, completed) {
  if (!dueDate) {
    return {
      isOverdue: false,
      isDueToday: false,
      isUpcoming: false,
      hasDueDate: false,
      badgeLabel: '마감일 없음',
      diffDays: null,
    };
  }

  // If completed, exclude from overdue alerts
  if (completed) {
    return {
      isOverdue: false,
      isDueToday: false,
      isUpcoming: false,
      hasDueDate: true,
      badgeLabel: '완료됨',
      diffDays: null,
    };
  }

  const todayStr = getTodayLocalDateString();

  if (dueDate === todayStr) {
    return {
      isOverdue: false,
      isDueToday: true,
      isUpcoming: false,
      hasDueDate: true,
      badgeLabel: '오늘 마감',
      diffDays: 0,
    };
  }

  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const [dY, dM, dD] = dueDate.split('-').map(Number);

  const todayMidnight = new Date(tY, tM - 1, tD).getTime();
  const dueMidnight = new Date(dY, dM - 1, dD).getTime();
  const diffDays = Math.round((dueMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      isOverdue: true,
      isDueToday: false,
      isUpcoming: false,
      hasDueDate: true,
      badgeLabel: '기한 지남',
      diffDays,
    };
  }

  return {
    isOverdue: false,
    isDueToday: false,
    isUpcoming: true,
    hasDueDate: true,
    badgeLabel: `D-${diffDays}`,
    diffDays,
  };
}
