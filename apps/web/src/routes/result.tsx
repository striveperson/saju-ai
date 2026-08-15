import Header from '@components/Header';
import Shell from '@components/Shell';
import ResultError from '@features/result/components/ResultError';
import ResultPage from '@features/result/ResultPage';
import { computeSaju } from '@saju/chart';
import { handoffSchema } from '@shared/handoff';
import { createFileRoute, redirect } from '@tanstack/react-router';

const ResultRoute = () => {
  const { input, info } = Route.useRouteContext().saju;

  return (
    <Shell>
      <Header />
      <ResultPage saju={computeSaju(input)} info={info} />
    </Shell>
  );
};

/**
 * `computeSaju` 는 순수 함수라 입력 지면이 이미 한 번 돌려 본 것과 같은 값이 나온다.
 * 그래도 `errorComponent` 를 둔다. 앞 버전이 넣은 state 가 새로고침으로 돌아올 수 있다.
 */
export const Route = createFileRoute('/result')({
  beforeLoad: ({ location }) => {
    const parsed = handoffSchema.safeParse(location.state.saju);
    if (!parsed.success) throw redirect({ to: '/' });

    return { saju: parsed.data };
  },
  errorComponent: ResultError,
  component: ResultRoute,
});
