/**
 * AI 해석 자리. 아직 생성 경로가 없어 빈 상태만 낸다.
 *
 * 생성 버튼을 두지 않는다. 누를 곳이 없는 버튼을 두면 눌러 보고 아무 일도 안 난다.
 */
const InterpretationEmpty = () => {
  return (
    <p className="border-line-strong text-ink-soft m-0 rounded-xl border border-dashed px-3.5 py-5 text-center text-[13px] leading-relaxed">
      아직 해석을 만들지 않았습니다.
      <br />
      해석은 위 판정 결과만 넣어 만듭니다.
    </p>
  );
};

export default InterpretationEmpty;
