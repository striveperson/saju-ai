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

import type { Saju } from '@saju/chart';
import type { ProfileInfo } from '@shared/handoff';

type ResultPageProps = {
  saju: Saju;
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

const ResultPage = ({ saju, info }: ResultPageProps) => {
  const {
    chart,
    reading: { strength, sinsal },
  } = saju;
  const dayElement = STEM_ELEMENT[stemOf(chart.pillars.day)];

  return (
    <main className="flex flex-1 flex-col gap-3.5 px-4 pt-4 pb-4">
      <Profile chart={chart} info={info} />

      <Section title="사주팔자">
        <PaljaTable pillars={chart.pillars} />
      </Section>

      <Section title="신살과 길성">
        <SinsalSection sinsal={sinsal} />
      </Section>

      <Section title="오행과 십신">
        <OhaengBars
          dayElement={dayElement}
          distribution={strength.elementDistribution}
        />
        <div className="mt-4">
          <OhaengWheel
            dayElement={dayElement}
            distribution={strength.elementDistribution}
          />
        </div>
      </Section>

      <Section title="신강/신약 지수">
        <StrengthScale strength={strength} />
      </Section>

      <Section title="용신">
        <YongshinCard strength={strength} />
      </Section>

      <Section title="대운">
        <DaeunTrack daeun={chart.daeun} />
      </Section>

      <Section title="AI 해석">
        <InterpretationEmpty />
      </Section>
    </main>
  );
};

export default ResultPage;
