import { useLayoutEffect } from 'react';
import usePrevious from './usePrevious';

const useLayoutEffectWithPrevDeps = <const T extends readonly any[]>(
  cb: (args: T | readonly []) => void,
  dependencies: T,
  debugKey?: string
) => {
  const prevDeps = usePrevious<T>(dependencies);
  return useLayoutEffect(() => {
    return cb(prevDeps || []);
    // eslint-disable-next-line react-hooks-static-deps/exhaustive-deps
  }, dependencies);
};

export default useLayoutEffectWithPrevDeps;
