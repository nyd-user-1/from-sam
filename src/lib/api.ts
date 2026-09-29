/**
 * Where the API lives, and how to call it.
 *
 * On Vercel the functions under api/ shared the site's origin, so every call
 * was a relative `/api/...`. On Amplify (2026-09-29) the static site and the
 * API are different origins: the functions run as one Lambda behind
 * CloudFront, and VITE_API_BASE names it at build time. Unset, calls stay
 * relative, which is what local development and a same-origin host want.
 *
 * CloudFront signs each request to the function URL, and a signed request
 * that carries a body must also carry the body's SHA-256 in
 * `x-amz-content-sha256` — CloudFront does not compute it. `apiFetch` adds
 * it, so every call in the app goes through here rather than through
 * `fetch` directly.
 */
const BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");

export const api = (path: string) => `${BASE}${path}`;

const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

async function sha256Hex(body: string): Promise<string> {
  if (!body) return EMPTY_SHA256;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  if (BASE) {
    const body = typeof init.body === "string" ? init.body : "";
    headers.set("x-amz-content-sha256", await sha256Hex(body));
  }
  return fetch(api(path), { ...init, headers });
}
