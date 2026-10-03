(() => {
'use strict';
const A = 'assets/';
const MUSIC_SRC = null;            // set to 'assets/music.mp3' if you add a song (starts after candle 3)
const T = 1050;                    // page turn duration (ms) – keep in sync with --t
const $ = s => document.querySelector(s);
const el = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.append(e); return e; };
const img = (src, cls, parent) => { const i = el('img', cls, parent); i.src = A + src; i.alt = ''; i.draggable = false; return i; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const book = $('#book'), scene = $('#scene');

/* ---------- state ---------- */
let s = 0;               // 0 cover | 1..4 spreads | 5 back cover  (= number of flipped leaves)
let side = 1;            // single-page mode only: 0 left page, 1 right page
let busy = false, single = false, PW = 400;
let lit = [1, 1, 1];     // candles
let envState = 'closed'; // closed -> opening -> letter
let wishShown = false;

/* ---------- physical pages: 5 leaves = 10 pages ---------- */
const LEAVES = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]];  // [front(right side), back(left side)]
const FILE = {1:'p01_cover.jpg',4:'p06_makewish.jpg',6:'p09_littlethings.jpg',7:'p10_ourmoments.jpg',8:'p11_lyrics1.jpg',9:'p12_lyrics2.jpg',10:'p13_back.jpg'};
const candleEls = [], refs = {};

function buildFace(n, kind, leaf) {
  const f = el('div', 'face ' + kind, leaf); f.dataset.page = n;
  f.addEventListener('click', e => { if (busy || e.target.closest('button')) return; tap(e); });
  if (FILE[n]) img(FILE[n], 'pg', f);
  if (n === 1) { const b = el('button', 'facebtn', f); b.setAttribute('aria-label', 'Open the booklet'); b.onclick = () => next(); }
  if (n === 2) buildEnvelope(f);
  if (n === 3) buildCake(f);
  if (n === 5) buildWish(f);
  if (n === 10) { const b = el('button', 'again', f); b.textContent = 'Read again'; b.setAttribute('aria-label', 'Restart the booklet from the cover'); b.onclick = restart; }
  return f;
}
let leaves = [];

/* ---------- page 2: envelope + letter ---------- */
function buildEnvelope(f) {
  img('p02_bg.jpg', 'pg', f);
  // layers, bottom → top: envelope back (flap + lining) · letter · envelope front (pocket) · closed envelope
  const mk = (cls, src, im) => { const w = el('div', 'env ' + cls, f); img(src, im, w); return w; };
  refs.envB = mk('b', 'env_open.png', 'open');
  const lb = el('div', 'letterbox', f); img('p04_letter.jpg', '', lb); refs.letter = lb;
  refs.envF = mk('f', 'env_open_front.png', 'open');
  refs.closed = mk('c', 'env_closed.png', 'closed');
  const b = el('button', 'envbtn', f); b.setAttribute('aria-label', 'Open the envelope'); refs.envBtn = b;
  b.onclick = openEnvelope;
}
const L_IN = 'translate(2.3%,-.4%) scale(.48)', L_OUT = 'translate(-24.2%,-.4%) scale(.48)';
async function openEnvelope() {
  if (envState !== 'closed') return;
  envState = 'opening'; refs.envBtn.disabled = true;
  const q = (e, kf, o) => e.animate(kf, { fill: 'forwards', easing: 'cubic-bezier(.4,0,.2,1)', ...o }).finished;
  const L = refs.letter;
  L.style.transform = L_IN; L.classList.add('show');          // letter already rests inside the pocket, hidden by the closed envelope
  // 1) flap opens (same artwork as the PDF, no rotation)
  await Promise.all([q(refs.closed, [{ opacity: 1 }, { opacity: 0 }], { duration: 560 }),
                     q(refs.envB, [{ opacity: 0 }, { opacity: 1 }], { duration: 560 }),
                     q(refs.envF, [{ opacity: 0 }, { opacity: 1 }], { duration: 560 })]);
  await sleep(350);
  // 2) letter is pulled out through the open side of the envelope (left), sliding out from behind the front panel
  await q(L, [{ transform: L_IN }, { transform: L_OUT }], { duration: 1250, easing: 'cubic-bezier(.45,.05,.3,1)' });
  await sleep(150);
  // 3) it enlarges and settles inside the page's safe area while the envelope softly fades away
  q(refs.envB, [{ opacity: 1 }, { opacity: 0 }], { duration: 1000, delay: 200 });
  q(refs.envF, [{ opacity: 1 }, { opacity: 0 }], { duration: 1000, delay: 200 });
  await q(L, [{ transform: L_OUT }, { transform: 'none' }], { duration: 1300, easing: 'cubic-bezier(.3,.1,.2,1)' });
  L.classList.add('done'); envState = 'letter';
}

