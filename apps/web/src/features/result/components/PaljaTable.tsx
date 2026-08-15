import {
  BRANCH_ELEMENT,
  STEM_ELEMENT,
  STEM_POLARITY,
  branchOf,
  stemOf,
  type EarthlyBranch,
  type FourPillars,
  type HeavenlyStem,
} from '@saju';
import { BRANCH_HIDDEN_STEMS, tenGodGroup } from '@saju/tables';
import { ELEMENT_CELL, POLARITY_SIGN } from '@features/result/utils/element';

type PaljaTableProps = {
  pillars: FourPillars;
};

/**
 * 목업이 시, 일, 월, 년 순으로 놓는다. 최근 것이 왼쪽이다.
 *
 * 자리 이름은 `keyof FourPillars` 로 받는다. 같은 타입이 `sinsal.ts` 에도
 * `PillarKey` 로 있지만 팔자 표가 신살 모듈에 붙을 이유가 없다.
 */
const COLUMNS: readonly (readonly [keyof FourPillars, string])[] = [
  ['hour', '시'],
  ['day', '일'],
  ['month', '월'],
  ['year', '년'],
];

type GlyphCellProps = {
  glyph: string;
  badge: string;
  element: keyof typeof ELEMENT_CELL;
};

const GlyphCell = ({ glyph, badge, element }: GlyphCellProps) => {
  return (
    <td
      className={`rounded-[10px] border px-0.5 py-[7px] text-center ${ELEMENT_CELL[element]}`}
    >
      <div className="text-[25px] font-semibold leading-tight">{glyph}</div>
      <div className="text-[10.5px] font-semibold">{badge}</div>
    </td>
  );
};

type PlainCellProps = {
  children: string;
};

const PlainCell = ({ children }: PlainCellProps) => {
  return (
    <td className="px-0.5 py-[7px] text-center text-xs text-ink-mid">
      {children}
    </td>
  );
};

/**
 * 사주팔자 다섯 행. docs/mockups/result-screen.html 의 사주팔자 절이다.
 *
 * 판정을 다시 계산하지 않는다. 여덟 글자를 받아 엔진의 표를 읽어 그리기만 한다.
 * 생년월일시를 받지 않는 것도 같은 이유다. 받으면 이 안에서 팔자를 다시 뽑을 여지가 생긴다.
 *
 * 지지에는 음양을 붙이지 않는다. docs/05 1장이 천간 음양만 정의한다.
 */
const PaljaTable = ({ pillars }: PaljaTableProps) => {
  const dayElement = STEM_ELEMENT[stemOf(pillars.day)];

  const stemOfColumn = (key: keyof FourPillars): HeavenlyStem => stemOf(pillars[key]);
  const branchOfColumn = (key: keyof FourPillars): EarthlyBranch =>
    branchOf(pillars[key]);

  return (
    <table className="w-full table-fixed border-separate border-spacing-[3px]">
      <colgroup>
        <col className="w-[34px]" />
        <col />
        <col />
        <col />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th />
          {COLUMNS.map(([key, label]) => (
            <th
              key={key}
              scope="col"
              className="text-[11.5px] font-medium text-ink-soft"
            >
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <th
            scope="row"
            className="pr-[3px] text-right text-[11.5px] font-medium text-ink-soft"
          >
            천간
          </th>
          {COLUMNS.map(([key]) => {
            const stem = stemOfColumn(key);
            const element = STEM_ELEMENT[stem];
            return (
              <GlyphCell
                key={key}
                glyph={stem}
                badge={`${POLARITY_SIGN[STEM_POLARITY[stem]]}${element}`}
                element={element}
              />
            );
          })}
        </tr>
        <tr>
          <th
            scope="row"
            className="pr-[3px] text-right text-[11.5px] font-medium text-ink-soft"
          >
            십신
          </th>
          {COLUMNS.map(([key]) => (
            <PlainCell key={key}>
              {key === 'day'
                ? '일간'
                : tenGodGroup(dayElement, STEM_ELEMENT[stemOfColumn(key)])}
            </PlainCell>
          ))}
        </tr>
        <tr>
          <th
            scope="row"
            className="pr-[3px] text-right text-[11.5px] font-medium text-ink-soft"
          >
            지지
          </th>
          {COLUMNS.map(([key]) => {
            const branch = branchOfColumn(key);
            const element = BRANCH_ELEMENT[branch];
            return (
              <GlyphCell
                key={key}
                glyph={branch}
                badge={element}
                element={element}
              />
            );
          })}
        </tr>
        <tr>
          <th
            scope="row"
            className="pr-[3px] text-right text-[11.5px] font-medium text-ink-soft"
          >
            십신
          </th>
          {COLUMNS.map(([key]) => (
            <PlainCell key={key}>
              {tenGodGroup(dayElement, BRANCH_ELEMENT[branchOfColumn(key)])}
            </PlainCell>
          ))}
        </tr>
        <tr>
          <th
            scope="row"
            className="pr-[3px] text-right text-[11.5px] font-medium text-ink-soft"
          >
            지장간
          </th>
          {COLUMNS.map(([key]) => (
            <td
              key={key}
              className="px-0.5 py-[7px] text-center text-[11px] tracking-[0.08em] text-ink-soft"
            >
              {BRANCH_HIDDEN_STEMS[branchOfColumn(key)]
                .map((hidden) => hidden.stem)
                .join('')}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
};

export default PaljaTable;
