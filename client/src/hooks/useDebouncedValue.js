import { useState, useEffect } from 'react';

/**
 * Returns `value` once it has stopped changing for `delay` ms.
 *
 * Lets a search field stay fully controlled and repaint on every keystroke
 * while the request it drives only fires once the user pauses — typing
 * "keyboard" costs one request instead of eight.
 *
 * @param {*} value - the fast-changing value (usually input state)
 * @param {number} [delay=350] - quiet period before the value settles
 */
const useDebouncedValue = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    // Each new keystroke cancels the pending update, so only the last one lands.
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebouncedValue;
