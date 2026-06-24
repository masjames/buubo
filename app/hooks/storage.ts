const memory = new Map<string, string>();

function available() {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

export const storage = {
  getItem(key: string) {
    if (available()) return window.localStorage.getItem(key);
    return memory.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    if (available()) window.localStorage.setItem(key, value);
    else memory.set(key, value);
  },
  removeItem(key: string) {
    if (available()) window.localStorage.removeItem(key);
    else memory.delete(key);
  },
};

export function readJson<T>(key: string, fallback: T): T {
  try {
    const value = storage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  storage.setItem(key, JSON.stringify(value));
}

