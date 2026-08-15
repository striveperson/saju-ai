import type { AmbiguityChoice, TimeNotice } from '@saju/time';

/**
 * 경고 문구. docs/01 5.1 의 표를 그대로 옮긴 것이다.
 *
 * 문구를 여기서 새로 짓지 않는다. 01 이 canonical 이고 이 파일은 운반자다.
 * `Record<TimeNotice, string>` 이라 종류가 늘면 타입체크가 잡는다.
 */
export const NOTICE_TEXT: Record<TimeNotice, string> = {
  'local-mean-time': '표준시가 없던 시기라 지방 평균시로 계산했습니다',
  'non-standard-offset': '당시 표준시로 읽었습니다',
  'daylight-unwound': '서머타임 시계로 보고 한 시간을 되돌렸습니다',
  'dst-assumption-unknown':
    '기록이 서머타임 시계인지 확인되지 않아 그대로 가정했습니다',
  'ambiguous-wall-clock': '이 시각은 두 번 존재합니다',
  'nonexistent-wall-clock': '이 시각은 존재하지 않아 전환 직후로 옮겼습니다',
  'true-solar-fallback': '출생지를 몰라 서울 기준으로 보정했습니다',
};

/** docs/05 7.4 */
export const AMBIGUITY_LABEL: Record<AmbiguityChoice, string> = {
  earlier: '이른 쪽',
  later: '늦은 쪽',
};
