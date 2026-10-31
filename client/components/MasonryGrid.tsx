import { Fragment, useEffect, useState, type ReactNode } from 'react';

// Tailwind's min-width breakpoints, so column counts match the old `columns-*` classes.
const BREAKPOINTS = [
  ['sm', 640],
  ['md', 768],
  ['lg', 1024],
  ['xl', 1280],
  ['2xl', 1536],
] as const;

// A few works share the whole width between them; a single one never takes it all.
const FEWEST_SHARES = 3;

type Breakpoint = (typeof BREAKPOINTS)[number][0];
export type MasonryColumns = { base: number } & Partial<Record<Breakpoint, number>>;

function columnsForWidth(columns: MasonryColumns, width: number) {
  let count = columns.base;
  for (const [name, minWidth] of BREAKPOINTS) {
    const value = columns[name];
    if (value && width >= minWidth) count = value;
  }
  return count;
}

function useColumnCount(columns: MasonryColumns) {
  const [count, setCount] = useState(() =>
    typeof window === 'undefined' ? columns.base : columnsForWidth(columns, window.innerWidth)
  );

  useEffect(() => {
    const update = () => setCount(columnsForWidth(columns, window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [columns]);

  return count;
}

interface Props<T> {
  items: T[];
  /** Pass a module-level constant so the resize listener is not re-created. */
  columns: MasonryColumns;
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}

/**
 * Masonry built from independent flex columns. Items are dealt round-robin, so
 * they read left to right and never move once placed.
 *
 * CSS `columns` cannot be used here: Safari re-balances them when a card's hover
 * effect changes, which pushed the footer down or teleported cards to another
 * column. Separate columns keep hover effects from affecting the layout at all.
 */
export default function MasonryGrid<T>({ items, columns, getKey, renderItem, className = '' }: Props<T>) {
  const count = useColumnCount(columns);
  const shares = Math.min(count, Math.max(items.length, FEWEST_SHARES));
  const grid = Array.from({ length: Math.min(shares, Math.max(items.length, 1)) }, () => [] as { item: T; index: number }[]);
  items.forEach((item, index) => grid[index % grid.length].push({ item, index }));
  const columnWidth = `calc((100% - ${shares - 1}rem) / ${shares})`;

  return (
    <div className={`flex items-start justify-center gap-4 ${className}`}>
      {grid.map((column, columnIndex) => (
        <div key={columnIndex} className="flex min-w-0 flex-col" style={{ flex: `0 0 ${columnWidth}` }}>
          {column.map(({ item, index }) => (
            <Fragment key={getKey(item)}>{renderItem(item, index)}</Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
