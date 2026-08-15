import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Header from './Header';
import Shell from './Shell';

describe('Shell', () => {
  it('자식을 그대로 담고 상단 바를 스스로 만들지 않는다', () => {
    render(
      <Shell>
        <main>결과</main>
      </Shell>,
    );

    expect(screen.getByRole('main')).toHaveTextContent('결과');
    expect(screen.queryByRole('banner')).toBeNull();
  });

  it('상단 바는 자식으로 조립한다', () => {
    render(
      <Shell>
        <Header />
        <main>결과</main>
      </Shell>,
    );

    expect(screen.getByRole('banner')).toHaveTextContent('AI 사주해석');
  });
});
