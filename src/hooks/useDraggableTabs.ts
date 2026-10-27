import { useState, useEffect, useCallback } from 'react';

export interface DraggableTabHookResult<T extends string> {
  orderedTabs: T[];
  isLocked: boolean;
  toggleLock: () => void;
  setIsLocked: (locked: boolean) => void;
  resetOrder: () => void;
  isOrderCustomized: boolean;
  draggedTabId: T | null;
  dragOverTabId: T | null;
  getTabDragProps: (id: T) => {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    className: string;
  };
}

export function useDraggableTabs<T extends string>(
  storageKey: string,
  defaultTabs: T[],
  defaultLocked: boolean = true
): DraggableTabHookResult<T> {
  // Load order from storage or fallback to default
  const [orderedTabs, setOrderedTabs] = useState<T[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: T[] = JSON.parse(saved);
        // Ensure all valid default tabs exist and no invalid tabs
        const validSaved = parsed.filter((id) => defaultTabs.includes(id));
        const missing = defaultTabs.filter((id) => !validSaved.includes(id));
        if (validSaved.length > 0) {
          return [...validSaved, ...missing];
        }
      }
    } catch {
      // Fallback
    }
    return defaultTabs;
  });

  // Lock state: stored per bar
  const lockStorageKey = `${storageKey}_locked`;
  const [isLocked, setIsLockedState] = useState<boolean>(() => {
    try {
      const savedLock = localStorage.getItem(lockStorageKey);
      if (savedLock !== null) {
        return JSON.parse(savedLock);
      }
    } catch {
      // Fallback
    }
    return defaultLocked;
  });

  const [draggedTabId, setDraggedTabId] = useState<T | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<T | null>(null);

  // Sync order to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(orderedTabs));
    } catch {
      // Ignore quota errors
    }
  }, [storageKey, orderedTabs]);

  // Sync lock to localStorage
  const setIsLocked = useCallback(
    (locked: boolean) => {
      setIsLockedState(locked);
      try {
        localStorage.setItem(lockStorageKey, JSON.stringify(locked));
      } catch {
        // Ignore
      }
    },
    [lockStorageKey]
  );

  const toggleLock = useCallback(() => {
    setIsLocked(!isLocked);
  }, [isLocked, setIsLocked]);

  const resetOrder = useCallback(() => {
    setOrderedTabs([...defaultTabs]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  }, [defaultTabs, storageKey]);

  const isOrderCustomized =
    orderedTabs.length !== defaultTabs.length ||
    orderedTabs.some((id, idx) => id !== defaultTabs[idx]);

  const moveTab = useCallback((fromId: T, toId: T) => {
    if (fromId === toId) return;
    setOrderedTabs((prev) => {
      const current = [...prev];
      const fromIndex = current.indexOf(fromId);
      const toIndex = current.indexOf(toId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      current.splice(fromIndex, 1);
      current.splice(toIndex, 0, fromId);
      return current;
    });
  }, []);

  const getTabDragProps = useCallback(
    (id: T) => {
      const isDraggingThis = draggedTabId === id;
      const isOverThis = dragOverTabId === id && !isDraggingThis;

      return {
        draggable: !isLocked,
        onDragStart: (e: React.DragEvent) => {
          if (isLocked) {
            e.preventDefault();
            return;
          }
          setDraggedTabId(id);
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', id);
        },
        onDragOver: (e: React.DragEvent) => {
          if (isLocked) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (dragOverTabId !== id && draggedTabId !== id) {
            setDragOverTabId(id);
          }
        },
        onDragLeave: (e: React.DragEvent) => {
          if (isLocked) return;
          const related = e.relatedTarget as HTMLElement | null;
          if (related && (e.currentTarget as HTMLElement).contains(related)) {
            return;
          }
          if (dragOverTabId === id) {
            setDragOverTabId(null);
          }
        },
        onDrop: (e: React.DragEvent) => {
          if (isLocked) return;
          e.preventDefault();
          const sourceId = e.dataTransfer.getData('text/plain') as T;
          if (sourceId && sourceId !== id) {
            moveTab(sourceId, id);
          }
          setDraggedTabId(null);
          setDragOverTabId(null);
        },
        onDragEnd: () => {
          setDraggedTabId(null);
          setDragOverTabId(null);
        },
        className: [
          'transition-all select-none',
          !isLocked ? 'cursor-grab active:cursor-grabbing hover:border-amber-400/40' : '',
          isDraggingThis ? 'opacity-40 scale-95 border-dashed border-amber-400/80 shadow-inner' : '',
          isOverThis ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-[1.02] bg-amber-500/10' : '',
        ]
          .filter(Boolean)
          .join(' '),
      };
    },
    [isLocked, draggedTabId, dragOverTabId, moveTab]
  );

  return {
    orderedTabs,
    isLocked,
    toggleLock,
    setIsLocked,
    resetOrder,
    isOrderCustomized,
    draggedTabId,
    dragOverTabId,
    getTabDragProps,
  };
}
