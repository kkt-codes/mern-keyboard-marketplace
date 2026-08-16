import { FaKeyboard, FaWifi, FaGamepad, FaFeatherAlt, FaPalette } from 'react-icons/fa';

/**
 * Canonical category list, shared between the homepage's "Shop by Category"
 * cards and the Products page's category filter so they stay in sync.
 */
export const CATEGORIES = [
  { label: 'Mechanical', icon: FaKeyboard },
  { label: 'Wireless', icon: FaWifi },
  { label: 'Gaming', icon: FaGamepad },
  { label: 'Compact', icon: FaFeatherAlt },
  { label: 'Custom', icon: FaPalette },
];
