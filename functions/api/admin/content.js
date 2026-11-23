import { hasAdminSession, isSameOrigin, jsonResponse } from '../../_lib/admin-auth.js';
import { readSiteContent, validateSiteContent, writeSiteContent } from '../../_lib/site-content.js';

export async function onRequestGet({ request, env }) {
  if (!await hasAdminSession(request, env)) return jsonResponse({ error: 'Войдите в админку.' }, 401);
  try {
    return jsonResponse(await readSiteContent(env));
  } catch {
    return jsonResponse({ error: 'Не удалось загрузить настройки сайта. Проверьте подключение Supabase.' }, 503);
  }
}

export async function onRequestPut({ request, env }) {
  if (!isSameOrigin(request)) return jsonResponse({ error: 'Запрос отклонён.' }, 403);
  if (!await hasAdminSession(request, env)) return jsonResponse({ error: 'Сеанс завершён. Войдите ещё раз.' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Проверьте заполненные поля.' }, 400);
  }

  const content = validateSiteContent(body);
  if (!content) return jsonResponse({ error: 'Проверьте текст и номер WhatsApp.' }, 400);
  try {
    await writeSiteContent(env, content);
    return jsonResponse({ ok: true });
  } catch {
    return jsonResponse({ error: 'Не удалось сохранить настройки. Проверьте таблицу Supabase и секреты Cloudflare.' }, 503);
  }
}
