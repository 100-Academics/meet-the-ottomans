export const NON_SECRET_BATTLES = [
  'Battle of Legnica',
  'Battle of Ain Jalut',
  'Siege of Constantinople',
  'Battle of Agincourt',
  'Siege of Orléans',
  'Fall of Constantinople',
  'Battle of Ridaniya',
  'Battle of Pavia (Italian Wars)',
  'Siege of Vienna',
  'Battle of Yorktown',
  'Battle of Three Emperors',
  'Battle of Gettysburg',
  'Battle of Verdun',
  'Battle of Gallipoli',
  'Battle of Stalingrad',
  'Battle of Chosin Reservoir',
  'Fall of Saigon',
  'Operation Abirey-Halev',
  'Operation Anaconda',
  'Battle of Kyiv',
  'Operation Arnon',
] as const;

// Both names used by the dispatcher above — Siege marks both itself and the
// Fall variant complete (they're the same historical event with the same
// scene, listed separately in the UI).
const ALIASES: Record<string, string[]> = {
  'Siege of Constantinople': ['Siege of Constantinople', 'Fall of Constantinople'],
  'Fall of Constantinople': ['Siege of Constantinople', 'Fall of Constantinople'],
};

const STORAGE_KEY = 'meetTheOttomans.battleProgress';

function loadPersistedProgress(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persistProgress(names: Set<string>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...names]));
}

let completedBattleNames = loadPersistedProgress();

export function markBattleComplete(name: string): void {
  const validated = ALIASES[name] ?? [name];
  for (const alias of validated) {
    completedBattleNames.add(alias);
  }
  persistProgress(completedBattleNames);
}

export function isBattleComplete(name: string): boolean {
  const aliases = ALIASES[name] ?? [name];
  return aliases.some(alias => completedBattleNames.has(alias));
}

export function isAllNonSecretComplete(): boolean {
  return NON_SECRET_BATTLES.every(name => completedBattleNames.has(name));
}

export function getCompletedCount(): number {
  return NON_SECRET_BATTLES.filter(name => completedBattleNames.has(name)).length;
}

export function getTotalNonSecretCount(): number {
  return NON_SECRET_BATTLES.length;
}

export function resetBattleProgress(): void {
  completedBattleNames.clear();
  persistProgress(completedBattleNames);
}

export function markAllNonSecretComplete(): void {
  for (const name of NON_SECRET_BATTLES) {
    completedBattleNames.add(name);
  }
}
