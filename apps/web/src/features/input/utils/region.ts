import { z } from 'zod';

/**
 * 고른 출생지. 경도만 들고 위도는 안 든다.
 *
 * 균시차를 넣지 않기로 한 이상 위도가 들어갈 계산이 없다(docs/05 7.3, ADR 0019 4항).
 * 이름은 결과 지면이 `ProfileInfo.region` 으로 표시하는 데만 쓴다.
 */
export const regionSchema = z.object({
  name: z.string(),
  longitude: z.number(),
});

export type Region = z.infer<typeof regionSchema>;

/** `/api/regions` 가 내는 것. 우리 서버지만 화면에는 바깥이라 검증한다(docs/03 4장) */
export const regionsSchema = z.array(regionSchema);

/**
 * 카카오 로컬 주소 검색 응답 중 우리가 보는 것.
 *
 * 안 적은 필드는 zod 가 버린다. 위도 `y` 가 그렇게 빠진다.
 * `address` 는 도로명만 잡힌 문서에서 `null` 로 온다.
 */
export const kakaoAddressSchema = z.object({
  documents: z.array(
    z.object({
      address_type: z.string(),
      x: z.string(),
      address: z
        .object({
          region_1depth_name: z.string(),
          region_2depth_name: z.string(),
          region_3depth_name: z.string(),
        })
        .nullable(),
    }),
  ),
});

export type KakaoAddress = z.infer<typeof kakaoAddressSchema>;

/**
 * 도와 시까지만 남긴다. 근거는 ADR 0019 2항이다.
 *
 * 구는 뺀다. 자치구(강남구)와 일반구(분당구) 둘 다이고, 카카오가 일반구를
 * `성남시 분당구` 로 붙여 주더라도 문자열이 구로 끝나는 것은 같다.
 * 군은 남긴다. 시의 아래가 아니라 옆이라 빼면 양평군 출생이 고를 것이 없어진다.
 *
 * 이름을 고쳐 적지 않는다. 카카오는 시도를 약칭으로 준다. 서울특별시가 `서울` 이고
 * 경기도가 `경기` 인데 제주특별자치도와 세종특별자치시는 온전한 이름이다.
 * 표기를 맞추려면 우리가 표를 들어야 하고, 그것이 ADR 0019 가 피하려는 것이다.
 */
export const pickRegions = (response: KakaoAddress): readonly Region[] => {
  const seen = new Set<string>();
  const picked: Region[] = [];

  for (const { address_type, x, address } of response.documents) {
    if (address_type !== 'REGION' || address === null) continue;

    const { region_1depth_name, region_2depth_name, region_3depth_name } =
      address;

    // 읍면동이 채워져 있으면 시보다 아래다
    if (region_3depth_name !== '') continue;
    if (region_2depth_name.endsWith('구')) continue;

    // 시도 자체를 고른 경우 2depth 가 비어 있다. 경기도와 세종특별자치시가 그렇다
    const name =
      region_2depth_name === '' ? region_1depth_name : region_2depth_name;
    if (seen.has(name)) continue;

    seen.add(name);
    picked.push({ name, longitude: Number(x) });
  }

  return picked;
};
