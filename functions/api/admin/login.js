import { createSessionCookie, isSameOrigin, jsonResponse, matchesAdminKey } from '../../_lib/admin-auth.js';

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return jsonResponse({ error: 'Запрос отклонён.' }, 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Проверьте данные и попробуйте ещё раз.' }, 400);
  }

  const key = typeof body.key === 'string' ? body.key : '';
  if (!await matchesAdminKey(key, env)) {
    return jsonResponse({ error: 'Ключ не подошёл. Проверьте его и попробуйте снова.' }, 401);
  }

  return jsonResponse({ ok: true }, 200, { 'Set-Cookie': await createSessionCookie(env) });
}
