type HeaderProps = {
  title?: string;
};

/**
 * 지면 위의 상단 바. 목업 두 HTML 의 `.topbar` 다.
 *
 * `title` 로 문구를 갈 수 있게 열어 둔 것은 지면마다 다를 자리라서다.
 * 기본값은 서비스 이름이고 목업 둘 다 그것을 쓴다.
 */
const Header = ({ title = 'AI 사주해석' }: HeaderProps) => {
  return (
    <header className="bg-header border-header-line text-header-ink grid h-[54px] place-items-center border-b px-4 text-[17px] font-semibold">
      {title}
    </header>
  );
};

export default Header;
