/**
 * Where to send someone after they sign in or register.
 *
 * The value comes from a query param, so it is attacker-controlled: anyone
 * can hand out a `/login?redirect=...` link. Since the redirect fires the
 * moment authentication succeeds, sending a freshly-logged-in user to
 * another origin is exactly the setup a phishing clone wants. So only
 * same-origin paths are allowed through; anything else falls back to home.
 *
 * React Router currently resolves off-origin values as relative paths, which
 * would blunt an attack on its own. That is the router's behaviour, though,
 * not ours — this keeps the guarantee here, where it stays true even if the
 * navigation is later swapped for `window.location`.
 *
 * @param {string | null | undefined} target Raw `redirect` param value.
 * @returns {string} A path safe to navigate to.
 */
export const safeRedirect = (target) => {
  if (typeof target !== 'string' || target === '') return '/';

  // Must be an absolute path within this app.
  if (!target.startsWith('/')) return '/';

  // `//evil.com` is protocol-relative and `/\evil.com` is treated the same
  // way by browsers — both leave the origin despite the leading slash.
  if (target.startsWith('//') || target.startsWith('/\\')) return '/';

  return target;
};

export default safeRedirect;
