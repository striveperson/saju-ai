import type { ReactNode } from 'react';

type ShellProps = {
  children: ReactNode;
};

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
