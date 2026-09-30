// ---------- nav scroll state ----------
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 24);
  }, { passive: true });
}

// ---------- mobile menu ----------
const burger = document.getElementById('hamburger');
if (burger) {
  burger.addEventListener('click', () => nav.classList.toggle('open'));
  document.querySelectorAll('.nav-links a').forEach(a =>
    a.addEventListener('click', () => nav.classList.remove('open')));
}

// ---------- typewriter ----------
const words = ['untuk semua orang.', 'yang cepat.', 'yang aman.', 'yang modern.'];
const tw = document.getElementById('typewriter');
if (tw) {
  let wi = 0, ci = 0, deleting = false;
  (function type() {
    const w = words[wi];
    tw.textContent = w.slice(0, ci);
    if (!deleting && ci < w.length) { ci++; setTimeout(type, 70); }
    else if (!deleting) { deleting = true; setTimeout(type, 1800); }
    else if (ci > 0) { ci--; setTimeout(type, 35); }
    else { deleting = false; wi = (wi + 1) % words.length; setTimeout(type, 350); }
  })();
}

// ---------- reveal on scroll ----------
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 3) * 90}ms`;
  io.observe(el);
});

// ---------- animated counters ----------
const counterIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, target = +el.dataset.count, suffix = el.dataset.suffix || '';
    const dur = 1400, t0 = performance.now();
    (function tick(t) {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('id-ID') + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
    counterIO.unobserve(el);
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-count]').forEach(el => counterIO.observe(el));

// ---------- subtle 3D tilt on cards ----------
document.querySelectorAll('.tilt').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

// ---------- auth page ----------
const authForm = document.getElementById('authForm');
if (authForm) {
  const tabLogin = document.getElementById('tabLogin');
  const tabDaftar = document.getElementById('tabDaftar');
  const nameField = document.getElementById('nameField');
  const formTitle = document.getElementById('formTitle');
  const submitBtn = document.getElementById('submitBtn');
  const msg = document.getElementById('msg');
  const params = new URLSearchParams(location.search);
  let mode = params.get('mode') === 'daftar' ? 'daftar' : 'masuk';

  function render() {
    tabLogin.classList.toggle('active', mode === 'masuk');
    tabDaftar.classList.toggle('active', mode === 'daftar');
    nameField.style.display = mode === 'daftar' ? 'block' : 'none';
    formTitle.textContent = mode === 'daftar' ? 'Buat akun baru' : 'Selamat datang kembali';
    submitBtn.textContent = mode === 'daftar' ? 'Daftar' : 'Masuk';
    msg.className = 'msg'; msg.textContent = '';
  }
  tabLogin.addEventListener('click', () => { mode = 'masuk'; render(); });
  tabDaftar.addEventListener('click', () => { mode = 'daftar'; render(); });
  render();

  authForm.addEventListener('submit', async e => {
    e.preventDefault();
    msg.className = 'msg'; msg.textContent = '';
    submitBtn.disabled = true; submitBtn.textContent = 'Memproses…';
    try {
      const body = { email: email.value.trim(), password: password.value };
      if (mode === 'daftar') body.name = fullname.value.trim();
      const res = await fetch(`/api/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
      if (mode === 'daftar') {
        msg.className = 'msg success';
        msg.textContent = 'Akun dibuat! Mengalihkan…';
        setTimeout(() => location.href = '/dashboard', 800);
      } else {
        location.href = '/dashboard';
      }
    } catch (err) {
      msg.className = 'msg error'; msg.textContent = err.message;
      submitBtn.disabled = false;
      render();
    }
  });
}

// ---------- dashboard ----------
const dash = document.getElementById('dashName');
if (dash) {
  const logout = document.getElementById('logout');
  fetch('/api/me', { credentials: 'same-origin' })
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(u => {
      dash.textContent = u.name;
      document.getElementById('kvEmail').textContent = u.email;
      document.getElementById('kvName').textContent = u.name;
      document.getElementById('kvSince').textContent = new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      document.getElementById('kvPlan').textContent = 'Gratis';
    })
    .catch(() => location.href = '/login');
  logout.addEventListener('click', async () => {
    await fetch('/api/keluar', { method: 'POST', credentials: 'same-origin' });
    location.href = '/';
  });
}
