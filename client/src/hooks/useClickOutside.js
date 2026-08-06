import { useEffect } from 'react';

/**
 * Calls `onOutsideClick` when a click/touch lands outside the given ref's element.
 * Used to close dropdowns/menus when the user clicks anywhere else on the page.
 * @param {import('react').RefObject<HTMLElement>} ref
 * @param {() => void} onOutsideClick
 */
const useClickOutside = (ref, onOutsideClick) => {
  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onOutsideClick();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, onOutsideClick]);
};

export default useClickOutside;
