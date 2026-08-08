import { describe, expect, it } from 'vitest';

import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from '../index';
import { correctBirthTime } from '../time';
import type { Pillar, Requirement } from './cases';
import {
  CASES,
  PENDING_CASES,
  VERIFIED_CASES,
  caseById,
  correctionOptions,
  parseBirth,
} from './cases';

/**
 * docs/05-saju-domain-rules.md 10장의 필수 경계 목록.
 * 목록에 있는데 케이스가 없으면 그 경계는 아무도 검사하지 않는 상태로 남는다.
 */
const REQUIRED: readonly Requirement[] = [
  'baseline',
  'anchor',
  'ipchun-boundary',
  'solar-term-boundary',
  'zi-hour-boundary',
  'timezone-transition',
  'dst',
  'wall-clock-ambiguity',
  'pre-standard-time',
  'true-solar-time',
  'lunar-leap-month',
  'daeun-direction',
  'daeun-on-term-day',
];

/** 60갑자에 실재하는 조합인가. 천간과 지지의 인덱스 홀짝이 같아야 한다. */
function isValidPillar(pillar: string): boolean {
  if (pillar.length !== 2) return false;

  const stemIndex = (HEAVENLY_STEMS as readonly string[]).indexOf(pillar[0]);
  const branchIndex = (EARTHLY_BRANCHES as readonly string[]).indexOf(
    pillar[1],
  );
  if (stemIndex === -1 || branchIndex === -1) return false;

  return stemIndex % 2 === branchIndex % 2;
}

