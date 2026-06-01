import { useEffect, useRef, type DependencyList } from "react";

/**
 * Anti-Gravity SafeEffect
 * 
 * A wrapper around useEffect that:
 * 1. Ensures the callback only runs if the component is mounted.
 * 2. Prevents stale closure issues by keeping a ref to the latest callback.
 * 3. Provides a "safe" object that can be used to check mount status inside async operations.
 */
export function useSafeEffect(
  callback: (isMounted: () => boolean) => void | (() => void),
  deps: DependencyList
) {
  const isMounted = useRef(true);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    isMounted.current = true;
    
    const checkMounted = () => isMounted.current;
    const cleanup = callbackRef.current(checkMounted);

    return () => {
      isMounted.current = false;
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * useSafeInterval
 * Prevents overlapping intervals and stale state updates
 */
export function useSafeInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
