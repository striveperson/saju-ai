import type { Region } from '@features/input/utils/region';

type RegionFieldProps = {
  value: Region | null;
  onOpen: () => void;
};

/**
 * 출생지. 목업 input-screen.html 의 .search-row 다.
 *
 * 필수다. 비워 두면 엔진이 서울 관례값 -30분을 쓰는데 부산은 -24분이라
 * 8분이 어긋나고 시지 경계에 걸리면 시주가 통째로 바뀐다(ADR 0019 3항).
 * 직접 칠 수 없는 것은 이름이 아니라 경도가 값이기 때문이다.
 */
const RegionField = ({ value, onOpen }: RegionFieldProps) => {
  return (
    <div className="flex flex-col gap-[9px]">
      <label className="text-[13.5px] font-semibold" htmlFor="region">
        도시
      </label>

      <div className="relative">
        <input
          type="text"
          id="region"
          readOnly
          placeholder="도나 시를 검색해 선택하세요"
          aria-describedby="region-hint"
          className="border-line bg-field text-ink placeholder:text-ink-soft rounded-card focus-visible:border-accent focus-visible:outline-accent-soft h-12 w-full cursor-pointer border pr-[50px] pl-3.5 text-[15px] focus-visible:outline-2"
          value={value?.name ?? ''}
          onClick={onOpen}
        />
        <button
          type="button"
          aria-label="출생지 검색"
          className="text-ink-mid hover:bg-accent-soft hover:text-accent focus-visible:outline-accent absolute top-1.5 right-1.5 grid size-9 cursor-pointer place-items-center rounded-[10px] border-0 bg-none focus-visible:outline-2 focus-visible:outline-offset-1"
          onClick={onOpen}
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 19 19"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="8.5"
              cy="8.5"
              r="5.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M12.8 12.8L16 16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <p className="text-ink-soft m-0 text-xs leading-normal" id="region-hint">
        태어난 곳의 경도로 시각을 보정합니다. 서울과 부산이 8분 다릅니다.
      </p>
    </div>
  );
};

export default RegionField;
