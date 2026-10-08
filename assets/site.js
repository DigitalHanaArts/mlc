/* ============================================================
   MLC-en — Shared scripts
   ============================================================ */
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   CURSOR
   ============================================================ */
(function(){
  const c = $('#cursor');
  if (!c || matchMedia('(hover:none)').matches) return;
  let tx = 0, ty = 0, cx = 0, cy = 0;
  addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
  (function loop(){
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    c.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();
  document.addEventListener('mouseover', e => {
    if (e.target.closest('a, button, .card, .btn, input, textarea, .tl-item'))
      c.classList.add('hot');
    else c.classList.remove('hot');
  });
})();

/* ============================================================
   NAV — scrolled state, progress bar, mobile toggle
   ============================================================ */
(function(){
  const nav = $('#nav');
  if (!nav) return;
  const prog = $('#navProg');
  const toggle = $('.nav-toggle');
  const menu = $('.nav-menu');

  let raf = null;
  function update(){
    nav.classList.toggle('scrolled', scrollY > 20);
    if (prog){
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? Math.min(scrollY / max, 1) : 0;
      prog.style.width = (p * 100).toFixed(2) + '%';
    }
    raf = null;
  }
  addEventListener('scroll', () => {
    if (raf == null) raf = requestAnimationFrame(update);
  }, { passive: true });
  update();

  if (toggle && menu){
    toggle.addEventListener('click', () => menu.classList.toggle('open'));
    menu.addEventListener('click', e => {
      if (e.target.tagName === 'A') menu.classList.remove('open');
    });
  }
})();

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
(function(){
  const els = $$('.rev');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)){
    els.forEach(e => e.classList.add('on'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting){
        e.target.classList.add('on');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  els.forEach(e => io.observe(e));
})();

/* ============================================================
   METERS
   ============================================================ */
(function(){
  const meters = $$('.meter');
  if (!meters.length) return;
  if (!('IntersectionObserver' in window)){
    meters.forEach(m => {
      m.style.setProperty('--w', (m.dataset.w || '50') + '%');
      m.classList.add('on');
    });
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const w = e.target.dataset.w || '50';
      e.target.style.setProperty('--w', w + '%');
      e.target.classList.add('on');
      io.unobserve(e.target);
    });
  }, { threshold: 0.35 });
  meters.forEach(m => io.observe(m));
})();

/* ============================================================
   TOC SCROLLSPY
   ============================================================ */
(function(){
  const toc = $('.article-toc');
  if (!toc) return;
  const links = $$('a[href^="#"]', toc);
  if (!links.length) return;

  const map = new Map();
  links.forEach(a => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) map.set(el, a);
  });

  let current = null;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const a = map.get(e.target);
      if (!a || a === current) return;
      if (current) current.classList.remove('active');
      a.classList.add('active');
      current = a;
    });
  }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });

  map.forEach((_, el) => io.observe(el));
})();

/* ============================================================
   TICKER: duplicate rows for seamless loop
   ============================================================ */
(function(){
  const track = $('.ticker-track');
  if (!track) return;
  const rows = $$('.ticker-row', track);
  if (rows.length === 1){
    // Only one row authored; duplicate it to make the loop seamless
    const clone = rows[0].cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  }
})();

/* ============================================================
   TERMINAL TYPING
   ============================================================ */
(function(){
  const body = $('#termBody');
  if (!body) return;
  const script = JSON.parse(body.dataset.script || '[]');
  if (!script.length) return;

  body.innerHTML = '';
  function el(cls){ const d = document.createElement('div'); d.className = 'ln ' + cls; return d; }

  if (REDUCE){
    script.forEach(s => {
      if (s.p){
        const d = el('');
        d.innerHTML = `<span class="pr">${s.p}</span> <span class="cm">${s.t}</span>`;
        body.appendChild(d);
      } else if (s.o){
        body.appendChild(el(s.ok ? 'out ok' : s.bad ? 'out bad' : 'out')).textContent = s.o;
      } else {
        body.appendChild(el('')).innerHTML = '&nbsp;';
      }
    });
    return;
  }

  let i = 0;
  function typeInto(node, text, done){
    let k = 0;
    (function tick(){
      node.textContent = text.slice(0, ++k);
      if (k < text.length) setTimeout(tick, 16 + Math.random() * 20);
      else done();
    })();
  }
  function step(){
    if (i >= script.length){
      const cur = document.createElement('span');
      cur.className = 'cr';
      body.appendChild(cur);
      return;
    }
    const s = script[i++];
    if (s.p){
      const d = el('');
      const pr = document.createElement('span'); pr.className = 'pr'; pr.textContent = s.p + ' ';
      const cm = document.createElement('span'); cm.className = 'cm';
      d.appendChild(pr); d.appendChild(cm);
      body.appendChild(d);
      typeInto(cm, s.t, () => setTimeout(step, 240));
    } else if (s.o){
      const d = el(s.ok ? 'out ok' : s.bad ? 'out bad' : 'out');
      d.textContent = s.o;
      body.appendChild(d);
      setTimeout(step, 80);
    } else {
      const d = el(''); d.innerHTML = '&nbsp;';
      body.appendChild(d);
      setTimeout(step, 160);
    }
  }

  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting){ step(); io.unobserve(e.target); }
    }, { threshold: 0.15 });
    io.observe(body);
  } else {
    step();
  }
})();

