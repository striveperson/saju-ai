import { regionSearchQuery } from '@features/input/api/regions';
import { useDebounced } from '@features/input/hooks/useDebounced';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { Region } from '@features/input/utils/region';

type RegionSearchSheetProps = {
  onSelect: (region: Region) => void;
  onClose: () => void;
};

/** 글자가 멈추고 이만큼 지나야 서버를 부른다 */
const SETTLE_MS = 250;

type MessageProps = { children: string };

const Message = ({ children }: MessageProps) => {
  return (
    <li className="text-ink-soft px-3 py-7 text-center text-sm">{children}</li>
  );
};

/**
 * 출생지 검색 바텀시트. 목업 input-screen.html 의 dialog 다.
 *
 * `<dialog>` 대신 div 를 쓴다. jsdom 에 `showModal` 이 없어 그대로 두면
 * 이 시트에 렌더 테스트를 붙일 수 없다. 목업의 CSS 구현 방식은 대조 대상이 아니다.
 *
 * 닫힐 때 통째로 언마운트된다. 검색어가 남지 않는 것을 그 구조가 보장한다.
 */
const RegionSearchSheet = ({ onSelect, onClose }: RegionSearchSheetProps) => {
  const [text, setText] = useState('');
  const query = useDebounced(text, SETTLE_MS);
  const { data, isPending, isError } = useQuery(regionSearchQuery(query));

  // Esc 로 닫는 것은 브라우저가 모달 dialog 에만 해준다. div 라 직접 단다
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  };

  const found = data ?? [];
  // 친 글자로 가른다. 가라앉기를 기다리는 250ms 동안에도 이미 치고 있는 상태다.
  // 디바운스된 query 로 가르면 그 사이에 "입력하면 목록이 나옵니다" 가 떠 있다
  const typing = text.trim() !== '';

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
            onChange={handleTextChange}
          />
        </div>

        <ul className="m-0 flex-1 list-none overflow-y-auto px-2.5 pt-1.5 pb-3.5">
          {!typing && (
            <Message>도나 시 이름을 입력하면 목록이 나옵니다.</Message>
          )}
          {typing && isError && (
            <Message>
              출생지를 찾지 못했습니다. 연결을 확인하고 다시 시도해 주세요.
            </Message>
          )}
          {typing && !isError && isPending && <Message>찾는 중입니다.</Message>}
          {typing && !isError && !isPending && found.length === 0 && (
            <Message>
              검색 결과가 없습니다. 도나 시 이름을 다시 확인해 주세요.
            </Message>
          )}

          {found.map((region) => {
            const handleSelect = () => {
              onSelect(region);
            };

            return (
              <li key={region.name}>
                <button
                  type="button"
                  className="text-ink hover:bg-field focus-visible:outline-accent flex w-full cursor-pointer items-baseline justify-between gap-2.5 rounded-xl border-0 bg-none p-3 text-left text-[15px] focus-visible:outline-2 focus-visible:-outline-offset-2"
                  onClick={handleSelect}
                >
                  <span>{region.name}</span>
                  <span className="text-ink-soft text-xs whitespace-nowrap tabular-nums">
                    {`${region.longitude.toFixed(2)}°E`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};

export default RegionSearchSheet;
