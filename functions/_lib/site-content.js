export const DEFAULT_SITE_CONTENT = Object.freeze({
  heroLead: 'Наводим порядок в цифрах, документах и процессах, чтобы вы могли сосредоточиться на росте.',
  whatsappNumber: '77753699415'
});

function getRestUrl(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new Error('Supabase is not configured in Cloudflare Pages secrets');
  }
  const baseUrl = env.SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  return `${baseUrl}/rest/v1/site_content`;
}

function supabaseHeaders(env) {
  return {
    apikey: env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json'
  };
}

export async function readSiteContent(env) {
  const response = await fetch(`${getRestUrl(env)}?select=content&id=eq.main`, {
    headers: supabaseHeaders(env)
  });
  if (!response.ok) throw new Error(`Supabase read failed (${response.status})`);
  const rows = await response.json();
  return { ...DEFAULT_SITE_CONTENT, ...(rows[0]?.content || {}) };
}

export async function writeSiteContent(env, content) {
  const response = await fetch(`${getRestUrl(env)}?on_conflict=id`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders(env),
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({ id: 'main', content, updated_at: new Date().toISOString() })
  });
  if (!response.ok) throw new Error(`Supabase write failed (${response.status})`);
}

export function validateSiteContent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const heroLead = typeof value.heroLead === 'string' ? value.heroLead.trim() : '';
  const whatsappNumber = typeof value.whatsappNumber === 'string' ? value.whatsappNumber.replace(/\D/g, '') : '';
  if (heroLead.length < 10 || heroLead.length > 240) return null;
  if (!/^7\d{10}$/.test(whatsappNumber)) return null;
  return { heroLead, whatsappNumber };
}
