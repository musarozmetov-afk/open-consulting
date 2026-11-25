create table if not exists public.site_content (
  id text primary key check (id = 'main'),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;
revoke all on table public.site_content from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.site_content to service_role;

insert into public.site_content (id, content)
values (
  'main',
  '{"heroLead":"Наводим порядок в цифрах, документах и процессах, чтобы вы могли сосредоточиться на росте.","whatsappNumber":"77075885577"}'::jsonb
)
on conflict (id) do nothing;
