import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Header from './Header';

describe('Header', () => {
  it('기본 문구는 서비스 이름이다', () => {
    render(<Header />);

    expect(screen.getByRole('banner')).toHaveTextContent('AI 사주해석');
  });

  it('지면마다 문구를 갈 수 있다', () => {
    render(<Header title="설정" />);

    expect(screen.getByRole('banner')).toHaveTextContent('설정');
  });
});
