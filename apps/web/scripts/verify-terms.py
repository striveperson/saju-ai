"""
KASI 절기 데이터와 계산값을 대조해 불일치를 분류한다.

KASI 는 정답지가 아니라 교차검증 코퍼스다. 불일치는 "내가 틀렸다"가 아니라
"둘 중 하나가 틀렸다"이고, 황경 잔차가 작은 쪽이 이긴다.

절기는 태양 겉보기 황경이 15도의 배수가 되는 순간이므로,
각 후보 시각에서 황경을 재어 목표에서 얼마나 벗어났는지로 판정할 수 있다.

분류는 넷이다.
  TOLERATED_BOUNDARY  양쪽 다 반올림 봉투 안. 어느 쪽도 틀리지 않았다
  KASI_ERROR          계산 잔차가 KASI 잔차의 10분의 1 미만. KASI 가 틀렸다
  OUR_BUG             그 반대. 우리가 틀렸다. 종료 코드 1
  UNRESOLVED          어느 쪽도 압도하지 못했다. 사람이 본다. 종료 코드 1

MALFORMED 는 별도다. KASI 가 17:60 처럼 존재하지 않는 시각을 내보낸 경우로,
18:00 인지 17:06 오타인지 알 수 없으므로 자동 보정하지 않고 격리한다.

실행:
  apps/web/scripts/.venv/bin/python apps/web/scripts/verify-terms.py
"""

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from skyfield.api import load
from skyfield.framelib import ecliptic_frame

KST = timezone(timedelta(hours=9))
root = Path(__file__).resolve().parent

# 절기 이름이 곧 목표 황경이다. KASI 의 sunLongitude 는 696건 중 230건이 결측이라 쓰지 않는다.
TERM_LONGITUDE = {
    "소한": 285, "대한": 300, "입춘": 315, "우수": 330, "경칩": 345, "춘분": 0,
    "청명": 15, "곡우": 30, "입하": 45, "소만": 60, "망종": 75, "하지": 90,
    "소서": 105, "대서": 120, "입추": 135, "처서": 150, "백로": 165, "추분": 180,
    "한로": 195, "상강": 210, "입동": 225, "소설": 240, "대설": 255, "동지": 270,
}

# 태양은 초당 약 0.0000114도 움직인다. 분 단위로 반올림하면 참값에서 최대 30초 벌어진다.
# 양쪽 값이 이 봉투 안에 있으면 ΔT 모델이 1초만 달라도 반올림 방향이 뒤집히는 구간이라
# 어느 쪽도 틀렸다고 할 수 없다. 여유를 조금 두어 35초로 잡는다.
DEG_PER_SECOND = 0.9856 / 86400
ROUNDING_ENVELOPE_DEG = 35 * DEG_PER_SECOND

# 한쪽 잔차가 다른 쪽의 10분의 1 미만이면 그쪽이 이긴다.
DOMINANCE_RATIO = 0.1


def load_json(path: Path) -> dict:
    return json.loads(path.read_text("utf-8"))


def is_malformed(time: str) -> bool:
    hour, minute = (int(x) for x in time.split(":"))
    return not (0 <= hour <= 23 and 0 <= minute <= 59)


def longitude_at(date: str, time: str, ts, earth, sun) -> float:
    dt = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M").replace(tzinfo=KST)
    _, lon, _ = earth.at(ts.from_datetime(dt)).observe(sun).apparent().frame_latlon(ecliptic_frame)
    return lon.degrees


def residual(actual: float, target: int) -> float:
    """목표 황경에서 벗어난 각도. 부호 있는 최단 거리."""
    return (actual - target + 180) % 360 - 180


def to_seconds(deg: float) -> float:
    return deg / DEG_PER_SECOND


def check_correction(term: str, known: dict, computed: str, out: list) -> None:
    """정정 목록의 corrected 값이 실제 계산값과 같은지 본다. 어긋나면 목록이 낡은 것이다."""
    if known.get("corrected") != computed:
        out.append({"term": term, "listed": known.get("corrected"), "computed": computed})


