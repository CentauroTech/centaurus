import { ColumnConfig } from '@/types/board';

// Sticky column IDs - these are always pinned left
const STICKY_COLUMN_IDS = ['isPrivate', 'name', 'workOrderNumber'];

// Base left offset after checkbox (24px, left-0) + drag handle (24px, left-6) = 48px
const BASE_LEFT = 48;

// Column widths used for sticky offset calculation
// Privacy: w-8 = 32px, Name: w-96 = 384px
const COLUMN_WIDTHS: Record<string, number> = {
  isPrivate: 32,
  name: 384,
  workOrderNumber: 0, // last sticky, width doesn't matter for offset calc
};

export function isStickyColumn(columnId: string): boolean {
  return STICKY_COLUMN_IDS.includes(columnId);
}

/**
 * Returns the `left` offset in px for a sticky column, based on which
 * sticky columns are actually visible (e.g. Privacy is hidden for non-God).
 */
export function getStickyLeftOffset(
  columnId: string,
  visibleColumns: ColumnConfig[]
): number | undefined {
  if (!isStickyColumn(columnId)) return undefined;

  // Compute offset by summing widths of all sticky columns before this one
  let offset = BASE_LEFT;
  for (const col of visibleColumns) {
    if (!isStickyColumn(col.id)) continue;
    if (col.id === columnId) break;
    offset += COLUMN_WIDTHS[col.id] || 0;
  }
  return offset;
}

/**
 * Returns the index of the last sticky column in the visible columns array.
 * Used to apply the right border/shadow separator.
 */
export function getLastStickyIndex(visibleColumns: ColumnConfig[]): number {
  let lastIdx = -1;
  visibleColumns.forEach((col, idx) => {
    if (isStickyColumn(col.id)) lastIdx = idx;
  });
  return lastIdx;
}
