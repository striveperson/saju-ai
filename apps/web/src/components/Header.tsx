type HeaderProps = {
  title?: string;
};

const Header = ({ title = 'AI 사주해석' }: HeaderProps) => {
  return (
    <header className="bg-header border-header-line text-header-ink grid h-[54px] place-items-center border-b px-4 text-[17px] font-semibold">
      {title}
    </header>
  );
};

export default Header;
