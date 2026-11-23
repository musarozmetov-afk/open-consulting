import { jsonResponse } from '../_lib/admin-auth.js';
import { readSiteContent } from '../_lib/site-content.js';

export async function onRequestGet({ env }) {
  try {
    const content = await readSiteContent(env);
    return jsonResponse({ heroLead: content.heroLead, whatsappNumber: content.whatsappNumber }, 200, {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
    });
  } catch {
    return jsonResponse({ error: 'Настройки сайта пока недоступны.' }, 503);
  }
}
