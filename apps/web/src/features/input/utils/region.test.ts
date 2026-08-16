import { describe, expect, it } from 'vitest';

import { pickRegions } from './region';

/**
 * 카카오 로컬 주소 검색 응답의 모양이다. 우리가 보는 필드만 담았다.
 * 위도 y 는 스키마가 버리므로 여기에도 없다. 실제 응답에서 x 는 문자열이다.
 *
 * 값은 실제 응답에서 옮겼다. 2026-08-16 에 전주, 의왕, 성남, 양평, 세종,
 * 경기, 서울, 강남, 역삼으로 재고 아래 케이스를 그 결과에 맞췄다.
 */
const 문서 = (
  address_type: string,
  depths: readonly [string, string, string],
  x: string,
) => ({
  address_type,
  x,
  address: {
    region_1depth_name: depths[0],
    region_2depth_name: depths[1],
    region_3depth_name: depths[2],
  },
});

describe('pickRegions', () => {
  it('도와 시까지만 남긴다', () => {
    const 결과 = pickRegions({
      documents: [
        문서('REGION', ['경기', '', ''], '127.053463453598'),
        문서('REGION', ['경기', '의왕시', ''], '126.968273810339'),
        문서('REGION', ['전북', '전주시', ''], '127.148143800621'),
        문서('REGION', ['세종특별자치시', '', ''], '127.289195324698'),
        문서('REGION', ['경기', '양평군', ''], '127.487578470072'),
      ],
    });

    expect(결과.map((each) => each.name)).toEqual([
      '경기',
      '의왕시',
      '전주시',
      '세종특별자치시',
      '양평군',
    ]);
  });

  it('시도 이름은 카카오 표기 그대로 쓴다', () => {
    // 서울특별시가 "서울" 로, 경기도가 "경기" 로 온다.
    // 반면 특별자치도와 특별자치시는 온전한 이름이다. 우리가 고쳐 적지 않는다.
    const 결과 = pickRegions({
      documents: [
        문서('REGION', ['서울', '', ''], '126.978652258309'),
        문서('REGION', ['부산', '', ''], '129.075087492149'),
        문서('REGION', ['제주특별자치도', '', ''], '126.498229141199'),
      ],
    });

    expect(결과.map((each) => each.name)).toEqual([
      '서울',
      '부산',
      '제주특별자치도',
    ]);
  });

  it('구를 뺀다', () => {
    // 강남구는 자치구고 분당구와 완산구는 일반구다.
    // 실측에서 카카오는 일반구를 붙이지 않고 "전주시" 를 따로 준다.
    // 그래도 붙은 형태를 함께 막아 둔다. 문자열이 구로 끝나는 것은 같다.
    const 결과 = pickRegions({
      documents: [
        문서('REGION', ['서울', '강남구', ''], '127.0473'),
        문서('REGION', ['경기', '성남시 분당구', ''], '127.1086'),
        문서('REGION', ['전북', '전주시 완산구', ''], '127.1188'),
      ],
    });

    expect(결과).toEqual([]);
  });

  it('읍면동을 뺀다', () => {
    const 결과 = pickRegions({
      documents: [문서('REGION', ['경기', '양평군', '양평읍'], '127.4875')],
    });

    expect(결과).toEqual([]);
  });

  it('지명이 아닌 것을 뺀다', () => {
    // 도로명과 지번은 주소이지 지역이 아니다.
    const 결과 = pickRegions({
      documents: [
        문서('ROAD_ADDR', ['서울', '중구', '태평로1가'], '126.9779'),
        문서('REGION_ADDR', ['서울', '중구', '태평로1가'], '126.9779'),
        문서('ROAD', ['서울', '중구', ''], '126.9779'),
      ],
    });

    expect(결과).toEqual([]);
  });

  it('경도는 x 다', () => {
    // y 는 위도라 스키마가 버린다. 뒤집히면 사주가 통째로 틀리는데 예외는 안 난다.
    const 결과 = pickRegions({
      documents: [문서('REGION', ['서울', '', ''], '126.978652258309')],
    });

    expect(결과).toEqual([{ name: '서울', longitude: 126.978652258309 }]);
  });

  it('같은 이름을 한 번만 낸다', () => {
    const 결과 = pickRegions({
      documents: [
        문서('REGION', ['경기', '', ''], '127.053463453598'),
        문서('REGION', ['경기', '', ''], '127.053463453598'),
      ],
    });

    expect(결과).toHaveLength(1);
  });

  it('address 가 없는 문서를 넘긴다', () => {
    // 도로명만 잡힌 문서는 address 가 null 로 온다.
    const 결과 = pickRegions({
      documents: [{ address_type: 'ROAD', x: '127.0', address: null }],
    });

    expect(결과).toEqual([]);
  });
});
