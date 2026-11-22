const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.nav');

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Открыть меню' : 'Закрыть меню');
  navigation.classList.toggle('open', !isOpen);
});

navigation.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Открыть меню');
  });
});

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
document.querySelector('#year').textContent = new Date().getFullYear();

const form = document.querySelector('#contact-form');
const phoneInput = form.elements.phone;
const formStatus = form.querySelector('.form-status');

phoneInput.addEventListener('input', () => {
  phoneInput.setCustomValidity('');
  formStatus.textContent = '';
  formStatus.classList.remove('success', 'error');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const digits = phoneInput.value.replace(/\D/g, '');
  if (digits.length < 10) {
    phoneInput.setCustomValidity('Укажите корректный номер телефона.');
    phoneInput.reportValidity();
    return;
  }

  const endpoint = window.OPEN_CONSULTING_FORM_ENDPOINT;
  if (!endpoint || !/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint)) {
    formStatus.textContent = 'Форма пока не подключена. Добавьте endpoint Formspree в form-config.js.';
    formStatus.classList.add('error');
    return;
  }

  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  formStatus.textContent = 'Отправляем заявку…';
  formStatus.classList.remove('success', 'error');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form)
    });
    const result = await response.json();
    if (!response.ok) {
      const validationError = result.errors?.map((item) => item.message).join(' ');
      throw new Error(validationError || 'Сервис не принял заявку. Проверьте форму и попробуйте ещё раз.');
    }

    form.reset();
    formStatus.textContent = 'Спасибо! Заявка отправлена. Мы свяжемся с вами.';
    formStatus.classList.add('success');
  } catch (error) {
    formStatus.textContent = error.message || 'Не удалось отправить заявку. Проверьте подключение к интернету и повторите попытку.';
    formStatus.classList.add('error');
  } finally {
    submitButton.disabled = false;
  }
});
