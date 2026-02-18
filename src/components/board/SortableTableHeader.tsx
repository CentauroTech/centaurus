import { useState, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;
export type SortConfig = { key: string; direction: SortDirection };

interface SortableTableHeaderProps {
  label: string | React.ReactNode;
  sortKey: string;
  currentSort: SortConfig;
  onSort: (key: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export function SortableTableHeader({ label, sortKey, currentSort, onSort, className, children }: SortableTableHeaderProps) {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  return (
    <th
      className={cn(
        "px-2 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap select-none cursor-pointer hover:text-foreground transition-colors group/sort",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span className="flex items-center gap-1">{children || label}</span>
        <span className={cn("transition-opacity", isActive ? "opacity-100" : "opacity-0 group-hover/sort:opacity-40")}>
          {direction === 'asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : direction === 'desc' ? (
            <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-40" />
          )}
        </span>
      </div>
    </th>
  );
}

export function useSortableTable<T>() {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });

  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: '', direction: null };
    });
  }, []);

  const sortItems = useCallback((items: T[], accessor: (item: T, key: string) => unknown) => {
    if (!sortConfig.key || !sortConfig.direction) return items;
    return [...items].sort((a, b) => {
      const aVal = accessor(a, sortConfig.key);
      const bVal = accessor(b, sortConfig.key);
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'string' && typeof bVal === 'string'
        ? aVal.localeCompare(bVal, undefined, { sensitivity: 'base' })
        : aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [sortConfig]);

  return { sortConfig, handleSort, sortItems };
}
