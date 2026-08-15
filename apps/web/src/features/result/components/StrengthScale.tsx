import type { StrengthGrade, StrengthResult } from '@saju/strength';

type StrengthScaleProps = {
  strength: StrengthResult;
};

/** 목업이 약한 쪽부터 놓는다. docs/05 11.4 의 다섯 등급 */
const GRADES: readonly StrengthGrade[] = [
  '태약',
  '신약',
  '중화',
  '신강',
  '태강',
];

/** docs/05 11.3 의 네 요소 */
const FLAGS: readonly (readonly [keyof StrengthResult['flags'], string])[] = [
  ['deukRyeong', '득령'],
  ['deukJi', '득지'],
  ['deukSi', '득시'],
  ['deukSe', '득세'],
];

/**
 * 신강약 등급과 근거. 목업 result-screen.html 의 신강/신약 지수 절이다.
 *
 * 부제에 쓰는 수는 `supportCount` 다. 분모가 일곱인 득세 기준이고
 * 오행 분포의 분모 여덟과 다르므로 무엇을 센 것인지 이름을 붙인다. docs/05 11.6.
 */
const StrengthScale = ({ strength }: StrengthScaleProps) => {
  return (
    <>
      <div className="mb-2.5 flex items-baseline gap-2.5">
        <strong className="text-[22px] font-semibold">{strength.grade}</strong>
        <span className="text-ink-soft text-xs">
          {`득세 ${strength.supportCount} / 7글자`}
        </span>
      </div>

      <div className="mb-2.5 grid grid-cols-5 gap-[3px]">
        {GRADES.map((grade) => (
          <span
            key={grade}
            aria-current={grade === strength.grade ? 'true' : undefined}
            className={
              grade === strength.grade
                ? 'bg-accent text-accent-ink rounded-lg py-[7px] text-center text-[11.5px] font-bold'
                : 'bg-ink-soft/12 text-ink-soft rounded-lg py-[7px] text-center text-[11.5px]'
            }
          >
            {grade}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-[5px]">
        {FLAGS.map(([key, label]) => (
          <span
            key={key}
            className={
              strength.flags[key]
                ? 'bg-accent-soft text-accent rounded-lg py-1.5 text-center text-[11.5px] font-semibold'
                : 'bg-ink-soft/12 text-ink-soft rounded-lg py-1.5 text-center text-[11.5px]'
            }
          >
            {label}
          </span>
        ))}
      </div>
    </>
  );
};

export default StrengthScale;
