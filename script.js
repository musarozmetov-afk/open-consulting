document.documentElement.classList.add('js');

// Lift the header with a soft shadow once the page is scrolled.
const header = document.querySelector('.header');
const updateHeaderShadow = () => header.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', updateHeaderShadow, { passive: true });
updateHeaderShadow();

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

// Hero video: a pause control, no autoplay for reduced-motion or data-saver visitors,
// and no playback while it is off screen.
const heroVideo = document.querySelector('.hero-video');
const videoToggle = document.querySelector('.video-toggle');
if (heroVideo && videoToggle) {
  const setPaused = (paused) => {
    videoToggle.setAttribute('aria-pressed', String(paused));
    videoToggle.setAttribute('aria-label', localize(paused ? 'Воспроизвести видео' : 'Остановить видео'));
  };
  let pausedByVisitor = false;
  const prefersStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData;
  if (prefersStill) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
    pausedByVisitor = true;
  }
  setPaused(heroVideo.paused || pausedByVisitor);
  videoToggle.addEventListener('click', () => {
    pausedByVisitor = !heroVideo.paused;
    if (pausedByVisitor) heroVideo.pause(); else heroVideo.play().catch(() => {});
    setPaused(pausedByVisitor);
  });
  heroVideo.addEventListener('play', () => setPaused(false));
  heroVideo.addEventListener('pause', () => setPaused(true));
  document.addEventListener('site-language-change', () => setPaused(heroVideo.paused));
  new IntersectionObserver(([entry]) => {
    if (pausedByVisitor) return;
    if (entry.isIntersecting) heroVideo.play().catch(() => {}); else heroVideo.pause();
  }).observe(heroVideo);
}

// Cards in a group appear one after another; the delay is cleared afterwards so hover stays instant.
document.querySelectorAll('.service-grid, .benefit-grid, .offer-grid, .steps, .case-list, .principles-row').forEach((group) => {
  [...group.children].filter((child) => child.classList.contains('reveal')).forEach((child, index) => {
    child.style.setProperty('--i', index);
    child.addEventListener('transitionend', () => child.style.removeProperty('--i'), { once: true });
  });
});

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

// Draw the accent line across the process steps once they are on screen.
const steps = document.querySelector('.steps');
if (steps) {
  new IntersectionObserver((entries, observer) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      steps.classList.add('drawn');
      observer.disconnect();
    }
  }, { threshold: 0.25 }).observe(steps);
}

// Highlight the menu item of the section currently on screen.
const navLinks = [...navigation.querySelectorAll('a[href^="#"]:not(.nav-contact-link)')];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach((link) => {
  const section = document.querySelector(link.getAttribute('href'));
  if (section) sectionObserver.observe(section);
});
document.querySelector('#year').textContent = new Date().getFullYear();

const serviceSelect = document.querySelector('#contact-form select[name="service"]');
document.querySelectorAll('[data-service]').forEach((link) => {
  link.addEventListener('click', () => {
    if (serviceSelect) serviceSelect.value = link.dataset.service;
  });
});

// WhatsApp links open a chat with a ready greeting in the visitor's language.
const WHATSAPP_GREETING = 'Здравствуйте! Хочу получить консультацию OPEN CONSULTING.';
let whatsappNumber = '77075885577';

function updateWhatsappLinks() {
  const text = encodeURIComponent(localize(WHATSAPP_GREETING));
  document.querySelectorAll('[data-whatsapp-link]').forEach((link) => {
    link.href = `https://wa.me/${whatsappNumber}?text=${text}`;
  });
}

function applyWhatsappNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!/^7\d{10}$/.test(digits)) return;
  whatsappNumber = digits;
  const phone = document.querySelector('#contact-phone');
  if (phone?.firstChild) {
    phone.firstChild.nodeValue = `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
  }
  updateWhatsappLinks();
}

applyWhatsappNumber(window.OPEN_CONSULTING_WHATSAPP);
document.addEventListener('site-language-change', updateWhatsappLinks);

// The admin API exists only on Cloudflare Pages; static hosts (GitHub Pages) skip it.
const hasSiteApi = !location.hostname.endsWith('github.io') && location.protocol !== 'file:';

(hasSiteApi ? fetch('/api/site-content') : Promise.resolve(null))
  .then((response) => response?.ok ? response.json() : null)
  .then((content) => {
    if (!content) return;
    if (typeof content.heroLead === 'string') {
      const heroLead = document.querySelector('.hero-lead');
      const textNode = heroLead.firstChild;
      if (window.siteI18n && textNode?.nodeType === Node.TEXT_NODE) {
        window.siteI18n.refreshNode(textNode, content.heroLead);
        window.siteI18n.apply(window.siteI18n.current());
      } else {
        heroLead.textContent = content.heroLead;
      }
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

// Tidy Kazakhstan numbers to +7 (XXX) XXX-XX-XX when the visitor leaves the field.
phoneInput.addEventListener('blur', () => {
  let digits = phoneInput.value.replace(/\D/g, '');
  if (digits.length === 10) digits = `7${digits}`;
  if (digits.length === 11 && /^[78]/.test(digits)) {
    digits = `7${digits.slice(1)}`;
    phoneInput.value = `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }
});

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
