"""
Skyfield 로 24절기 절입 시각을 계산한다.

절기는 태양의 겉보기 황경이 15도의 배수가 되는 순간이다.
근사 공식이 아니라 그 정의를 이분법으로 푼다. 근거는 ADR 0014.

KASI 가 제공하는 2000~2028 을 계산해 정답지와 대조하는 것이 첫 용도다.
대조를 통과하면 같은 계산기로 1900~2100 전 구간을 채운다.

Skyfield 의 almanac 에는 춘하추동 넷만 있어서 15도 교차를 직접 정의한다.

실행:
  apps/web/scripts/.venv/bin/python apps/web/scripts/compute-terms.py <시작연도> <끝연도>
"""

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from skyfield import almanac
from skyfield.api import load
from skyfield.framelib import ecliptic_frame

# 황경 15도마다 절기가 하나다. 285도가 소한, 315도가 입춘이다.
TERM_NAMES = {
    285: "소한", 300: "대한", 315: "입춘", 330: "우수", 345: "경칩", 0: "춘분",
    15: "청명", 30: "곡우", 45: "입하", 60: "소만", 75: "망종", 90: "하지",
    105: "소서", 120: "대서", 135: "입추", 150: "처서", 165: "백로", 180: "추분",
    195: "한로", 210: "상강", 225: "입동", 240: "소설", 255: "대설", 270: "동지",
}

# 2000~2028 대조 구간에서 한국 표준시는 UTC+9 로 고정이다.
# 1954~1961 의 UTC+8:30 같은 이력은 엔진이 처리하므로 여기서는 UTC 도 함께 남긴다.
KST = timezone(timedelta(hours=9))


def main() -> None:
    first_year = int(sys.argv[1])
    last_year = int(sys.argv[2])

    root = Path(__file__).resolve().parent
    ts = load.timescale()
    eph = load(str(root / "de440s.bsp"))
    earth, sun = eph["earth"], eph["sun"]

    def longitude_index(t):
        """태양 겉보기 황경을 15도로 나눈 몫. 값이 바뀌는 순간이 절입이다."""
        _, lon, _ = earth.at(t).observe(sun).apparent().frame_latlon(ecliptic_frame)
        return (lon.degrees // 15).astype(int)

    longitude_index.step_days = 5.0

    # 경계 연도의 절기를 놓치지 않도록 앞뒤로 넓혀 잡는다.
    t0 = ts.utc(first_year - 1, 12, 1)
    t1 = ts.utc(last_year + 1, 2, 1)

    times, indices = almanac.find_discrete(t0, t1, longitude_index)

    terms = []
    for t, index in zip(times, indices):
        longitude = (int(index) * 15) % 360
        utc = t.utc_datetime()

        # KASI 는 분 단위로 반올림해 발표한다. 초를 버리면 295건이 1분씩 이르게 나온다.
        local = (utc + timedelta(seconds=30)).astimezone(KST).replace(second=0, microsecond=0)

        if not (first_year <= local.year <= last_year):
            continue

        terms.append({
            "name": TERM_NAMES[longitude],
            "date": local.strftime("%Y-%m-%d"),
            "time": local.strftime("%H:%M"),
            "utc": utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sunLongitude": longitude,
        })

    terms.sort(key=lambda x: x["utc"])

    payload = {
        "$comment": "Skyfield 와 DE440s 로 계산한 24절기 절입 시각. time 은 UTC+9 기준이다.",
        "source": "COMPUTED (skyfield, de440s)",
        "range": {"firstYear": first_year, "lastYear": last_year},
        "count": len(terms),
        "terms": terms,
    }

    out = root / f"computed-terms-{first_year}-{last_year}.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(terms)}건을 {out.name} 에 저장했다.")


if __name__ == "__main__":
    main()
