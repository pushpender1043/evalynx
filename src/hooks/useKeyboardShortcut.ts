import { useEffect } from 'react';

export function useKeyboardShortcut(key: string, handler: () => void, requireMeta = false): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const metaMatch = !requireMeta || event.metaKey || event.ctrlKey;
      if (metaMatch && event.key.toLowerCase() === key.toLowerCase()) {
        event.preventDefault();
        handler();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, handler, requireMeta]);
}
