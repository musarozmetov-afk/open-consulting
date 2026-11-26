document.documentElement.classList.add('js');

// Intro screen: shown once per visit (flag set in <head>), ends by itself or on click / key press.
const introSplash = document.querySelector('#intro-splash');
if (introSplash && document.documentElement.classList.contains('intro-playing')) {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let introDone = false;
  const endIntro = () => {
    if (introDone) return;
    introDone = true;
    try { sessionStorage.setItem('oc-intro-seen', '1'); } catch (_) { /* Storage may be unavailable. */ }
    root.classList.add('intro-leaving');
    root.classList.remove('intro-playing'); // lets the first screen start its own entrance
    setTimeout(() => {
      root.classList.remove('intro-leaving');
      introSplash.remove();
    }, reduced ? 50 : 1000);
  };
  // The intro stays until the visitor presses the "continue" button (click, Enter or Space).
  const introButton = introSplash.querySelector('.intro-skip');
  introButton.addEventListener('click', endIntro);
  setTimeout(() => introButton.focus({ preventScroll: true }), reduced ? 0 : 2200);
} else if (introSplash) {
  introSplash.remove();
}

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

// ---------- Pointer & scroll effects ----------
const motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// Scroll progress bar along the top edge.
const progressBar = document.querySelector('.scroll-progress');
if (progressBar) {
  let progressQueued = false;
  const updateProgress = () => {
    progressQueued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.setProperty('--progress', max > 0 ? Math.min(1, window.scrollY / max) : 0);
  };
  window.addEventListener('scroll', () => {
    if (!progressQueued) { progressQueued = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  updateProgress();
}

if (finePointer && motionOK) {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  const heroSection = document.querySelector('.hero');
  const interactive = 'a, button, summary, select, input, textarea, label, [role="button"]';
  if (dot && ring) {
    document.documentElement.classList.add('has-cursor');
    let x = -100, y = -100, rx = -100, ry = -100;
    const follow = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      x = event.clientX; y = event.clientY;
      dot.style.transform = `translate(${x}px, ${y}px)`;
      dot.classList.remove('is-hidden'); ring.classList.remove('is-hidden');
      ring.classList.toggle('is-link', Boolean(event.target.closest?.(interactive)));
      if (heroSection && heroSection.contains(event.target)) {
        const box = heroSection.getBoundingClientRect();
        heroSection.style.setProperty('--mx', `${event.clientX - box.left}px`);
        heroSection.style.setProperty('--my', `${event.clientY - box.top}px`);
      }
    }, { passive: true });
    document.addEventListener('pointerleave', () => { dot.classList.add('is-hidden'); ring.classList.add('is-hidden'); });
    window.addEventListener('pointerdown', (event) => {
      ring.classList.add('is-down');
      const burst = document.createElement('span');
      burst.className = 'cursor-burst';
      burst.style.left = `${event.clientX}px`;
      burst.style.top = `${event.clientY}px`;
      document.body.appendChild(burst);
      burst.addEventListener('animationend', () => burst.remove(), { once: true });
    });
    window.addEventListener('pointerup', () => ring.classList.remove('is-down'));
  }

  // Cards lean toward the pointer (max ~5 degrees) and lift slightly.
  document.querySelectorAll('.service-card, .offer-card, .benefit-card, .step').forEach((card) => {
    card.classList.add('tilt');
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect();
      const px = (event.clientX - box.left) / box.width - 0.5;
      const py = (event.clientY - box.top) / box.height - 0.5;
      card.classList.add('is-tilting');
      card.style.transform = `perspective(900px) translateY(-6px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg)`;
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.transform = '';
    });
  });

  // Main buttons are gently "magnetic".
  document.querySelectorAll('.button-primary, .nav-cta, .fab-toggle').forEach((button) => {
    button.addEventListener('pointermove', (event) => {
      const box = button.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      button.style.translate = `${(dx * 0.15).toFixed(1)}px ${(dy * 0.25).toFixed(1)}px`;
    });
    button.addEventListener('pointerleave', () => { button.style.translate = ''; });
  });
}

