"""
절기 계산값을 외부 출처 없이 검증한다.

KASI 는 2000~2028 만 덮으므로 1900~1999 와 2029~2100 에는 대조할 정답지가 없다.
그 구간에 쓸 수 있는 유일한 수단이 자체 정합성 검사다.
대한 2011 의 KASI 오류를 찾아낸 것도 절기 간격 이상이었다.

검사 여섯이다.
  1. 연도마다 24개가 있는가
  2. 시각이 순단조 증가하는가
  3. 황경이 15도씩 순서대로 진행하는가
  4. 인접 절기 간격이 14.5~15.9일 안에 있는가
  5. 간격이 연중 매끄럽게 변하는가 (이웃 간격과의 차이가 작은가)
  6. 각 항목의 황경 잔차가 0.1각초 미만인가 (반올림 전 값 기준)
  7. 춘분에서 춘분까지 평균이 365.2422일 부근인가

실행:
  apps/web/scripts/.venv/bin/python apps/web/scripts/selfcheck-terms.py computed-terms-2000-2028.json
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from skyfield.api import load
from skyfield.framelib import ecliptic_frame

root = Path(__file__).resolve().parent

DEG_PER_SECOND = 0.9856 / 86400

# 태양은 근일점(1월 초) 부근에서 가장 빠르고 원일점(7월 초)에서 가장 느리다.
# 황경 15도를 지나는 데 걸리는 시간이 그만큼 달라진다.
MIN_INTERVAL_DAYS = 14.5
MAX_INTERVAL_DAYS = 15.9

# 이웃한 두 간격의 차이. 간격은 연중 매끄럽게 변하므로 급변하면 값이 튄 것이다.
MAX_INTERVAL_JUMP_DAYS = 0.35

# utc 를 초 단위로 잘라 저장하므로 최대 1초, 즉 약 0.041각초가 남는다. 여유를 두어 0.1 로 잡는다.
MAX_RESIDUAL_ARCSEC = 0.1

TROPICAL_YEAR_DAYS = 365.2422
TROPICAL_YEAR_TOLERANCE = 0.01

TERM_LONGITUDE = {
    "소한": 285, "대한": 300, "입춘": 315, "우수": 330, "경칩": 345, "춘분": 0,
    "청명": 15, "곡우": 30, "입하": 45, "소만": 60, "망종": 75, "하지": 90,
    "소서": 105, "대서": 120, "입추": 135, "처서": 150, "백로": 165, "추분": 180,
    "한로": 195, "상강": 210, "입동": 225, "소설": 240, "대설": 255, "동지": 270,
}


class Report:
    def __init__(self) -> None:
        self.failures: list[str] = []
        self.lines: list[str] = []

    def ok(self, label: str, detail: str = "") -> None:
        self.lines.append(f"  통과  {label}{f'  {detail}' if detail else ''}")

    def fail(self, label: str, detail: str) -> None:
        self.lines.append(f"  실패  {label}  {detail}")
        self.failures.append(f"{label}: {detail}")


def parse_utc(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def main() -> int:
    path = root / sys.argv[1] if len(sys.argv) > 1 else root / "computed-terms-2000-2028.json"
    data = json.loads(path.read_text("utf-8"))
    terms = data["terms"]
    first, last = data["range"]["firstYear"], data["range"]["lastYear"]

    print(f"{path.name}  {len(terms)}건  {first}~{last}")
    r = Report()

    # 1. 연도마다 24개
    per_year: dict[str, int] = {}
    for t in terms:
        per_year[t["date"][:4]] = per_year.get(t["date"][:4], 0) + 1
    bad_years = {y: n for y, n in per_year.items() if n != 24}
    missing_years = [str(y) for y in range(first, last + 1) if str(y) not in per_year]
    if bad_years or missing_years:
        r.fail("연도별 24개", f"어긋난 연도 {bad_years}  빠진 연도 {missing_years}")
    else:
        r.ok("연도별 24개", f"{len(per_year)}개 연도")

    # 2. 시각 순단조
    times = [parse_utc(t["utc"]) for t in terms]
    out_of_order = [i for i in range(1, len(times)) if times[i] <= times[i - 1]]
    if out_of_order:
        r.fail("시각 순단조", f"{len(out_of_order)}곳에서 역행. 첫 위치 {out_of_order[0]}")
    else:
        r.ok("시각 순단조")

    # 3. 황경이 15도씩 진행
    wrong_step = []
    for i in range(1, len(terms)):
        prev = TERM_LONGITUDE[terms[i - 1]["name"]]
        cur = TERM_LONGITUDE[terms[i]["name"]]
        if (cur - prev) % 360 != 15:
            wrong_step.append(f"{terms[i - 1]['name']}({prev})->{terms[i]['name']}({cur})")
    if wrong_step:
        r.fail("황경 15도 진행", f"{len(wrong_step)}곳. 예: {wrong_step[:3]}")
    else:
        r.ok("황경 15도 진행")

    # 4. 인접 간격 범위
    intervals = [(times[i] - times[i - 1]).total_seconds() / 86400 for i in range(1, len(times))]
    out_of_range = [
        (terms[i + 1]["name"], terms[i + 1]["date"], round(d, 3))
        for i, d in enumerate(intervals)
        if not (MIN_INTERVAL_DAYS <= d <= MAX_INTERVAL_DAYS)
    ]
    if out_of_range:
        r.fail("간격 범위", f"{MIN_INTERVAL_DAYS}~{MAX_INTERVAL_DAYS}일 벗어남 {out_of_range[:5]}")
    else:
        r.ok("간격 범위", f"최소 {min(intervals):.3f}일  최대 {max(intervals):.3f}일")

    # 5. 간격이 매끄럽게 변하는가
    jumps = [
        (terms[i + 2]["name"], terms[i + 2]["date"], round(abs(intervals[i + 1] - intervals[i]), 3))
        for i in range(len(intervals) - 1)
        if abs(intervals[i + 1] - intervals[i]) > MAX_INTERVAL_JUMP_DAYS
    ]
    if jumps:
        r.fail("간격 연속성", f"이웃 간격 차이가 {MAX_INTERVAL_JUMP_DAYS}일 초과 {jumps[:5]}")
    else:
        biggest = max(abs(intervals[i + 1] - intervals[i]) for i in range(len(intervals) - 1))
        r.ok("간격 연속성", f"최대 급변 {biggest:.3f}일")

    # 6. 황경 잔차
    ts = load.timescale()
    eph = load(str(root / "de440s.bsp"))
    earth, sun = eph["earth"], eph["sun"]

    worst = (0.0, "")
    over = []
    for t in terms:
        target = TERM_LONGITUDE[t["name"]]
        _, lon, _ = (
            earth.at(ts.from_datetime(parse_utc(t["utc"])))
            .observe(sun)
            .apparent()
            .frame_latlon(ecliptic_frame)
        )
        res = abs((lon.degrees - target + 180) % 360 - 180) * 3600
        if res > worst[0]:
            worst = (res, f"{t['name']}@{t['date'][:4]}")
        if res > MAX_RESIDUAL_ARCSEC:
            over.append((f"{t['name']}@{t['date'][:4]}", round(res, 4)))
    if over:
        r.fail("황경 잔차", f"{MAX_RESIDUAL_ARCSEC}각초 초과 {len(over)}건. 예: {over[:5]}")
    else:
        r.ok("황경 잔차", f"최대 {worst[0]:.4f}각초 ({worst[1]})")

    # 7. 춘분에서 춘분
    equinoxes = [parse_utc(t["utc"]) for t in terms if t["name"] == "춘분"]
    if len(equinoxes) < 2:
        r.ok("춘분 주기", "춘분이 둘 미만이라 건너뜀")
    else:
        gaps = [
            (equinoxes[i] - equinoxes[i - 1]).total_seconds() / 86400
            for i in range(1, len(equinoxes))
        ]
        mean = sum(gaps) / len(gaps)
        if abs(mean - TROPICAL_YEAR_DAYS) > TROPICAL_YEAR_TOLERANCE:
            r.fail("춘분 주기", f"평균 {mean:.5f}일. 기대 {TROPICAL_YEAR_DAYS}일")
        else:
            r.ok("춘분 주기", f"평균 {mean:.5f}일 (기대 {TROPICAL_YEAR_DAYS})")

    print("\n".join(r.lines))

    if r.failures:
        print(f"\n{len(r.failures)}개 검사가 실패했다.")
        return 1

    print("\n자체 정합성 검사 전부 통과.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
