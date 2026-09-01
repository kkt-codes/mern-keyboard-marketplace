import { createContext } from 'react';

/**
 * The context objects, kept apart from the providers that fill them.
 *
 * Vite's fast refresh can only hot-update a module that exports components
 * and nothing else. A file exporting both a provider component and a context
 * object falls back to a full page reload on every edit, which in practice
 * means losing your place — logged-in state, an open cart, a half-filled
 * form — each time you touch one of these files.
 */
export const AuthContext = createContext();
export const CartContext = createContext();
export const BookmarkContext = createContext();
