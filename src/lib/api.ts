/**
 * Where the API lives.
 *
 * On Vercel the functions under api/ shared the site's origin, so every call
 * was a relative `/api/...`. On Amplify (2026-09-29) the static site and the
 * API are different origins: the functions run as one Lambda behind
 * CloudFront, and VITE_API_BASE names it at build time. Unset, calls stay
 * relative, which is what local development and a same-origin host want.
 */
const BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");

export const api = (path: string) => `${BASE}${path}`;