/* ---------- page 3: cake + exactly 3 candles ---------- */
const CANDLES = [[41.84, 951.89], [248.48, 859.99], [439.14, 951.89]];  // pdf coords (1200x1500), blown out left → middle → right
function buildCake(f) {
  const cake = el('div', 'cake', f); cake.style.cssText = 'position:absolute;inset:0';
  img('p05_nocandle.jpg', 'pg', cake);
  CANDLES.forEach(([x, y], i) => {
    const c = el('div', 'cd', cake);
    c.style.left = x / 12 + '%'; c.style.top = y / 15 + '%';
    img('candle_body.png', '', c); img('flame.png', 'flame', c); el('div', 'smoke', c);
    const b = el('button', '', c); b.setAttribute('aria-label', `Blow out candle ${i + 1} of 3`);
    b.onclick = () => blow(i);
    candleEls.push(c);
  });
}
function blow(i) {
  if (busy || s !== 1 || (single && side !== 1) || !lit[i]) return;
  lit[i] = 0; candleEls[i].classList.add('out');
  if (!lit.some(Boolean)) {                 // third candle → automatically go to "Make a wish"
    busy = true; startMusic();
    setTimeout(() => { busy = false; go(2, 0); }, 1200);
  }
}
const blowNext = () => { const i = lit.findIndex(Boolean); if (i > -1) blow(i); };
function relight() { lit = [1, 1, 1]; candleEls.forEach(c => c.classList.remove('out')); }

/* ---------- page 5: "Made your wish, yet?" → "My Wish" (soft fade, no page flip) ---------- */
function buildWish(f) {
  img('p07_madeyourwish.jpg', 'pg', f);
  refs.wish2 = img('p08_mywish.jpg', 'pg wish2', f);
  const b = el('button', 'wishbtn', f); b.setAttribute('aria-label', 'Made your wish, yet? Tap to reveal'); refs.wishBtn = b;
  b.onclick = revealWish;
}
function revealWish() {
  if (wishShown || s !== 2 || (single && side !== 1)) return;
  wishShown = true; refs.wish2.classList.add('on'); refs.wishBtn.classList.add('off'); refs.wishBtn.tabIndex = -1;
}

/* ---------- music (optional) ---------- */
let audio;
function startMusic() {
  if (!MUSIC_SRC || audio) return;
  try {
    audio = new Audio(MUSIC_SRC); audio.loop = true; audio.volume = 0;
    const p = audio.play();
    const fade = () => { let v = 0; const id = setInterval(() => { v = Math.min(.8, v + .04); audio.volume = v; if (v >= .8) clearInterval(id); }, 120); };
    if (p && p.then) p.then(fade).catch(() => { audio = null; });  // autoplay blocked: silently skip
  } catch (e) { audio = null; }
}

function stopMusic() {
  if (!audio) return; const a = audio; audio = null;
  const id = setInterval(() => { a.volume = Math.max(0, a.volume - .05); if (a.volume <= 0) { clearInterval(id); a.pause(); } }, 100);
}

