import DaeunTrack from '@features/result/components/DaeunTrack';
import InterpretationEmpty from '@features/result/components/InterpretationEmpty';
import OhaengBars from '@features/result/components/OhaengBars';
import OhaengWheel from '@features/result/components/OhaengWheel';
import PaljaTable from '@features/result/components/PaljaTable';
import Profile from '@features/result/components/Profile';
import SinsalSection from '@features/result/components/SinsalSection';
import StrengthScale from '@features/result/components/StrengthScale';
import YongshinCard from '@features/result/components/YongshinCard';
import { STEM_ELEMENT, stemOf } from '@saju';

import type { ReactNode } from 'react';

import type { ProfileInfo } from '@features/result/components/Profile';
import type { Saju } from '@saju/chart';

type ResultPageProps = {
  saju: Saju;
  /** 엔진이 모르는 표시용 값. 입력 지면이 생기면 그쪽에서 온다 */
  info?: ProfileInfo;
};

type SectionProps = {
  title: string;
  children: ReactNode;
};

const Section = ({ title, children }: SectionProps) => {
  return (
    <section className="border-line bg-field rounded-card border p-4">
      <h2 className="m-0 mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
};

/**
 * 결과 지면. 목업 docs/mockups/result-screen.html 을 따른다.
 *
 * 판정을 다시 계산하지 않는다. `computeSaju` 가 낸 것을 나눠 줄 뿐이다.
 * 연운, 월운, 일진 달력은 아직 없다. 앞은 현재 시각 기준이 필요하고
 * 뒤 둘은 엔진에 함수가 없다.
 *
 * 경계를 두지 않은 것은 여기 전부가 로컬 계산이라 실패하지 않기 때문이다.
 * LLM 을 타는 해석문이 붙을 때 그 블록에만 CatchBoundary 를 건다(docs/03 11.1).
 */
const ResultPage = ({ saju, info }: ResultPageProps) => {
  const { chart, reading } = saju;
  const dayElement = STEM_ELEMENT[stemOf(chart.pillars.day)];

  return (
    <main className="flex flex-1 flex-col gap-3.5 px-4 pt-4 pb-4">
      <Profile chart={chart} info={info} />

      <Section title="사주팔자">
        <PaljaTable pillars={chart.pillars} />
      </Section>

      <Section title="오행과 십신">
        <OhaengBars
          dayElement={dayElement}
          distribution={reading.strength.elementDistribution}
        />
        <div className="mt-4">
          <OhaengWheel
            dayElement={dayElement}
            distribution={reading.strength.elementDistribution}
          />
        </div>
      </Section>

      <Section title="신강/신약 지수">
        <StrengthScale strength={reading.strength} />
      </Section>

      <Section title="용신">
        <YongshinCard strength={reading.strength} />
      </Section>

      <Section title="대운">
        <DaeunTrack daeun={chart.daeun} />
      </Section>

      <Section title="신살과 길성">
        <SinsalSection sinsal={reading.sinsal} />
      </Section>

      <Section title="AI 해석">
        <InterpretationEmpty />
      </Section>
    </main>
  );
};

export default ResultPage;
