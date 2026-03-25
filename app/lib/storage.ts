import { Routine } from '../types';

const KEY = 'hiit-routines';

export function getRoutines(): Routine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRoutine(routine: Routine): void {
  const routines = getRoutines();
  const idx = routines.findIndex(r => r.id === routine.id);
  if (idx >= 0) {
    routines[idx] = routine;
  } else {
    routines.push(routine);
  }
  localStorage.setItem(KEY, JSON.stringify(routines));
}

export function deleteRoutine(id: string): void {
  const routines = getRoutines().filter(r => r.id !== id);
  localStorage.setItem(KEY, JSON.stringify(routines));
}

export function getRoutine(id: string): Routine | null {
  return getRoutines().find(r => r.id === id) ?? null;
}