/* ---------- restart (from the back cover): everything goes back to how it was at the start ---------- */
function resetStates() {
  relight(); stopMusic();
  wishShown = false; refs.wish2.classList.remove('on'); refs.wishBtn.classList.remove('off'); refs.wishBtn.tabIndex = 0;
  [refs.closed, refs.envB, refs.envF, refs.letter].forEach(e => e.getAnimations().forEach(a => a.cancel()));
  refs.envBtn.disabled = false; envState = 'closed';
  refs.letter.classList.remove('show', 'done'); refs.letter.style.transform = '';
}
function restart() {
  if (busy || s !== 5) return;
  busy = true; resetStates();
  const STEP = 230;
  book.dataset.s = 3;                                                     // spine + full shadow while the pages fan back
  book.style.transform = `translateX(${single ? -.5 * PW : 0}px)`;
  [4, 3, 2, 1, 0].forEach((i, k) => setTimeout(() => {
    const l = leaves[i]; l.style.zIndex = 61 + k; l.classList.add('turn'); l.classList.remove('flipped');
  }, k * STEP));
  setTimeout(() => { s = 0; side = 1; update(); }, 4 * STEP + T * .55);
  setTimeout(() => { leaves.forEach(l => l.classList.remove('turn')); zOrder(); busy = false; }, 4 * STEP + T + 100);
}

/* ---------- navigation ---------- */
function next() {
  if (busy) return;
  const onRight = !single || side === 1;
  if (s === 1 && onRight && lit.some(Boolean)) return blowNext();       // must blow out all 3 candles first
  if (s === 2 && onRight && !wishShown) return revealWish();            // must reveal "My Wish" first
  if (single && s >= 1 && s <= 4 && side === 0) { side = 1; update(); return; }
  if (s < 5) go(s + 1, 0);
}
function prev() {
  if (busy) return;
  if (single && s >= 1 && s <= 4 && side === 1) { side = 0; update(); return; }
  if (s > 0) go(s - 1, 1);
}
function go(t, sd) {
  busy = true;
  const fwd = t > s, i = fwd ? s : t;
  if (!fwd && s === 2 && t === 1) relight();          // coming back to the cake: all candles lit again
  const leaf = leaves[i];
  leaf.style.zIndex = 60; leaf.classList.add('turn'); leaf.classList.toggle('flipped', fwd);
  s = t; side = sd; update();
  setTimeout(() => { leaf.classList.remove('turn'); zOrder(); busy = false; }, T + 60);
}
function zOrder() { leaves.forEach((l, i) => l.style.zIndex = l.classList.contains('flipped') ? i + 1 : 10 - i); }
function update() {
  const fc = s === 0 ? 1.5 : s === 5 ? .5 : single ? (side ? 1.5 : .5) : 1;   // which part of the book is centred
  book.style.transform = `translateX(${-(fc - 1) * PW}px)`;
  book.dataset.s = s;
}
function layout() {
  const vw = innerWidth, vh = innerHeight;
  const two = Math.min(vw * .96 / 2, vh * .9 / 1.25);
  single = two < 300;
  PW = single ? Math.min(vw * .94, vh * .88 / 1.25) : two;
  const r = document.documentElement.style;
  r.setProperty('--pw', PW + 'px'); r.setProperty('--ph', PW * 1.25 + 'px');
  book.classList.add('noanim'); update();
  requestAnimationFrame(() => requestAnimationFrame(() => book.classList.remove('noanim')));
}
function tap(e) {
  if (single) return e.clientX < innerWidth * .22 ? prev() : next();
  const n = +e.currentTarget.dataset.page;
  n % 2 === 0 ? prev() : next();     // left pages turn back, right pages turn forward
}

/* swipe + keyboard */
let p0 = null, swiped = false;
scene.addEventListener('pointerdown', e => { p0 = [e.clientX, e.clientY]; });
scene.addEventListener('pointerup', e => {
  if (!p0) return; const dx = e.clientX - p0[0], dy = e.clientY - p0[1]; p0 = null;
  if (Math.abs(dx) > 50 && Math.abs(dy) < 70) { swiped = true; dx < 0 ? next() : prev(); }
});
scene.addEventListener('click', e => { if (swiped) { e.stopPropagation(); e.preventDefault(); swiped = false; } }, true);
addEventListener('keydown', e => { if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev(); });
addEventListener('resize', layout);

leaves = LEAVES.map(([fr, bk]) => { const l = el('div', 'leaf', book); buildFace(fr, 'front', l); buildFace(bk, 'back', l); return l; });
book.insertBefore($('#shadow'), book.firstChild);
zOrder(); layout();
})();
