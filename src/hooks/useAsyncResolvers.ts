import useThrottledCallback from './useThrottledCallback';
import useDebouncedCallback from './useDebouncedCallback';
import useDerivedSignal from './useDerivedSignal';
import { Signal } from '../util/signals';

export function useThrottledResolver<T>(
  resolver: () => T,
  deps: any[],
  ms: number,
  noFirst = false
) {
  return useThrottledCallback(
    (setValue: (newValue: T) => void) => {
      setValue(resolver());
      // eslint-disable-next-line react-hooks-static-deps/exhaustive-deps
    },
    deps,
    ms,
    noFirst
  );
}

export function useDebouncedResolver<T>(
  resolver: () => T,
  deps: any[],
  ms: number,
  noFirst = false,
  noLast = false
) {
  return useDebouncedCallback(
    (setValue: (newValue: T) => void) => {
      setValue(resolver());
      // eslint-disable-next-line react-hooks-static-deps/exhaustive-deps
    },
    deps,
    ms,
    noFirst,
    noLast
  );
}

export function useDebouncedSignal<T extends any>(
  getValue: Signal<T>,
  ms: number,
  noFirst = false,
  noLast = false
): Signal<T> {
  const debouncedResolver = useDebouncedResolver(
    () => getValue(),
    [getValue],
    ms,
    noFirst,
    noLast
  );

  return useDerivedSignal(
    debouncedResolver,
    [debouncedResolver, getValue],
    true
  );
}
