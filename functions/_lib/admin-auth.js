const COOKIE_NAME = 'oc_admin_session';
const SESSION_SECONDS = 60 * 60 * 12;

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sessionKey(env) {
  if (!env.ADMIN_KEY) throw new Error('ADMIN_KEY is not configured');
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.ADMIN_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSessionCookie(env) {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS
  })));
  const signature = await crypto.subtle.sign('HMAC', await sessionKey(env), new TextEncoder().encode(payload));
  return `${COOKIE_NAME}=${payload}.${toBase64Url(new Uint8Array(signature))}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}`;
}

export async function hasAdminSession(request, env) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return false;

  try {
    const token = cookie.slice(COOKIE_NAME.length + 1);
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return false;
    const valid = await crypto.subtle.verify('HMAC', await sessionKey(env), fromBase64Url(signature), new TextEncoder().encode(payload));
    if (!valid) return false;
    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    return Number.isInteger(session.exp) && session.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function matchesAdminKey(candidate, env) {
  if (!env.ADMIN_KEY || !candidate) return false;
  const encoder = new TextEncoder();
  const [candidateHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(candidate)),
    crypto.subtle.digest('SHA-256', encoder.encode(env.ADMIN_KEY))
  ]);
  const left = new Uint8Array(candidateHash);
  const right = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function isSameOrigin(request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', ...extraHeaders }
  });
}