def main() -> int:
    kasi = load_json(root / "../src/lib/saju/fixtures/kasi-solar-terms.json")
    computed = load_json(root / "computed-terms-2000-2028.json")
    corrections = load_json(root / "../src/lib/saju/fixtures/kasi-corrections.json")["entries"]
    unseen = set(corrections)

    ts = load.timescale()
    eph = load(str(root / "de440s.bsp"))
    earth, sun = eph["earth"], eph["sun"]

    by_key = {(t["name"], t["date"][:4]): t for t in computed["terms"]}
    buckets = {k: [] for k in ("TOLERATED_BOUNDARY", "KASI_ERROR", "OUR_BUG", "UNRESOLVED")}
    malformed = []
    acknowledged = []
    mismatched_corrections = []
    exact = 0

    for k in kasi["terms"]:
        key = (k["name"], k["date"][:4])
        c = by_key.get(key)
        if c is None:
            buckets["UNRESOLVED"].append({"term": f"{k['name']}@{key[1]}", "note": "계산값 없음"})
            continue

        term = f"{k['name']}@{key[1]}"
        known = corrections.get(term)
        computed_str = f"{c['date']} {c['time']}"

        if is_malformed(k["time"]):
            row = {"term": term, "kasi": f"{k['date']} {k['time']}", "computed": computed_str}
            if known:
                unseen.discard(term)
                acknowledged.append({**row, "classification": known["classification"]})
                check_correction(term, known, computed_str, mismatched_corrections)
            else:
                malformed.append(row)
            continue

        if k["date"] == c["date"] and k["time"] == c["time"]:
            exact += 1
            continue

        target = TERM_LONGITUDE[k["name"]]
        rk = abs(residual(longitude_at(k["date"], k["time"], ts, earth, sun), target))
        rc = abs(residual(longitude_at(c["date"], c["time"], ts, earth, sun), target))

        row = {
            "term": term,
            "kasi": f"{k['date']} {k['time']}",
            "computed": computed_str,
            "kasi_residual_sec": round(to_seconds(rk), 1),
            "computed_residual_sec": round(to_seconds(rc), 1),
            "true_utc": c["utc"],
        }

        # 봉투 안이면 임계값만으로 통과시킨다. 목록에 올릴 필요가 없다.
        if rk < ROUNDING_ENVELOPE_DEG and rc < ROUNDING_ENVELOPE_DEG:
            buckets["TOLERATED_BOUNDARY"].append(row)
            continue

        # 봉투 밖이면 목록에 있어야 통과한다. 임계값을 넓히는 대신 근거를 남긴다.
        if known:
            unseen.discard(term)
            acknowledged.append({**row, "classification": known["classification"]})
            check_correction(term, known, computed_str, mismatched_corrections)
            continue

        if rc < rk * DOMINANCE_RATIO:
            buckets["KASI_ERROR"].append(row)
        elif rk < rc * DOMINANCE_RATIO:
            buckets["OUR_BUG"].append(row)
        else:
            buckets["UNRESOLVED"].append(row)

    print(f"KASI {kasi['count']}건 대조")
    print(f"  완전 일치            {exact}")
    print(f"  TOLERATED_BOUNDARY   {len(buckets['TOLERATED_BOUNDARY'])}  (30초 봉투 안)")
    print(f"  ACKNOWLEDGED         {len(acknowledged)}  (kasi-corrections.json 등재)")
    print("  미등재 불일치")
    for name in ("KASI_ERROR", "OUR_BUG", "UNRESOLVED"):
        print(f"    {name:18} {len(buckets[name])}")
    print(f"    MALFORMED          {len(malformed)}")

    if acknowledged:
        by_class = {}
        for r in acknowledged:
            by_class.setdefault(r["classification"], []).append(r["term"])
        print("\nACKNOWLEDGED 분류별:")
        for cls, terms in sorted(by_class.items()):
            print(f"  {cls:22} {len(terms)}건  {', '.join(terms)}")

    if malformed:
        print("\nMALFORMED (미등재):")
        for r in malformed:
            print(f"  {r['term']:12} KASI {r['kasi']}  계산 {r['computed']}")

    for name in ("KASI_ERROR", "OUR_BUG", "UNRESOLVED"):
        if not buckets[name]:
            continue
        print(f"\n{name}:")
        for r in buckets[name]:
            if "note" in r:
                print(f"  {r['term']:12} {r['note']}")
                continue
            print(
                f"  {r['term']:12} KASI {r['kasi']} (잔차 {r['kasi_residual_sec']:.1f}초)"
                f"  계산 {r['computed']} (잔차 {r['computed_residual_sec']:.1f}초)"
                f"  참값 초 {r['true_utc'][17:19]}"
            )

    # 반올림 봉투 안의 건들이 실제로 30초 경계에 몰려 있는지 본다.
    # 몰려 있으면 닫을 수 없는 동점이고, 멀리 흩어져 있으면 다른 원인이 있다.
    if buckets["TOLERATED_BOUNDARY"]:
        offsets = []
        for r in buckets["TOLERATED_BOUNDARY"]:
            sec = int(r["true_utc"][17:19])
            offsets.append(abs(sec - 30))
        offsets.sort()
        print("\nTOLERATED_BOUNDARY 의 참값 초가 30초에서 떨어진 거리:")
        print(f"  최소 {offsets[0]}초  중앙 {offsets[len(offsets) // 2]}초  최대 {offsets[-1]}초")
        near = sum(1 for o in offsets if o <= 1)
        print(f"  30초에서 1초 이내: {near}건 / {len(offsets)}건")

    if unseen:
        print("\nSTALE (목록에 있는데 재현되지 않음. KASI 가 고쳤을 수 있다. 항목을 지운다):")
        for term in sorted(unseen):
            print(f"  {term}")

    if mismatched_corrections:
        print("\n정정 목록의 corrected 가 계산값과 다름:")
        for r in mismatched_corrections:
            print(f"  {r['term']:12} 목록 {r['listed']}  계산 {r['computed']}")

    failures = (
        len(buckets["OUR_BUG"])
        + len(buckets["UNRESOLVED"])
        + len(buckets["KASI_ERROR"])
        + len(malformed)
        + len(unseen)
        + len(mismatched_corrections)
    )
    if failures:
        print(f"\n손봐야 할 건이 {failures}건이다. 근거를 확인해 kasi-corrections.json 을 고친다.")
        return 1

    print("\n미등재 불일치 없음. 우리 쪽 오류 없음.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
