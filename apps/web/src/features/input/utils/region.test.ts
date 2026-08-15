import { describe, expect, it } from 'vitest';

import { pickRegions } from './region';

/**
 * 카카오 로컬 주소 검색 응답의 모양을 흉내낸 것이다.
 * 우리가 보는 필드만 담았다. 위도 y 는 스키마가 버리므로 여기에도 없다.
 * 실제 응답에서 x 는 문자열이다.
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
        문서('REGION', ['경기도', '', ''], '127.0095'),
        문서('REGION', ['경기도', '의왕시', ''], '126.9683'),
        문서('REGION', ['전라북도', '전주시', ''], '127.148'),
        문서('REGION', ['세종특별자치시', '', ''], '127.2892'),
        문서('REGION', ['경기도', '양평군', ''], '127.4875'),
      ],
    });

    expect(결과.map((each) => each.name)).toEqual([
      '경기도',
      '의왕시',
      '전주시',
      '세종특별자치시',
      '양평군',
    ]);
  });

  it('구를 뺀다', () => {
    // 자치구와 일반구 둘 다다. 카카오가 일반구를 "전주시 완산구" 로 붙여 주더라도
    // 문자열이 구로 끝나는 것은 같아 규칙 하나로 걸린다.
    const 결과 = pickRegions({
      documents: [
        문서('REGION', ['서울특별시', '강남구', ''], '127.0473'),
        문서('REGION', ['경기도', '성남시 분당구', ''], '127.1086'),
        문서('REGION', ['전라북도', '전주시 완산구', ''], '127.1188'),
      ],
    });

    expect(결과).toEqual([]);
  });

  it('읍면동을 뺀다', () => {
    const 결과 = pickRegions({
      documents: [문서('REGION', ['경기도', '양평군', '양평읍'], '127.4875')],
    });

    expect(결과).toEqual([]);
  });

  it('지명이 아닌 것을 뺀다', () => {
    // 도로명과 지번은 주소이지 지역이 아니다.
    const 결과 = pickRegions({
      documents: [
        문서('ROAD_ADDR', ['서울특별시', '중구', '태평로1가'], '126.9779'),
        문서('REGION_ADDR', ['서울특별시', '중구', '태평로1가'], '126.9779'),
        문서('ROAD', ['서울특별시', '중구', ''], '126.9779'),
      ],
    });

    expect(결과).toEqual([]);
  });

  it('경도는 x 다', () => {
    // y 는 위도라 스키마가 버린다. 뒤집히면 사주가 통째로 틀리는데 예외는 안 난다.
    const 결과 = pickRegions({
      documents: [문서('REGION', ['서울특별시', '', ''], '126.9784')],
    });

    expect(결과).toEqual([{ name: '서울특별시', longitude: 126.9784 }]);
  });

  it('같은 이름을 한 번만 낸다', () => {
    const 결과 = pickRegions({
      documents: [
        문서('REGION', ['경기도', '', ''], '127.0095'),
        문서('REGION', ['경기도', '', ''], '127.0095'),
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