describe('검증 케이스 목록', () => {
  it('id 가 중복되지 않는다', () => {
    const ids = CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('verified 와 pending 이 전체를 남김없이 나눈다', () => {
    expect(VERIFIED_CASES.length + PENDING_CASES.length).toBe(CASES.length);
  });

  it('모든 케이스에 목적이 적혀 있다', () => {
    for (const c of CASES) {
      expect(c.purpose.length, c.id).toBeGreaterThan(0);
    }
  });

  it('필수 경계 목록의 모든 항목에 케이스가 하나 이상 있다', () => {
    const covered = new Set(CASES.map((c) => c.requirement));
    const missing = REQUIRED.filter((r) => !covered.has(r));

    expect(missing, `케이스가 없는 필수 경계: ${missing.join(', ')}`).toEqual(
      [],
    );
  });
});

describe('verified 케이스', () => {
  it('출처 없이 verified 를 붙이지 않는다', () => {
    for (const c of VERIFIED_CASES) {
      expect(c.sources.length, c.id).toBeGreaterThan(0);
    }
  });

  it('기둥을 하나도 채우지 않은 채 verified 를 붙이지 않는다', () => {
    for (const c of VERIFIED_CASES) {
      const filled = [
        c.expected.year,
        c.expected.month,
        c.expected.day,
        c.expected.hour,
      ].filter(Boolean);
      expect(filled.length, `${c.id} 에 채워진 기둥`).toBeGreaterThan(0);
    }
  });

  it('채워진 기둥이 60갑자에 실재하는 조합이다', () => {
    // 기둥마다 독립 출처가 달라 일부만 채운 케이스가 있다. 앵커는 일주만 검증한다.
    for (const c of VERIFIED_CASES) {
      const pillars: (Pillar | undefined)[] = [
        c.expected.year,
        c.expected.month,
        c.expected.day,
        c.expected.hour,
      ];
      for (const p of pillars) {
        if (!p) continue;
        expect(isValidPillar(p), `${c.id} 의 ${p}`).toBe(true);
      }
    }
  });

  it('반대 정책 값도 실재하는 조합이다', () => {
    for (const c of VERIFIED_CASES) {
      const opposite = c.expected.underOppositeZiPolicy;
      if (!opposite) continue;

      expect(isValidPillar(opposite.day), `${c.id} 의 ${opposite.day}`).toBe(
        true,
      );
      expect(isValidPillar(opposite.hour), `${c.id} 의 ${opposite.hour}`).toBe(
        true,
      );
    }
  });

  it('대운 첫 간지도 실재하는 조합이다', () => {
    for (const c of VERIFIED_CASES) {
      if (!c.expected.daeun) continue;
      expect(isValidPillar(c.expected.daeun.first), c.id).toBe(true);
    }
  });

  it('신강약 4요소와 등급이 ADR 0007 과 어긋나지 않는다', () => {
    for (const c of VERIFIED_CASES) {
      const { flags, strengthGrade } = c.expected;
      if (!flags || !strengthGrade) continue;

      const all =
        flags.deukRyeong && flags.deukJi && flags.deukSi && flags.deukSe;
      const none =
        !flags.deukRyeong && !flags.deukJi && !flags.deukSi && !flags.deukSe;

      // ADR 0007: 네 요소가 모두 참이면 태강이다.
      if (all) expect(strengthGrade, c.id).toBe('태강');
      // 모두 거짓인데 태강이나 신강이 나올 수는 없다.
      if (none) expect(['신약', '태약'], c.id).toContain(strengthGrade);
    }
  });

  it('용신 노선이 등급과 맞는다', () => {
    for (const c of VERIFIED_CASES) {
      const { strengthGrade, yongshin } = c.expected;
      if (!strengthGrade || !yongshin) continue;

      // ADR 0007: 태강이면 식상(설기), 신강이면 관성(극제), 신약과 태약이면 인성(생조).
      if (strengthGrade === '태강')
        expect(yongshin.method, c.id).toContain('설기');
      if (strengthGrade === '신강')
        expect(yongshin.method, c.id).toContain('극제');
      if (strengthGrade === '신약' || strengthGrade === '태약') {
        expect(yongshin.method, c.id).toContain('생조');
      }
    }
  });
});

describe('pending 케이스', () => {
  it('기대값을 추측해 채우지 않았다', () => {
    for (const c of PENDING_CASES) {
      expect(c.expected, c.id).toBeNull();
    }
  });

  it('무엇이 있어야 확정되는지 적혀 있다', () => {
    for (const c of PENDING_CASES) {
      expect(c.blockedBy.length, c.id).toBeGreaterThan(0);
    }
  });
});

describe('케이스가 주장하는 시간 구간', () => {
  /** 케이스 입력을 파이프라인에 태운 결과. 무엇을 겨냥한 케이스인지 여기서 드러난다. */
  const correctionOf = (c: (typeof CASES)[number]) =>
    correctBirthTime(parseBirth(c.input.birth), correctionOptions(c.input))
      .disclosure;

  it('dst 케이스는 실제로 서머타임 구간 안에 있다', () => {
    // tz-utc830-era 가 서머타임 안에 있으면서 UTC+8:30 을 주장하고 있었다. 그 실수를 막는다.
    const cases = CASES.filter((c) => c.requirement === 'dst');
    expect(cases.length).toBeGreaterThan(0);

    for (const c of cases) {
      expect(
        correctionOf(c).daylightUnwound,
        `${c.id} (${c.input.birth})`,
      ).toBe(true);
    }
  });

  it('timezone-transition 케이스는 서머타임 밖이다', () => {
    // 표준시 이력을 겨냥한 케이스인데 서머타임이 섞이면 무엇이 틀렸는지 갈라지지 않는다.
    for (const c of CASES.filter(
      (c) => c.requirement === 'timezone-transition',
    )) {
      expect(
        correctionOf(c).daylightUnwound,
        `${c.id} (${c.input.birth})`,
      ).toBe(false);
    }
  });

  it('wall-clock-ambiguity 케이스는 해석이 하나가 아니다', () => {
    const kinds = CASES.filter(
      (c) => c.requirement === 'wall-clock-ambiguity',
    ).map((c) => correctionOf(c).resolution.kind);

    expect(kinds).toContain('ambiguous');
    expect(kinds).toContain('nonexistent');
  });

  it('자시 경계 케이스가 보정 후 의도한 시각에 떨어진다', () => {
    // 진태양시 보정이 항상 걸리므로 기록 시계와 판정 시각이 어긋난다(ADR 0016).
    // 입력을 잘못 잡으면 경계를 끼지 못한 채 조용히 통과한다.
    const intended: Record<string, string> = {
      'zi-2259': '22:59',
      'zi-2301': '23:01',
      'zi-2359': '23:59',
      'zi-0001': '00:01',
    };

    for (const [id, hhmm] of Object.entries(intended)) {
      const input = caseById(id).input;
      const { corrected } = correctBirthTime(
        parseBirth(input.birth),
        correctionOptions(input),
      );
      const actual = `${String(corrected.hour).padStart(2, '0')}:${String(corrected.minute).padStart(2, '0')}`;

      expect(actual, `${id} (${input.birth})`).toBe(hhmm);
    }
  });

  it('pre-standard-time 케이스는 표준시 도입 이전이다', () => {
    const cases = CASES.filter((c) => c.requirement === 'pre-standard-time');
    expect(cases.length).toBeGreaterThan(0);

    for (const c of cases) {
      expect(correctionOf(c).localMeanTimeEra, c.id).toBe(true);
    }
  });
});
