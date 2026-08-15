import Header from '@components/Header';
import Shell from '@components/Shell';
import ResultPage from '@features/result/ResultPage';
import { computeSaju } from '@saju/chart';
import { createFileRoute } from '@tanstack/react-router';

import type { ChartInput } from '@saju/chart';

/**
 * 임시 미리보기 입력. 사용자 입력이 아니다.
 *
 * 결과 조각을 브라우저로 열어 docs/mockups/result-screen.html 과 대조하려고 둔 것이고,
 * 입력 지면이 생기면 이 상수를 지우고 그 값을 받는다.
 *
 * 값은 검증 케이스 verified-19950127-1439-F-seoul 이다. 목업이 쓴 것과 같다.
 * URL 에는 아무것도 싣지 않는다. 생년월일시는 개인정보이고 docs/03 5.1 이 금지한다.
 */
const PREVIEW: ChartInput = {
  calendar: 'solar',
  birth: { year: 1995, month: 1, day: 27, hour: 14, minute: 39 },
  gender: 'F',
  longitude: 126.98,
  ziPolicy: 'nextDay',
};

const ResultRoute = () => {
  return (
    <Shell>
      <Header />
      <ResultPage
        saju={computeSaju(PREVIEW)}
        info={{ name: '김하늘', gender: '여자', region: '서울' }}
      />
    </Shell>
  );
};

export const Route = createFileRoute('/result')({
  component: ResultRoute,
});
