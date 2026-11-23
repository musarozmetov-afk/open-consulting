# Защищённая админ-панель OPEN CONSULTING

Адрес панели: `/admin/`. Проверка ключа выполняется в Cloudflare Pages Functions. Ключ не хранится в браузере или GitHub; сервер выдаёт подписанную HttpOnly-сессию на 12 часов. Панель позволяет менять подзаголовок главного экрана и номер WhatsApp.

## 1. Создать закрытую таблицу Supabase

В Supabase откройте **SQL Editor → New query**, вставьте содержимое `supabase/admin-schema.sql` и нажмите **Run**. Таблица закрыта RLS и доступна только серверной роли.

## 2. Создать серверный ключ Supabase

В Supabase откройте **Project Settings → API Keys** и создайте secret API key (`sb_secret_...`). Не используйте пароль базы данных и не отправляйте secret key в чат.

## 3. Добавить Cloudflare Pages secrets

В проекте Cloudflare откройте **Settings → Variables and Secrets → Add**. Создайте все три значения именно как **Secret / Encrypt**:

- `ADMIN_KEY` — ключ админки.
- `SUPABASE_URL` — `https://glluvcikyhwprvlwbdkm.supabase.co` (без `/rest/v1/`).
- `SUPABASE_SECRET_KEY` — secret API key из Supabase.

Сохраните secrets для **Production**, затем запустите новый production deploy.

## 4. Войти

Откройте `https://openconsulting.pages.dev/admin/` и введите значение `ADMIN_KEY`. Пароль базы и Supabase secret key для входа в админку не используются.
