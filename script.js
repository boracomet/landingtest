// Mobil menü
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');

toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});

nav.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
});

// Kurulum komutunu kopyala
document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const text = document.getElementById(btn.dataset.copy).innerText;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Kopyalandı ✓';
    } catch {
      btn.textContent = 'Kopyalanamadı';
    }
    setTimeout(() => { btn.textContent = 'Kopyala'; }, 2000);
  });
});

// Kaydırınca görünme
const targets = document.querySelectorAll('.section-head, .card, .split > *, .arch, .dark-cards article, .builder, .roadmap li, .table-wrap, .core-grid');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  targets.forEach((el) => { el.classList.add('reveal'); io.observe(el); });
}
