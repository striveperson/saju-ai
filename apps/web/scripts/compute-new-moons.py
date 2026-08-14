"""
Skyfield 로 합삭(合朔) 순간을 계산한다.

합삭은 달과 태양의 겉보기 황경이 같아지는 순간이고 음력 달의 시작을 정한다.
음력표를 우리가 만들려는 것이 아니라(ADR 0006 이 금지한다) KASI 에서 받은 표를
대조하기 위한 것이다. 판정은 check-lunar-newmoon.mjs 가 한다.

계산 방식은 compute-terms.py 와 같다. 황경 정의를 이분법으로 풀고 근사 공식을 쓰지 않는다.

실행:
  apps/web/scripts/.venv/bin/python apps/web/scripts/compute-new-moons.py <시작연도> <끝연도>
"""

import json
import sys
from pathlib import Path

from skyfield import almanac
from skyfield.api import load
from skyfield.framelib import ecliptic_frame


def main() -> None:
    first_year = int(sys.argv[1])
    last_year = int(sys.argv[2])

    root = Path(__file__).resolve().parent
    ts = load.timescale()
    eph = load(str(root / "de440s.bsp"))
    earth, sun, moon = eph["earth"], eph["sun"], eph["moon"]

    def phase_quarter(t):
        """달과 태양의 겉보기 황경차를 90도로 나눈 몫. 0 으로 바뀌는 순간이 합삭이다."""
        observer = earth.at(t)
        _, sun_lon, _ = observer.observe(sun).apparent().frame_latlon(ecliptic_frame)
        _, moon_lon, _ = observer.observe(moon).apparent().frame_latlon(ecliptic_frame)
        return ((moon_lon.degrees - sun_lon.degrees) % 360.0 // 90).astype(int)

    # 삭에서 상현까지가 약 7.4일이라 그보다 짧게 잡아야 구간을 건너뛰지 않는다.
    phase_quarter.step_days = 5.0

    t0 = ts.utc(first_year, 1, 1)
    t1 = ts.utc(last_year + 1, 1, 1)

    times, quarters = almanac.find_discrete(t0, t1, phase_quarter)

    new_moons = [
        t.utc_datetime().strftime("%Y-%m-%dT%H:%M:%SZ")
        for t, quarter in zip(times, quarters)
        if int(quarter) == 0
    ]

    out = root / "computed-new-moons.json"
    payload = {
        "$comment": (
            "Skyfield 와 DE440s 로 계산한 합삭 순간(UTC). "
            "KASI 음력표를 대조하는 데만 쓴다. 자동 생성이라 손으로 고치지 않는다."
        ),
        "source": "Skyfield + JPL DE440s",
        "range": {"firstYear": first_year, "lastYear": last_year},
        "count": len(new_moons),
        "newMoons": new_moons,
    }
    out.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"합삭 {len(new_moons)}개를 {out.name} 에 저장했다.")


if __name__ == "__main__":
    main()
