import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithRouter } from '../../../test/router';

import ResultError from './ResultError';

const props = (reset: () => void) => ({
  error: new RangeError('음력 2050년 12월은 지원 범위 밖이다.'),
  reset,
  info: { componentStack: '' },
});

describe('ResultError', () => {
  it('되돌아갈 수단을 둘 다 낸다', async () => {
    // docs/03 11장. 폴백에는 되돌아갈 수단을 반드시 넣는다.
    const reset = vi.fn();
    await renderWithRouter(<ResultError {...props(reset)} />);

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '다시 시도' }));
    expect(reset).toHaveBeenCalledOnce();

    expect(screen.getByRole('link', { name: '처음부터 입력' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('무엇을 넣어서 이렇게 됐는지 적지 않는다', async () => {
    // 엔진의 RangeError 는 음력 날짜와 지원 범위를 문구에 담는다. 그것이 개인정보다.
    await renderWithRouter(<ResultError {...props(vi.fn())} />);

    expect(screen.queryByText(/2050/)).toBeNull();
    expect(document.body.textContent).not.toContain('음력');
  });
});
