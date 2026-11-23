import { isSameOrigin, jsonResponse } from '../../_lib/admin-auth.js';

export async function onRequestPost({ request }) {
  if (!isSameOrigin(request)) return jsonResponse({ error: 'Запрос отклонён.' }, 403);
  return jsonResponse({ ok: true }, 200, {
    'Set-Cookie': 'oc_admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
  });
}
