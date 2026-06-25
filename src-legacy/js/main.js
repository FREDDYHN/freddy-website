// Mobile nav toggle
document.getElementById('navToggle').addEventListener('click', () => {
  document.getElementById('headerNav').classList.toggle('open');
});

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    item.classList.toggle('open');
    // Close siblings
    item.parentElement.querySelectorAll('.faq-item').forEach(sib => {
      if (sib !== item) sib.classList.remove('open');
    });
  });
});

// Highlight current page in nav
const currentPath = window.location.pathname;
document.querySelectorAll('.header-nav a').forEach(a => {
  if (a.getAttribute('href') === currentPath) {
    a.classList.add('active');
  }
});
