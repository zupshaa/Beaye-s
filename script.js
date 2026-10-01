(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const book = $('book'), stage = $('stage');
  const leaves = {1: $('leaf1'), 2: $('leaf2'), 4: $('leaf4'), 3: $('leaf3')};
  // z-order: while on the right side earlier leaves sit on top; once turned, later turns sit on top.
  const zRight = {1: 40, 2: 30, 4: 20, 3: 10}, zLeft = {1: 1, 2: 2, 4: 3, 3: 4};
  const state = {step: 0, lit: 3, busy: false, envelope: false, focus: 'R'};
  const portrait = () => innerWidth / innerHeight < 1.05;

  function size() {
    const vw = innerWidth, vh = innerHeight;
    const p = portrait() ? Math.min(vw * .94, vh * .88 * .8) : Math.min(vw * .47, vh * .92 * .8);
    document.documentElement.style.setProperty('--p', p + 'px');
    camera();
  }
  function camera() {
    let cam = 0;                                   // in page-widths, relative to spine
    if (state.step === 0) cam = -.5;               // closed: cover centred
    else if (state.step === 4) cam = .5;           // back cover centred
    else if (portrait()) cam = state.focus === 'L' ? .5 : -.5;
    book.style.setProperty('--cam', cam);
    book.dataset.step = state.step;
    const open = state.step > 0 && state.step < 4 && portrait();
    $('panL').hidden = !(open && state.focus === 'R');
    $('panR').hidden = !(open && state.focus === 'L');
  }
  function flip(n, toLeft, done) {
    const el = leaves[n];
    state.busy = true;
    el.style.zIndex = 100; el.classList.add('turning');
    el.classList.toggle('flipped', toLeft);
    setTimeout(() => {
      el.style.zIndex = toLeft ? zLeft[n] : zRight[n];
      el.classList.remove('turning'); state.busy = false; done && done();
    }, 1200);
  }
  function setStep(s, focus) { state.step = s; if (focus) state.focus = focus; camera(); }
  Object.keys(leaves).forEach(n => leaves[n].style.zIndex = zRight[n]);

  // 1 → cover opens
  $('openBook').addEventListener('click', () => {
    if (state.busy || state.step) return;
    setStep(1, 'L'); flip(1, true);
  });

  // 2 → envelope + letter
  const page2 = $('page2');
  $('envelopeBtn').addEventListener('click', () => {
    if (state.envelope) return; state.envelope = true;
    page2.classList.add('nudge');
    setTimeout(() => { page2.classList.remove('nudge'); page2.classList.add('opened'); }, 450);
    setTimeout(() => page2.classList.add('read'), 4100);
  });
  const lb = $('lightbox');
  $('letter').addEventListener('click', () => { lb.hidden = false; });
  lb.addEventListener('click', () => { lb.hidden = true; });
  addEventListener('keydown', e => { if (e.key === 'Escape') lb.hidden = true; });

  // 3 → three candles
  const smokeAt = f => {
    const s = document.createElement('i'); s.className = 'smoke';
    s.style.left = (parseFloat(f.style.left) + 1) + '%'; s.style.top = (parseFloat(f.style.top) - 3) + '%';
    f.parentNode.appendChild(s); setTimeout(() => s.remove(), 1900);
  };
  const blow = $('blowBtn');
  blow.addEventListener('click', () => {
    if (state.lit <= 0 || state.busy || state.step !== 1) return;
    const f = $('flame' + (4 - state.lit));         // candle 1, then 2, then 3
    f.classList.add('out'); smokeAt(f);
    state.lit--; $('left').textContent = state.lit ? state.lit + ' left' : 'all out!';
    if (state.lit === 0) {
      blow.disabled = true;
      setTimeout(() => { setStep(2, 'L'); flip(2, true, () => setTimeout(() => { state.focus = 'R'; camera(); }, 1800)); }, 1300);
    }
  });

  // 5 → "made your wish, yet?" slowly dissolves to reveal "my wish" (same page position)
  $('wishBtn').addEventListener('click', () => {
    if (state.busy || state.step !== 2) return;
    state.step = 3; state.focus = 'R'; camera();
    $('wishBtn').disabled = true;
    const el = leaves[4];
    el.style.transition = 'opacity 2.2s ease-in-out';
    requestAnimationFrame(() => { el.style.opacity = 0; });
    setTimeout(() => { el.style.visibility = 'hidden'; }, 2300);
    setTimeout(() => { $('closeBtn').disabled = false; $('closeHint').style.cssText = 'opacity:1;animation:pulse 2.4s ease-in-out infinite'; }, 2000);
  });

  // 6 → close to back cover
  $('closeBtn').addEventListener('click', () => {
    if (state.busy || state.step !== 3) return;
    setStep(4); flip(3, true);
  });
  $('againBtn').addEventListener('click', () => location.reload());

  $('panL').addEventListener('click', () => { state.focus = 'L'; camera(); });
  $('panR').addEventListener('click', () => { state.focus = 'R'; camera(); });
  addEventListener('resize', size); size();
})();
