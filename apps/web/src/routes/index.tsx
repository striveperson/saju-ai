import Header from '@components/Header';
import Shell from '@components/Shell';
import InputPage from '@features/input/InputPage';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

import type { ChartInput } from '@saju/chart';
import type { ProfileInfo } from '@shared/handoff';

/**
 * 값을 URL 이 아니라 스토어에 담고 넘어간다.
 *
 * 생년월일시는 개인정보라 search params 에 넣지 않는다(docs/03 5.1).
 * 스토어는 메모리에만 있어 새로고침하거나 `/result` 를 직접 열면 비어 있고,
 * 그때는 결과 지면이 입력 지면으로 되돌린다.
 */
const InputRoute = () => {
  const navigate = useNavigate();
  const { sajuStore } = Route.useRouteContext();

  const handleSubmit = (input: ChartInput, info: ProfileInfo) => {
    sajuStore.getState().setHandoff({ input, info });
    void navigate({ to: '/result' });
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
