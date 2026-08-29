import { regionSearchQuery } from '@features/input/api/regions';
import { useDebounced } from '@features/input/hooks/useDebounced';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CatchBoundary } from '@tanstack/react-router';
import { Suspense, useEffect, useState } from 'react';

import type { Region } from '@features/input/utils/region';

type RegionSearchSheetProps = {
  onSelect: (region: Region) => void;
  onClose: () => void;
};

/** delay time */
const SETTLE_MS = 250;

type MessageProps = { children: string };

const Message = ({ children }: MessageProps) => {
  return (
    <li className="text-ink-soft px-3 py-7 text-center text-sm">{children}</li>
  );
};

const SEARCHING = <Message>찾는 중입니다.</Message>;

const SearchFailed = () => {
  return (
    <Message>
      도시를 찾지 못했습니다. 연결을 확인하고 다시 시도해 주세요.
    </Message>
  );
};

type RegionResultsProps = {
  query: string;
  onSelect: (region: Region) => void;
};

const RegionResults = ({ query, onSelect }: RegionResultsProps) => {
  const { data } = useSuspenseQuery(regionSearchQuery(query));

  if (data.length === 0) {
    return (
      <Message>
        검색 결과가 없습니다. 도나 시 이름을 다시 확인해 주세요.
      </Message>
    );
  }

  return (
    <>
      {data.map((region) => {
        return (
          <li key={region.name}>
            <button
              type="button"
              className="text-ink hover:bg-field focus-visible:outline-accent flex w-full cursor-pointer items-baseline justify-between gap-2.5 rounded-xl border-0 bg-none p-3 text-left text-[15px] focus-visible:outline-2 focus-visible:-outline-offset-2"
              onClick={() => onSelect(region)}
            >
              <span>{region.name}</span>
            </button>
          </li>
        );
      })}
    </>
  );
};

const RegionSearchSheet = ({ onSelect, onClose }: RegionSearchSheetProps) => {
  const [text, setText] = useState('');
  const query = useDebounced(text, SETTLE_MS);

  const typing = text.trim() !== '';
  const settled = query.trim() !== '';

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="bg-scrim absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="출생지 검색"
        className="bg-frame rounded-t-sheet relative flex max-h-[78vh] w-full max-w-[402px] flex-col overflow-hidden"
      >
        <div className="border-line flex flex-col gap-3 border-b px-[18px] pt-4 pb-3">
          <div className="flex items-center justify-between text-[15px] font-semibold">
            출생지 검색
            <button
              type="button"
              aria-label="닫기"
              className="text-ink-soft cursor-pointer border-0 bg-none px-1 text-xl leading-none"
              onClick={onClose}
            >
              ×
            </button>
          </div>
          <input
            type="text"
            autoFocus
            aria-label="출생지 검색어"
            placeholder="도나 시 이름을 입력하세요"
            className="border-line bg-field text-ink placeholder:text-ink-soft rounded-card focus-visible:border-accent focus-visible:outline-accent-soft h-12 w-full border px-3.5 text-[15px] focus-visible:outline-2"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>

        <ul className="m-0 flex-1 list-none overflow-y-auto px-2.5 pt-1.5 pb-3.5">
          {!typing && (
            <Message>도나 시 이름을 입력하면 목록이 나옵니다.</Message>
          )}
          {typing && !settled && SEARCHING}
          {typing && settled && (
            <CatchBoundary
              getResetKey={() => query}
              errorComponent={SearchFailed}
            >
              <Suspense fallback={SEARCHING}>
                <RegionResults query={query} onSelect={onSelect} />
              </Suspense>
            </CatchBoundary>
          )}
        </ul>
      </section>
    </div>
  );
};

export default RegionSearchSheet;
