import { percent, shengRing } from '@features/result/utils/element';
import { ELEMENT_CONTROLS, ELEMENT_GENERATES, tenGodGroup } from '@saju/tables';

import type { Element } from '@saju';
import type { StrengthResult } from '@saju/strength';

type OhaengWheelProps = {
  dayElement: Element;
  distribution: StrengthResult['elementDistribution'];
};

const CENTER = 170;
const MIDDLE = 158;
const ORBIT = 112;
const NODE_R = 41;

type Point = { x: number; y: number };

/**
 * 삼각함수 결과를 소수 셋째 자리에서 끊는다.
 *
 * `Math.cos` 과 `Math.atan2` 는 마지막 자리가 구현마다 갈릴 수 있다. 그 값이 그대로
 * 속성 문자열이 되면 SSR 과 브라우저의 마크업이 달라져 하이드레이션이 어긋난다.
 * 실제로 rotate(-72) 와 rotate(-72.00000000000001) 로 갈렸다. docs/03 9.1.
 */
const round = (value: number): number => Math.round(value * 1000) / 1000;

/** 상생 순서로 시계 방향. 열두시부터 72도씩 */
const node = (index: number): Point => {
  const angle = (-90 + index * 72) * (Math.PI / 180);
  return {
    x: round(CENTER + ORBIT * Math.cos(angle)),
    y: round(MIDDLE + ORBIT * Math.sin(angle)),
  };
};

type ArrowProps = {
  from: Point;
  to: Point;
  /** 어느 관계인지. 스크린 리더가 읽고 테스트가 방향을 잡는다 */
  label: string;
  kind: 'sheng' | 'keug';
};

/** 원 둘레에서 시작하고 끝난다. 원 안으로 파고들지 않게 반지름만큼 물린다 */
const Arrow = ({ from, to, label, kind }: ArrowProps) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const gap = NODE_R + 7;
  const x1 = round(from.x + ux * gap);
  const y1 = round(from.y + uy * gap);
  const x2 = round(to.x - ux * (gap + 3));
  const y2 = round(to.y - uy * (gap + 3));
  const deg = round((Math.atan2(uy, ux) * 180) / Math.PI);
  const stroke = kind === 'sheng' ? 'stroke-sheng' : 'stroke-keug';
  const fill = kind === 'sheng' ? 'fill-sheng' : 'fill-keug';

  return (
    <g role="graphics-symbol" aria-label={label}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        strokeLinecap="round"
        strokeWidth={kind === 'sheng' ? 2 : 1.6}
        strokeDasharray={kind === 'keug' ? '5 4' : undefined}
        className={stroke}
      />
      <path
        d="M0 0L-8 -4L-8 4Z"
        transform={`translate(${x2} ${y2}) rotate(${deg})`}
        className={fill}
      />
    </g>
  );
};

/** 오행별 노드 채움. 클래스를 조립하지 않으려고 총망라로 적는다 */
const NODE_FILL: Record<Element, string> = {
  목: 'fill-mok/30',
  화: 'fill-hwa/30',
  토: 'fill-to/30',
  금: 'fill-geum/30',
  수: 'fill-su/30',
};

const NODE_RING: Record<Element, string> = {
  목: 'stroke-mok/45',
  화: 'stroke-hwa/45',
  토: 'stroke-to/45',
  금: 'stroke-geum/45',
  수: 'stroke-su/45',
};

/**
 * 선이 무엇을 뜻하는지. 목업 result-screen.html 의 범례다.
 *
 * 화살표에 `aria-label` 이 붙어 있어 스크린 리더는 `토생금` 을 읽지만
 * 눈으로 보는 쪽에는 실선과 점선을 가릴 단서가 없다.
 */
const Legend = () => {
  return (
    <ul className="text-ink-mid m-0 mb-0.5 flex list-none gap-3.5 p-0 text-[11.5px]">
      <li className="flex items-center gap-1.5">
        <svg width="22" height="8" aria-hidden="true">
          <line
            x1="1"
            y1="4"
            x2="15"
            y2="4"
            strokeWidth="1.6"
            className="stroke-sheng"
          />
          <path d="M15 1L21 4L15 7Z" className="fill-sheng" />
        </svg>
        생(生)
      </li>
      <li className="flex items-center gap-1.5">
        <svg width="22" height="8" aria-hidden="true">
          <line
            x1="1"
            y1="4"
            x2="15"
            y2="4"
            strokeWidth="1.6"
            strokeDasharray="4 3"
            className="stroke-keug"
          />
          <path d="M15 1L21 4L15 7Z" className="fill-keug" />
        </svg>
        극(剋)
      </li>
    </ul>
  );
};

/**
 * 오행 상생상극 관계도. 목업 result-screen.html 의 SVG 다.
 *
 * 상생과 상극을 배열의 인접 관계로 유도하지 않는다. 화살표가 가리키는 곳은
 * 엔진의 `ELEMENT_GENERATES` 와 `ELEMENT_CONTROLS` 가 정하고 링은 좌표만 준다.
 * 그래야 나열 순서를 바꿔도 관계가 따라 틀어지지 않는다.
 */
const OhaengWheel = ({ dayElement, distribution }: OhaengWheelProps) => {
  // 일간 오행을 열두시에 놓는다. 목업이 그렇게 그린다.
  const wheel = shengRing(dayElement);
  const points = wheel.map((_, index) => node(index));
  const at = (element: Element): Point => points[wheel.indexOf(element)];

  return (
    <>
      <Legend />
      <svg
        viewBox="0 0 340 316"
        role="img"
        aria-label="오행 상생 상극 관계도"
        className="block h-auto w-full"
      >
        {wheel.map((element) => (
          <Arrow
            key={`keug-${element}`}
            from={at(element)}
            to={at(ELEMENT_CONTROLS[element])}
            label={`${element}극${ELEMENT_CONTROLS[element]}`}
            kind="keug"
          />
        ))}
        {wheel.map((element) => (
          <Arrow
            key={`sheng-${element}`}
            from={at(element)}
            to={at(ELEMENT_GENERATES[element])}
            label={`${element}생${ELEMENT_GENERATES[element]}`}
            kind="sheng"
          />
        ))}

        {wheel.map((element, index) => {
          const { x, y } = points[index];
          const { ratio } = distribution[element];
          const height = round(NODE_R * 2 * ratio);
          const clipId = `wheel-clip-${element}`;

          return (
            <g
              key={element}
              role="graphics-symbol"
              aria-label={`${element} 자리`}
            >
              <clipPath id={clipId}>
                <circle cx={x} cy={y} r={NODE_R} />
              </clipPath>
              <circle
                cx={x}
                cy={y}
                r={NODE_R}
                strokeWidth={1.5}
                className={`fill-field ${NODE_RING[element]}`}
              />
              {height > 0 && (
                <rect
                  x={x - NODE_R}
                  y={y + NODE_R - height}
                  width={NODE_R * 2}
                  height={height}
                  clipPath={`url(#${clipId})`}
                  className={NODE_FILL[element]}
                />
              )}
              <text
                x={x}
                y={y - 3}
                textAnchor="middle"
                className="fill-ink text-[13px] font-semibold"
              >
                {`${element}(${tenGodGroup(dayElement, element)})`}
              </text>
              <text
                x={x}
                y={y + 15}
                textAnchor="middle"
                className="fill-ink-mid text-xs tabular-nums"
              >
                {percent(ratio)}
              </text>
            </g>
          );
        })}
      </svg>
    </>
  );
};

export default OhaengWheel;
