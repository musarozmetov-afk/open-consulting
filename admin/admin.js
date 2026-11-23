const loginForm = document.querySelector('#login-form');
const contentForm = document.querySelector('#content-form');
const editorPanel = document.querySelector('#editor-panel');
const loginStatus = document.querySelector('#login-status');
const editorStatus = document.querySelector('#editor-status');

function setStatus(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle('success', success);
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { Accept: 'application/json', ...(options.headers || {}) }
  });
  let body = {};
  try { body = await response.json(); } catch { /* Use a plain fallback for non-JSON errors. */ }
  if (!response.ok) throw new Error(body.error || 'Не удалось выполнить запрос. Попробуйте ещё раз.');
  return body;
}

async function loadContent() {
  const content = await request('/api/admin/content');
  contentForm.elements.heroLead.value = content.heroLead;
  contentForm.elements.whatsappNumber.value = `+${content.whatsappNumber}`;
  loginForm.hidden = true;
  editorPanel.hidden = false;
  setStatus(loginStatus, '');
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  setStatus(loginStatus, 'Проверяем ключ…');
  try {
    await request('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: loginForm.elements.key.value })
    });
    loginForm.reset();
    await loadContent();
  } catch (error) {
    setStatus(loginStatus, error.message);
  } finally {
    button.disabled = false;
  }
});

contentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = contentForm.querySelector('button[type="submit"]');
  const whatsappNumber = contentForm.elements.whatsappNumber.value.replace(/\D/g, '');
  button.disabled = true;
  setStatus(editorStatus, 'Сохраняем…');
  try {
    await request('/api/admin/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        heroLead: contentForm.elements.heroLead.value,
        whatsappNumber
      })
    });
    setStatus(editorStatus, 'Изменения сохранены. Обновите главную страницу, чтобы увидеть результат.', true);
  } catch (error) {
    setStatus(editorStatus, error.message);
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#logout-button').addEventListener('click', async () => {
  await request('/api/admin/logout', { method: 'POST' }).catch(() => {});
  editorPanel.hidden = true;
  loginForm.hidden = false;
  setStatus(loginStatus, 'Вы вышли из админ-панели.', true);
});

loadContent().catch((error) => {
  if (!/Войдите в админку/.test(error.message)) setStatus(loginStatus, error.message);
});
