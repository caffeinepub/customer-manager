import { useCallback, useState } from "react";

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (val: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (val: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next =
          typeof val === "function" ? (val as (p: T) => T)(prev) : val;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}
