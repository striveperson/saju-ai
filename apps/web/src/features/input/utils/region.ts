import { z } from 'zod';

/**
 * 고른 출생지. 경도만 들고 위도는 안 든다.
 */
export const regionSchema = z.object({
  name: z.string(),
  longitude: z.number(),
});

export type Region = z.infer<typeof regionSchema>;

export const regionsSchema = z.array(regionSchema);

/**
 * 카카오 로컬 주소 검색 응답 중 우리가 보는 것.
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
 * 도와 시까지만 남긴다.
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
