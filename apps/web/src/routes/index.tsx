import Header from '@components/Header';
import Shell from '@components/Shell';
import InputPage from '@features/input/InputPage';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

import type { ChartInput } from '@saju/chart';
import type { ProfileInfo } from '@shared/handoff';

/**
 * 값을 URL 이 아니라 히스토리 항목에 싣는다.
 *
 * 생년월일시는 개인정보라 search params 에 넣지 않는다(docs/03 5.1).
 * 새로고침하거나 `/result` 를 직접 열면 state 가 비어 입력 지면으로 되돌아온다.
 */
const InputRoute = () => {
  const navigate = useNavigate();

  const handleSubmit = (input: ChartInput, info: ProfileInfo) => {
    void navigate({
      to: '/result',
      state: (prev) => ({ ...prev, saju: { input, info } }),
    });
  };

  return (
    <Shell>
      <Header />
      <InputPage onSubmit={handleSubmit} />
    </Shell>
  );
};

export const Route = createFileRoute('/')({
  component: InputRoute,
});
