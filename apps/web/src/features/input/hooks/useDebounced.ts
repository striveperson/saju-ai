import { useEffect, useState } from 'react';

/**
 * 값이 멈춘 뒤에야 따라간다.
 *
 * 출생지 검색이 글자마다 카카오를 부르지 않게 하는 것이다.
 * `useDeferredValue` 로는 안 된다. 그쪽은 렌더 우선순위를 미룰 뿐이라
 * 한가해지면 결국 글자 수만큼 요청이 나간다.
 */
export const useDebounced = <T>(value: T, ms: number): T => {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(value);
    }, ms);

    return () => {
      clearTimeout(timer);
    };
  }, [value, ms]);

  return settled;
};
