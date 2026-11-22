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
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const digits = phoneInput.value.replace(/\D/g, '');
  if (digits.length < 10) {
    phoneInput.setCustomValidity('Укажите корректный номер телефона.');
    phoneInput.reportValidity();
    return;
  }

  formStatus.textContent = 'Поля заполнены корректно. Для получения заявок подключите форму к рабочей почте или CRM.';
  formStatus.classList.add('success');
  form.reset();
});