/* ============================================================
   HERO CANVAS (only on index.html)
   ============================================================ */
(function(){
  const canvas = $('#heroCanvas');
  if (!canvas || REDUCE) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  let dpr = Math.min(devicePixelRatio || 1, 2);
  let W = 0, H = 0, particles = [], raf = null, visible = true, t = 0;

  function noise(x, y, z){
    return (
      Math.sin(x * 0.9 + z) * 0.5 +
      Math.sin(y * 1.1 - z * 0.7) * 0.4 +
      Math.sin((x + y) * 0.7 + z * 0.5) * 0.3
    );
  }
  function resize(){
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.min(Math.round(W * H / 14000), 160);
    particles = [];
    for (let i = 0; i < target; i++){
      particles.push({
        x: Math.random() * W, y: Math.random() * H, px: 0, py: 0,
        life: Math.random() * 100,
        hue: Math.random() < 0.85 ? 'amber' : 'teal'
      });
    }
  }
  function reset(p){
    p.x = Math.random() * W; p.y = Math.random() * H;
    p.px = p.x; p.py = p.y; p.life = 0;
    p.hue = Math.random() < 0.85 ? 'amber' : 'teal';
  }
  function frame(){
    if (!visible){ raf = null; return; }
    ctx.fillStyle = 'rgba(5,6,10,0.14)';
    ctx.fillRect(0, 0, W, H);
    t += 0.004;
    for (let i = 0; i < particles.length; i++){
      const p = particles[i];
      p.px = p.x; p.py = p.y;
      const n = noise(p.x * 0.002, p.y * 0.002, t);
      const a = n * Math.PI * 1.6;
      p.x += Math.cos(a) * 0.8;
      p.y += Math.sin(a) * 0.8;
      p.life += 1;
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20 || p.life > 380){
        reset(p); continue;
      }
      const alpha = Math.min(1, (1 - p.life / 380)) * 0.55;
      ctx.strokeStyle = p.hue === 'amber'
        ? `rgba(245,182,66,${alpha})`
        : `rgba(78,205,196,${alpha})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    raf = requestAnimationFrame(frame);
  }
  function start(){ if (!raf && visible) raf = requestAnimationFrame(frame); }
  function stop(){ if (raf){ cancelAnimationFrame(raf); raf = null; } }
  resize(); start();
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible) start(); else stop();
  });
  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !document.hidden;
      if (visible) start(); else stop();
    }, { threshold: 0 });
    io.observe(canvas);
  }
})();

/* ============================================================
   SHA-256 — via SubtleCrypto with a compact synchronous fallback
   ============================================================ */
const hashSync = (function(){
  const K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ]);

  function rotr(x, n){ return (x >>> n) | (x << (32 - n)); }

  function utf8(str){
    const enc = new TextEncoder();
    return enc.encode(str);
  }

  function process(bytes){
    // pad
    const len = bytes.length;
    const bitLen = len * 8;
    const paddedLen = (((len + 8) >> 6) << 6) + 64;
    const buf = new Uint8Array(paddedLen);
    buf.set(bytes);
    buf[len] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(paddedLen - 4, bitLen >>> 0);
    dv.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000));

    const H = new Uint32Array([
      0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
      0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19
    ]);
    const w = new Uint32Array(64);

    for (let off = 0; off < paddedLen; off += 64){
      for (let i = 0; i < 16; i++){
        w[i] = dv.getUint32(off + i * 4);
      }
      for (let i = 16; i < 64; i++){
        const s0 = rotr(w[i-15], 7) ^ rotr(w[i-15], 18) ^ (w[i-15] >>> 3);
        const s1 = rotr(w[i-2], 17) ^ rotr(w[i-2], 19) ^ (w[i-2] >>> 10);
        w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
      }
      let [a,b,c,d,e,f,g,h] = H;
      for (let i = 0; i < 64; i++){
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    let out = '';
    for (let i = 0; i < 8; i++){
      out += H[i].toString(16).padStart(8, '0');
    }
    return out;
  }

  return function(str){ return process(utf8(str)); };
})();

/* ============================================================
   HASH DEMO (blockchain.html)
   ============================================================ */
(function(){
  const demo = $('#demoHash');
  if (!demo) return;
  const input = $('#hashInput', demo);
  const out = $('#hashOut', demo);
  const bits = $('#hashBits', demo);
  if (!input || !out) return;

  function update(){
    const text = input.value;
    const h = hashSync(text);
    const oneBits = [...h].reduce((n, c) => n + (parseInt(c, 16).toString(2).split('1').length - 1), 0);
    out.innerHTML =
      `<span class="lbl">SHA-256</span><span class="hash">${h}</span>`;
    if (bits) bits.innerHTML =
      `<span>input <b>${text.length}</b> chars</span>` +
      `<span>hash <b>${h.length}</b> hex chars</span>` +
      `<span>one-bits <b>${oneBits}</b> / 256</span>`;
  }
  input.addEventListener('input', update);
  update();
})();

/* ============================================================
   MERKLE DEMO (blockchain.html)
   ============================================================ */
(function(){
  const demo = $('#demoMerkle');
  if (!demo) return;
  const inputs = $$('input[type=text]', demo);
  const out = $('#merkleOut', demo);
  const btn = $('#merkleRun', demo);
  if (!inputs.length || !out) return;

  function leafHash(s){ return hashSync('L' + s); }
  function nodeHash(a, b){ return hashSync('N' + a + b); }

  function computeLeaves(){
    let level = inputs.map(i => leafHash(i.value));
    const levels = [level];
    while (level.length > 1){
      if (level.length % 2) level.push(level[level.length - 1]);
      const next = [];
      for (let i = 0; i < level.length; i += 2) next.push(nodeHash(level[i], level[i+1]));
      level = next;
      levels.push(level);
    }
    return { root: level[0], levels };
  }

  function render(){
    const { root, levels } = computeLeaves();
    let html = `<div style="margin-bottom:14px"><span class="lbl">merkle_root</span><span class="hash">${root}</span></div>`;
    levels.forEach((lvl, i) => {
      const label = i === 0 ? 'leaves' : (i === levels.length - 1 ? 'root' : `level ${i}`);
      html += `<div style="margin-bottom:6px;font-size:.72rem;color:var(--fg-3);letter-spacing:.14em;text-transform:uppercase">${label}</div>`;
      lvl.forEach(h => {
        html += `<div style="font-family:var(--mono);font-size:.76rem;color:var(--fg-2);padding:4px 0;word-break:break-all">${h}</div>`;
      });
    });
    out.innerHTML = html;
  }

  inputs.forEach(i => i.addEventListener('input', render));
  if (btn) btn.addEventListener('click', render);
  render();
})();

/* ============================================================
   POW DEMO (blockchain.html)
   ============================================================ */
(function(){
  const demo = $('#demoPow');
  if (!demo) return;
  const prefix = $('#powPrefix', demo);
  const diff = $('#powDiff', demo);
  const btn = $('#powRun', demo);
  const out = $('#powOut', demo);
  if (!prefix || !diff || !btn || !out) return;

  let running = false;

  async function run(){
    if (running) return;
    running = true;
    btn.disabled = true;
    btn.textContent = 'Mining…';
    const p = prefix.value;
    const d = Math.min(Math.max(parseInt(diff.value, 10) || 3, 1), 5);
    const target = '0'.repeat(d);
    out.innerHTML = `<span style="color:var(--fg-3)">grinding nonce… target prefix ${target}…</span>`;

    // Yield to the browser so the UI updates
    await new Promise(r => setTimeout(r, 20));

    let nonce = 0;
    const t0 = performance.now();
    const MAX = 5_000_000;
    let h = '';
    while (nonce < MAX){
      h = hashSync(p + nonce);
      if (h.startsWith(target)) break;
      nonce++;
    }
    const dt = performance.now() - t0;

    if (nonce >= MAX){
      out.innerHTML = `<span class="bad">Gave up after ${MAX.toLocaleString()} attempts.</span> Try a lower difficulty.`;
    } else {
      const rate = Math.round(nonce / (dt / 1000) || 0);
      out.innerHTML =
        `<div style="margin-bottom:12px"><span class="lbl">nonce</span><span class="ok">${nonce}</span></div>` +
        `<div style="margin-bottom:12px"><span class="lbl">hash</span><span class="hash">${h}</span></div>` +
        `<div class="stats"><span>attempts <b>${nonce.toLocaleString()}</b></span>` +
        `<span>time <b>${dt.toFixed(1)} ms</b></span>` +
        `<span>rate <b>${rate.toLocaleString()} H/s</b></span></div>`;
    }

    btn.disabled = false;
    btn.textContent = 'Mine';
    running = false;
  }

  btn.addEventListener('click', run);
})();

/* ============================================================
   COIN SPIN (mera.html) — pure CSS handles it; no JS needed.
   ============================================================ */

/* ============================================================
   CODE COPY BUTTONS
   ============================================================ */
(function(){
  $$('pre').forEach(pre => {
    if (pre.dataset.copyReady) return;
    pre.dataset.copyReady = '1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Copy';
    btn.style.cssText = `
      position:absolute;top:8px;right:8px;padding:6px 12px;
      background:var(--bg-2);color:var(--fg-2);border:1px solid var(--line);
      border-radius:3px;font-family:var(--mono);font-size:.62rem;
      letter-spacing:.16em;text-transform:uppercase;cursor:pointer;
      transition:all .25s ease;z-index:5;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.color = 'var(--amber)';
      btn.style.borderColor = 'var(--amber)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.color = 'var(--fg-2)';
      btn.style.borderColor = 'var(--line)';
    });
    btn.addEventListener('click', async () => {
      const text = pre.querySelector('code')?.innerText ?? pre.innerText;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1400);
      } catch {
        btn.textContent = 'Press ⌘C';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1400);
      }
    });
    if (!pre.style.position) pre.style.position = 'relative';
    pre.appendChild(btn);
  });
})();