// ---------- Hero photo background ----------
// Cross-fades to the next photo every 6 s; each photo is downloaded just before its turn.
// Stays on the first photo for reduced-motion visitors and pauses while the tab is hidden.
const heroSlides = [...document.querySelectorAll('.hero-slide')];
if (heroSlides.length > 1 && motionOK) {
  const load = (slide) => {
    if (slide.dataset.src) {
      slide.srcset = slide.dataset.srcset;
      slide.src = slide.dataset.src;
      delete slide.dataset.src;
      delete slide.dataset.srcset;
    }
  };
  let current = 0;
  // Progress bars under the hero: earlier photos full, the current one filling.
  const bars = [...document.querySelectorAll('.hero-progress span')];
  const markBars = (index) => bars.forEach((bar, i) => {
    bar.classList.toggle('is-done', i < index);
    bar.classList.remove('is-active');
    if (i === index) { void bar.offsetWidth; bar.classList.add('is-active'); } // restart the fill
  });
  markBars(0);
  const observer = new MutationObserver(() => {
    const index = heroSlides.findIndex((slide) => slide.classList.contains('is-active'));
    if (index >= 0) markBars(index);
  });
  heroSlides.forEach((slide) => observer.observe(slide, { attributes: true, attributeFilter: ['class'] }));
  load(heroSlides[1]);
  setInterval(() => {
    if (document.hidden) return;
    const next = (current + 1) % heroSlides.length;
    const show = () => {
      heroSlides[current].classList.remove('is-active');
      heroSlides[next].classList.add('is-active');
      current = next;
      load(heroSlides[(next + 1) % heroSlides.length]);
    };
    if (heroSlides[next].complete) show(); else heroSlides[next].addEventListener('load', show, { once: true });
  }, 6000);
}

// Hero parallax: as the page scrolls past the first screen, the text drifts down and fades
// while the photos move a little slower. One CSS variable, updated once per frame.
const heroForParallax = document.querySelector('.hero');
if (heroForParallax && motionOK) {
  let parallaxQueued = false;
  const updateParallax = () => {
    parallaxQueued = false;
    const progress = Math.min(1, Math.max(0, window.scrollY / heroForParallax.offsetHeight));
    heroForParallax.style.setProperty('--hero-scroll', progress.toFixed(3));
  };
  window.addEventListener('scroll', () => {
    if (!parallaxQueued) { parallaxQueued = true; requestAnimationFrame(updateParallax); }
  }, { passive: true });
  updateParallax();
}

