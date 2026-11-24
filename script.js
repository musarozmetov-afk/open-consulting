const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.nav');
const localize = (text) => window.siteI18n ? window.siteI18n.t(text) : text;

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', localize(isOpen ? 'Открыть меню' : 'Закрыть меню'));
  navigation.classList.toggle('open', !isOpen);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', localize('Открыть меню'));
    navigation.classList.remove('open');
    menuButton.focus();
  }
});

document.addEventListener('click', (event) => {
  if (!navigation.contains(event.target) && !menuButton.contains(event.target)) {
    navigation.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', localize('Открыть меню'));
  }
});

navigation.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', localize('Открыть меню'));
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

const serviceSelect = document.querySelector('#contact-form select[name="service"]');
document.querySelectorAll('[data-service]').forEach((link) => {
  link.addEventListener('click', () => {
    if (serviceSelect) serviceSelect.value = link.dataset.service;
  });
});

function applyWhatsappNumber(value) {
  const whatsappNumber = String(value || '').replace(/\D/g, '');
  if (/^7\d{10}$/.test(whatsappNumber)) {
    const formattedNumber = `+7 ${whatsappNumber.slice(1, 4)} ${whatsappNumber.slice(4, 7)} ${whatsappNumber.slice(7, 9)} ${whatsappNumber.slice(9)}`;
    document.querySelectorAll('.contact-whatsapp, .whatsapp-float').forEach((link) => {
      link.href = `https://wa.me/${whatsappNumber}`;
    });
    document.querySelector('#contact-phone').textContent = formattedNumber;
  }
}

applyWhatsappNumber(window.OPEN_CONSULTING_WHATSAPP);

fetch('/api/site-content')
  .then((response) => response.ok ? response.json() : null)
  .then((content) => {
    if (!content) return;
    if (typeof content.heroLead === 'string') {
      const heroLead = document.querySelector('.hero-lead');
      heroLead.textContent = content.heroLead;
      window.siteI18n?.refreshNode(heroLead.firstChild);
      window.siteI18n?.apply(window.siteI18n.current());
    }
    if (content.whatsappNumber) applyWhatsappNumber(content.whatsappNumber);
  })
  .catch(() => {});

const form = document.querySelector('#contact-form');
const phoneInput = form.elements.phone;
const formStatus = form.querySelector('.form-status');
const callbackCheckbox = form.elements.callback_request;
const callbackTimeWrap = document.querySelector('#callback-time-wrap');

document.addEventListener('site-language-change', () => {
  if (phoneInput.validity.customError) phoneInput.setCustomValidity(localize('Укажите корректный номер телефона.'));
});

function setFormStatus(message, stateClass) {
  formStatus.dataset.sourceMessage = message;
  formStatus.textContent = localize(message);
  formStatus.classList.remove('success', 'error');
  if (stateClass) formStatus.classList.add(stateClass);
}

function updateCallbackFields() {
  callbackTimeWrap.hidden = !callbackCheckbox.checked;
}

callbackCheckbox.addEventListener('change', updateCallbackFields);
updateCallbackFields();

phoneInput.addEventListener('input', () => {
  phoneInput.setCustomValidity('');
  delete formStatus.dataset.sourceMessage;
  formStatus.textContent = '';
  formStatus.classList.remove('success', 'error');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const digits = phoneInput.value.replace(/\D/g, '');
  if (digits.length < 10) {
    phoneInput.setCustomValidity(localize('Укажите корректный номер телефона.'));
    phoneInput.reportValidity();
    return;
  }

  const endpoint = window.OPEN_CONSULTING_FORM_ENDPOINT;
  if (!endpoint || !/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint)) {
    setFormStatus('Форма пока не подключена. Добавьте endpoint Formspree в form-config.js.', 'error');
    return;
  }

  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  setFormStatus('Отправляем заявку…');

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
    updateCallbackFields();
    setFormStatus('Спасибо! Заявка отправлена. Мы свяжемся с вами.', 'success');
  } catch (error) {
    setFormStatus(error.message || 'Не удалось отправить заявку. Проверьте подключение к интернету и повторите попытку.', 'error');
  } finally {
    submitButton.disabled = false;
  }
});
