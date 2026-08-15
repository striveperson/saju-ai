import type { ReactNode } from 'react';

type ShellProps = {
  children: ReactNode;
};

/**
 * 다섯 지면을 담는 껍데기. 목업 두 HTML 의 `.phone` 이다.
 *
 * 다섯이 다 쓰므로 `components/` 에 둔다. 사주를 모른다.
 * 넓은 화면에서는 402px 로 묶어 가운데 놓는다. 앱 웹뷰 폭에 맞춘 값이다.
 *
 * 상단 바를 품지 않는다. 지면마다 머리가 달라질 수 있어서다.
 * 공유 지면은 링크로 열리는 읽기 전용이고 설정은 뒤로가기가 붙는다.
 * 조립은 `__root.tsx` 가 한다.
 */
const Shell = ({ children }: ShellProps) => {
  return (
    <div className="bg-ground min-h-screen sm:px-4 sm:py-8">
      <div className="bg-frame shadow-frame mx-auto flex min-h-screen w-full max-w-[402px] flex-col overflow-hidden sm:min-h-[calc(100vh-4rem)] sm:rounded-[26px]">
        {children}
      </div>
    </div>
  );
};

export default Shell;
