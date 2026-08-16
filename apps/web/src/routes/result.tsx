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
 * 스토어가 비어 있으면 입력 지면으로 되돌린다. 새로고침과 직접 진입이 그 경로다.
 *
 * `errorComponent` 는 그것과 별개다. 스키마가 연도 범위까지 좁히지 않아
 * 지원 범위 밖이면 `computeSaju` 가 `RangeError` 를 던진다(birth.ts 가 범위를 안 본다).
 */
export const Route = createFileRoute('/result')({
  beforeLoad: ({ context }) => {
    const parsed = handoffSchema.safeParse(
      context.sajuStore.getState().handoff,
    );
    if (!parsed.success) throw redirect({ to: '/' });

    return { saju: parsed.data };
  },
  errorComponent: ResultError,
  component: ResultRoute,
});
