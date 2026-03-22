import { describe, it, expect } from 'vitest';
import { validateSplitTotal } from './split_utils';

describe('validateSplitTotal', () => {
  it('passes when splits equal order total', () => {
    expect(() =>
      validateSplitTotal(
        [{ amount: 1500 }, { amount: 500 }],
        2000
      )
    ).not.toThrow();
  });

  it('throws when splits do not equal order total', () => {
    expect(() =>
      validateSplitTotal(
        [{ amount: 1000 }, { amount: 500 }],
        2000
      )
    ).toThrow('Split total (1500) does not equal order total (2000)');
  });

  it('throws when splits array is empty', () => {
    expect(() => validateSplitTotal([], 2000)).toThrow(
      'Splits cannot be empty'
    );
  });

  it('passes with a single split equal to total', () => {
    expect(() =>
      validateSplitTotal([{ amount: 3000 }], 3000)
    ).not.toThrow();
  });
});
