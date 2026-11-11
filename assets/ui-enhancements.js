/* Hermes UI Common Enhancements - website-design-ops */
(function() {
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Pre-unlock audio on any initial interaction
  const unlockEvents = ['pointerdown', 'touchstart', 'mousedown', 'keydown'];
  function unlockAudio() {
    getAudioContext();
    unlockEvents.forEach(evt => document.removeEventListener(evt, unlockAudio));
  }
  unlockEvents.forEach(evt => document.addEventListener(evt, unlockAudio, { passive: true, once: true }));

  function playClickSound(type = 'click') {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'click') {
        // Renyah tactile mechanical pop click
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'confirm') {
        // Nada konfirmasi positif
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {}
  }

  window.playClickSound = playClickSound;

  // ── Inject dropdown "Integrasi" ke sidebar (semua halaman panel) ──
  function injectNotionNav() {
    if (window.__hermesNotionNavInjected) return;
    const nav = document.querySelector('#hermes-sidebar .sidebar-nav');
    if (!nav) return;
    const group = document.createElement('div');
    group.className = 'nav-group';
    group.innerHTML =
      '<button type="button" class="nav-group-btn" aria-expanded="false">' +
        '<svg viewBox="0 0 24 24" class="nav-group-icon" aria-hidden="true"><path d="M9 3H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/><path d="M19 3h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/><path d="M9 13H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2z"/><path d="M19 13h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2z"/></svg>' +
        '<span class="nav-group-title">Integrasi</span>' +
        '<svg viewBox="0 0 24 24" class="nav-group-caret" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>' +
      '</button>' +
      '<div class="nav-group-body" hidden>' +
        '<a class="nav-link nav-group-link" href="/notion/">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M15 4v4h4"/><path d="M8 12h8M8 16h5"/></svg>' +
          '<span>Notion</span>' +
        '</a>' +
      '</div>';
    const last = nav.querySelector(':scope > a:last-of-type');
    if (last) nav.insertBefore(group, last.nextSibling);
    else nav.appendChild(group);
    const btn = group.querySelector('.nav-group-btn');
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      group.querySelector('.nav-group-body').hidden = open;
    });
    // tandai Notion aktif saat berada di halaman /notion/
    const here = window.location.pathname.replace(/\/+$/,'');
    const notionLink = group.querySelector('a[href="/notion/"]');
    if (notionLink && here === '/notion') {
      notionLink.classList.add('is-active');
      notionLink.setAttribute('aria-current', 'page');
      btn.setAttribute('aria-expanded', 'true');
      group.querySelector('.nav-group-body').hidden = false;
    }
    window.__hermesNotionNavInjected = true;
  }

  // ── Inject kontrol mobile: hamburger + brand + backdrop (semua halaman panel) ──
  function injectMobileShell() {
    if (window.__hermesMobileShellInjected) return;
    const sidebar = document.querySelector('#hermes-sidebar');
    const main = document.querySelector('.main-content');
    if (!sidebar || !main) return;

    // backdrop
    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
    }

    // header
    const header = main.querySelector(':scope > header') || main;
    if (!header) return;

    // tombol toggle hamburger
    let toggle = header.querySelector('.sidebar-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'sidebar-toggle';
      toggle.setAttribute('aria-label', 'Buka menu');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
      header.insertBefore(toggle, header.firstChild);
    }

    // brand Hermes Remote di header (mobile only)
    let brand = header.querySelector('.mobile-brand');
    if (!brand) {
      brand = document.createElement('span');
      brand.className = 'mobile-brand';
      brand.textContent = 'Hermes Remote';
      header.insertBefore(brand, toggle.nextSibling);
    }

    const close = () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('show');
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = sidebar.classList.toggle('open');
      backdrop.classList.toggle('show', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    backdrop.addEventListener('click', close);

    window.__hermesMobileShellInjected = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectMobileShell);
  else injectMobileShell();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectNotionNav);
  else injectNotionNav();

  // Tangkap pada capture phase agar tidak kalah cepat oleh preventDefault / stopPropagation
  document.addEventListener('pointerdown', (e) => {
    const target = e.target.closest('button, .btn, a, .clickable, .hub-card, .model-picker-option, .provider-card, .tree-leaf, input[type="submit"]');
    if (target) {
      if (target.classList.contains('btn-primary') || target.id === 'confirmBtnOk') {
        playClickSound('confirm');
      } else {
        playClickSound('click');
      }
    }
  }, true);
})();
