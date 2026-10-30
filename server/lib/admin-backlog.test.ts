import { describe, expect, it } from 'vitest';
import { crossedBacklogLine } from './admin-backlog.js';

describe('crossedBacklogLine', () => {
  it('fires only on the item that reaches five', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 20].map((pending) => crossedBacklogLine(pending))).toEqual([
      false, false, false, false, true, false, false, false,
    ]);
  });
});
