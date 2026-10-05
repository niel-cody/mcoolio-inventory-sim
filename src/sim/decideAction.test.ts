// Port of decide_action_test.go.
import { describe, expect, it } from 'vitest';
import { DepletionEngine } from './depletion';
import type { DepletionAction, DepletionState } from './types';

const reserved: DepletionState = { state: 'RESERVED', lastEventVersion: 1 };
const committed: DepletionState = { state: 'COMMITTED', lastEventVersion: 2 };
const released: DepletionState = { state: 'RELEASED', lastEventVersion: 3 };

const cases: [string, string, boolean, string, DepletionState | undefined, number, DepletionAction][] = [
  ['training order', 'created', true, '', undefined, 1, 'IGNORE'],
  ['stale event', 'created', false, '', reserved, 0, 'IGNORE'],
  ['duplicate event same version', 'created', false, '', reserved, 1, 'IGNORE'],
  ['draft no state', 'draft', false, '', undefined, 1, 'IGNORE'],
  ['scheduled reserved', 'scheduled', false, '', reserved, 2, 'IGNORE'],
  ['created nil state', 'created', false, '', undefined, 1, 'RESERVE'],
  ['accepted nil state', 'accepted', false, '', undefined, 1, 'RESERVE'],
  ['created already reserved', 'created', false, '', reserved, 2, 'IGNORE'],
  ['complete nil state', 'complete', false, '', undefined, 1, 'COMMIT'],
  ['complete reserved', 'complete', false, '', reserved, 2, 'COMMIT'],
  ['complete already committed', 'complete', false, '', committed, 3, 'IGNORE'],
  ['cancelled reserved', 'cancelled', false, '', reserved, 2, 'RELEASE'],
  ['cancelled committed', 'cancelled', false, '', committed, 3, 'REVERSE'],
  ['cancelled nil', 'cancelled', false, '', undefined, 1, 'IGNORE'],
  ['refunded committed', 'refunded', false, '', committed, 3, 'REVERSE'],
  ['refundOf committed', 'complete', false, 'ord_original', committed, 3, 'REVERSE'],
  ['cancelled already released', 'cancelled', false, '', released, 4, 'IGNORE'],
  ['complete same version as reserved', 'complete', false, '', reserved, 1, 'COMMIT'],
  ['cancelled same version as reserved', 'cancelled', false, '', reserved, 1, 'RELEASE'],
  ['refunded same version as committed', 'refunded', false, '', committed, 2, 'REVERSE'],
];

describe('decideAction parity', () => {
  for (const [name, status, training, refundOf, state, version, want] of cases) {
    it(name, () => {
      expect(DepletionEngine.decideAction(status, training, refundOf, state, version)).toBe(want);
    });
  }
});