// ---------- Service carousel ----------
// Native horizontal scrolling (so touch swipe, trackpads and keyboards just work) plus:
// cloned sets on both sides for a seamless loop, autoplay that pauses on hover/focus/touch,
// prev/next buttons, dots with a counter, arrow keys and mouse dragging.
function initCarousel(root) {
  const viewport = root.querySelector('.carousel-viewport');
  const track = root.querySelector('.carousel-track');
  const originals = [...track.children];
  const count = originals.length;
  const dots = [...root.querySelectorAll('.carousel-dot')];
  const counter = root.querySelector('.carousel-count strong');
  if (!viewport || count < 2) return;

  // Two cloned sets before and after the real cards; clones are hidden from assistive tech and the tab order.
  const SETS_EACH_SIDE = 2;
  const makeClones = () => originals.map((card) => {
    const clone = card.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('tabindex', '-1');
    clone.classList.add('is-clone');
    return clone;
  });
  for (let k = 0; k < SETS_EACH_SIDE; k += 1) {
    track.prepend(...makeClones());
    track.append(...makeClones());
  }

  const gap = () => parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
  const step = () => originals[0].getBoundingClientRect().width + gap();
  const setWidth = () => step() * count;
  const homeStart = () => originals[0].offsetLeft - track.firstElementChild.offsetLeft;

  const jumpTo = (left) => {
    viewport.style.scrollSnapType = 'none';
    viewport.scrollLeft = left;
    requestAnimationFrame(() => { viewport.style.scrollSnapType = ''; });
  };
  // Keep the visible position inside the real set so the loop never reaches an edge.
  const normalise = () => {
    const width = setWidth();
    const offset = viewport.scrollLeft - homeStart();
    if (offset < -width / 2) jumpTo(viewport.scrollLeft + width);
    else if (offset > width * 1.5) jumpTo(viewport.scrollLeft - width);
  };
  const currentIndex = () => {
    const offset = viewport.scrollLeft - homeStart();
    return ((Math.round(offset / step()) % count) + count) % count;
  };
  const updateIndicator = () => {
    const index = currentIndex();
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
    if (counter) counter.textContent = String(index + 1).padStart(2, '0');
  };

  const smooth = motionOK ? 'smooth' : 'auto';
  const go = (direction) => viewport.scrollBy({ left: direction * step(), behavior: smooth });
  const goToIndex = (index) => {
    const delta = index - currentIndex();
    viewport.scrollBy({ left: delta * step(), behavior: smooth });
  };

  // Start on the first real card.
  jumpTo(homeStart());
  updateIndicator();
  window.addEventListener('resize', () => { jumpTo(homeStart() + currentIndex() * step()); });

  let settleTimer;
  viewport.addEventListener('scroll', () => {
    updateIndicator();
    clearTimeout(settleTimer);
    settleTimer = setTimeout(normalise, 140);
  }, { passive: true });

  root.querySelectorAll('.carousel-btn').forEach((button) => {
    button.addEventListener('click', () => { go(Number(button.dataset.dir)); pauseFor(6000); });
  });
  dots.forEach((dot, i) => dot.addEventListener('click', () => { goToIndex(i); pauseFor(6000); }));
  viewport.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); go(1); pauseFor(6000); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); pauseFor(6000); }
  });

  // Mouse drag (touch uses native swipe).
  let drag = null;
  viewport.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { x: event.clientX, left: viewport.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; viewport.classList.add('is-dragging'); }
    if (drag.moved) viewport.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    viewport.classList.remove('is-dragging');
    if (moved) {
      // Let snapping settle, and swallow the click that ends a drag.
      viewport.addEventListener('click', (event) => event.preventDefault(), { capture: true, once: true });
      pauseFor(6000);
    }
  });

  // Autoplay: one card every 4 s; paused on hover, focus, touch or a hidden tab; off for reduced motion.
  let pausedUntil = 0;
  let hovering = false;
  const pauseFor = (ms) => { pausedUntil = Date.now() + ms; };
  root.addEventListener('pointerenter', () => { hovering = true; });
  root.addEventListener('pointerleave', () => { hovering = false; });
  viewport.addEventListener('touchstart', () => pauseFor(8000), { passive: true });
  if (motionOK) {
    setInterval(() => {
      if (hovering || document.hidden || Date.now() < pausedUntil || root.contains(document.activeElement)) return;
      const box = root.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) return;
      go(1);
    }, 4000);
  }
}
document.querySelectorAll('[data-carousel]').forEach(initCarousel);

// Floating "message us" button: opens a small menu with WhatsApp, Telegram and Instagram.
const contactFab = document.querySelector('.contact-fab');
if (contactFab) {
  const fabToggle = contactFab.querySelector('.fab-toggle');
  const fabMenu = contactFab.querySelector('.fab-menu');
  const setFabOpen = (open) => {
    contactFab.classList.toggle('open', open);
    fabToggle.setAttribute('aria-expanded', String(open));
    fabMenu.hidden = !open;
  };
  fabToggle.addEventListener('click', () => {
    const open = fabToggle.getAttribute('aria-expanded') !== 'true';
    setFabOpen(open);
    if (open) fabMenu.querySelector('a')?.focus({ preventScroll: true });
  });
  document.addEventListener('click', (event) => {
    if (!contactFab.contains(event.target)) setFabOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && fabToggle.getAttribute('aria-expanded') === 'true') {
      setFabOpen(false);
      fabToggle.focus();
    }
  });
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
const yearNode = document.querySelector('#year');
if (yearNode) yearNode.textContent = new Date().getFullYear();

const serviceSelect = document.querySelector('#contact-form select[name="service"]');
document.querySelectorAll('[data-service]').forEach((link) => {
  link.addEventListener('click', () => {
    if (serviceSelect) serviceSelect.value = link.dataset.service;
  });
});
// Service pages link to the form as index.html?service=<slug>#contact: pre-select that service.
const requestedService = new URLSearchParams(location.search).get('service');
if (serviceSelect && requestedService && [...serviceSelect.options].some((option) => option.value === requestedService)) {
  serviceSelect.value = requestedService;
}

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
    const heroLead = document.querySelector('.hero-lead');
    if (heroLead && typeof content.heroLead === 'string') {
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
if (form) initContactForm(form);

function initContactForm(form) {
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
}
