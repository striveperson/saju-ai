import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

// jsdom 환경, React 렌더링, jest-dom 매처, setup.ts 로딩이
// 모두 연결되어 있는지 확인하는 스모크 테스트.
describe('web 테스트 하네스', () => {
  it('컴포넌트를 렌더링하고 jest-dom 매처를 쓸 수 있다', () => {
    render(<p>사주</p>);
    expect(screen.getByText('사주')).toBeInTheDocument();
  });
});
