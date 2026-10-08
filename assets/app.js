'use strict';

/* ================================================================
   MLC-en — shared behavior
   Feature-detected. Runs only what it finds on the page.
   ================================================================ */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

function hex(n){ return Math.floor(n).toString(16).padStart(2, '0'); }
function fakeHash(len = 12){
  let s = '';
  for (let i = 0; i < len; i++) s += hex(Math.random() * 256);
  return s;
}

/* ---------- cursor ---------- */
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
    const t = e.target;
    if (t.closest('a, button, .card, .btn, .coin, .meter, .hub-card'))
      c.classList.add('hot');
    else c.classList.remove('hot');
  });
})();

/* ---------- nav scroll state + progress ---------- */
(function(){
  const nav = $('#nav');
  const prog = $('#navProg');
  if (!nav) return;

  let raf = null;
  function update(){
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 20);
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? Math.min(y / max, 1) : 0;
    if (prog) prog.style.width = (p * 100).toFixed(2) + '%';
    raf = null;
  }
  addEventListener('scroll', () => {
    if (raf == null) raf = requestAnimationFrame(update);
  }, { passive: true });
  update();
})();

/* ---------- scroll reveal ---------- */
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

/* ---------- meters ---------- */
(function(){
  const meters = $$('.meter');
  if (!meters.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const w = e.target.dataset.w || '50';
      e.target.style.setProperty('--w', w + '%');
      e.target.classList.add('on');
      io.unobserve(e.target);
    });
  }, { threshold: 0.4 });
  meters.forEach(m => io.observe(m));
})();

/* ---------- TOC scroll-spy ---------- */
(function(){
  const toc = $('.toc');
  if (!toc) return;
  const links = $$('.toc a', toc);
  if (!links.length) return;

  const headings = links
    .map(a => {
      const id = a.getAttribute('href');
      if (!id || !id.startsWith('#')) return null;
      const el = document.getElementById(id.slice(1));
      return el ? { el, a } : null;
    })
    .filter(Boolean);

  function update(){
    const y = scrollY + 140;
    let current = headings[0];
    for (const h of headings){
      if (h.el.offsetTop <= y) current = h;
      else break;
    }
    links.forEach(a => a.classList.remove('active'));
    if (current) current.a.classList.add('active');
  }

  let raf = null;
  addEventListener('scroll', () => {
    if (raf == null) raf = requestAnimationFrame(() => { update(); raf = null; });
  }, { passive: true });
  update();
})();

/* ---------- HERO canvas (flow field) ---------- */
(function(){
  const canvas = $('#heroCanvas');
  if (!canvas || REDUCE) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  const dpr = Math.min(devicePixelRatio || 1, 2);
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
        x: Math.random() * W, y: Math.random() * H,
        px: 0, py: 0, life: Math.random() * 100,
        hue: Math.random() < 0.85 ? 'amber' : 'teal',
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
    ctx.fillStyle = 'rgba(5, 6, 10, 0.14)';
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
        ? `rgba(245, 182, 66, ${alpha})`
        : `rgba(78, 205, 196, ${alpha})`;
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

/* ---------- FILM canvas ---------- */
(function(){
  const canvas = $('#filmCanvas');
  if (!canvas || REDUCE) return;

  const ctx = canvas.getContext('2d');
  const frameLabel = $('#filmFrame');
  const hashLabel  = $('#filmHash');
  const statLabel  = $('#filmStat');
  const timeLabel  = $('#filmTime');

  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W = 0, H = 0, t0 = performance.now(), visible = false, raf = null, last = 0;
  const scenes = ['lossDescent','merkleFold','weightField','chainRun','coinSpin','chartStack'];
  const SCENE_MS = 6500;
  let sceneIdx = 0, sceneStart = 0;

  function resize(){
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function lossDescent(time){
    ctx.fillStyle = '#05060a'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = 'rgba(245,182,66,0.08)'; ctx.lineWidth = 1;
    for (let x=0; x<W; x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y=0; y<H; y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    const pts = 140;
    for (let i=0;i<pts;i++){
      const px = (i/pts)*W;
      const py = H*0.5 + Math.sin(i*0.3 + time*0.002)*40 + (Math.random()-0.5)*20;
      ctx.fillStyle = `rgba(78,205,196,${0.15+(i/pts)*0.4})`;
      ctx.beginPath(); ctx.arc(px,py,1.6,0,Math.PI*2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(245,182,66,0.95)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x=0;x<W;x++){
      const k = x/W;
      const y = H*0.3 + Math.exp(-k*4)*H*0.5 + Math.sin(k*30 + time*0.002)*3;
      if (x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    const cx = ((time*0.1) % W);
    ctx.fillStyle = 'rgba(245,182,66,0.9)';
    ctx.beginPath(); ctx.arc(cx, H*0.3 + Math.exp(-(cx/W)*4)*H*0.5, 4, 0, Math.PI*2); ctx.fill();
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(245,182,66,0.9)'; ctx.fillText('LOSS / EPOCH', 24, 28);
    ctx.fillStyle = 'rgba(78,205,196,0.9)'; ctx.fillText('● TRAIN  ○ VAL', 24, H-22);
  }

  function merkleFold(time){
    ctx.fillStyle = '#05060a'; ctx.fillRect(0,0,W,H);
    const levels = 4, leaves = 8, rowH = H/(levels+1);
    for (let lvl=0; lvl<=levels; lvl++){
      const n = Math.max(1, leaves/Math.pow(2, lvl));
      const step = W/(n+1);
      for (let i=0;i<n;i++){
        const x = step*(i+1);
        const y = H*0.15 + lvl*rowH;
        const phase = (time*0.0008 - lvl*0.15) % 1;
        const pulse = Math.max(0, 1 - Math.abs(phase)*3);
        ctx.fillStyle = `rgba(245,182,66,${0.35+pulse*0.55})`;
        ctx.beginPath(); ctx.arc(x,y,5+pulse*4,0,Math.PI*2); ctx.fill();
        if (lvl < levels){
          const pn = Math.max(1, leaves/Math.pow(2, lvl+1));
          const pstep = W/(pn+1);
          const pi = Math.floor(i/2);
          const px = pstep*(pi+1);
          const py = H*0.15 + (lvl+1)*rowH;
          ctx.strokeStyle = `rgba(78,205,196,${0.25+pulse*0.4})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(px,py); ctx.stroke();
        }
      }
    }
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(245,182,66,0.9)'; ctx.fillText('MERKLE FOLD', 24, 28);
    ctx.fillStyle = 'rgba(78,205,196,0.8)'; ctx.fillText('leaves → root', 24, H-22);
  }

  function weightField(time){
    ctx.fillStyle = 'rgba(5,6,10,0.15)'; ctx.fillRect(0,0,W,H);
    const cols = 40, rows = 20, cw = W/cols, ch = H/rows;
    for (let i=0;i<cols;i++) for (let j=0;j<rows;j++){
      const v = Math.sin(i*0.3 + time*0.002) * Math.cos(j*0.4 - time*0.0015);
      const a = Math.abs(v)*0.5;
      if (a < 0.1) continue;
      ctx.fillStyle = v>0 ? `rgba(245,182,66,${a})` : `rgba(78,205,196,${a})`;
      ctx.fillRect(i*cw+1, j*ch+1, cw-2, ch-2);
    }
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(245,182,66,0.9)'; ctx.fillText('WEIGHT FIELD / SGD', 24, 28);
  }

  function chainRun(time){
    ctx.fillStyle = '#05060a'; ctx.fillRect(0,0,W,H);
    const n = 12, pad = 40;
    const bw = (W-pad*2)/n - 8, bh = H*0.45, y = (H-bh)/2;
    for (let i=0;i<n;i++){
      const x = pad + i*((W-pad*2)/n);
      const pulse = Math.max(0, 1 - Math.abs(((time*0.0006 - i*0.08)%1)-0.5)*3);
      ctx.fillStyle = 'rgba(18,21,27,0.85)';
      ctx.strokeStyle = `rgba(245,182,66,${0.35+pulse*0.55})`;
      ctx.lineWidth = 1 + pulse*1.4;
      ctx.beginPath(); ctx.roundRect(x,y,bw,bh,3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = `rgba(78,205,196,${0.35+pulse*0.4})`;
      for (let k=0;k<3;k++) ctx.fillRect(x+6, y+12+k*10, bw-12, 2);
      ctx.font = '8px ui-monospace, monospace';
      ctx.fillStyle = `rgba(245,182,66,${0.5+pulse*0.4})`;
      ctx.fillText('0x'+fakeHash(3), x+6, y+bh-8);
      if (i<n-1){
        ctx.strokeStyle = `rgba(245,182,66,${0.3+pulse*0.4})`;
        ctx.beginPath(); ctx.moveTo(x+bw, y+bh/2); ctx.lineTo(x+(W-pad*2)/n, y+bh/2); ctx.stroke();
      }
    }
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(245,182,66,0.9)'; ctx.fillText('CHAIN / BLOCK PROPAGATION', 24, 28);
  }

  function coinSpin(time){
    ctx.fillStyle = '#05060a'; ctx.fillRect(0,0,W,H);
    const cx = W/2, cy = H/2, R = Math.min(W,H)*0.28, spin = time*0.0008;
    for (let i=0;i<3;i++){
      ctx.strokeStyle = `rgba(245,182,66,${0.4-i*0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx,cy,R+i*20+Math.sin(time*0.002+i)*3,0,Math.PI*2); ctx.stroke();
    }
    for (let k=-3;k<=3;k++){
      const phase = k/4;
      const k2 = Math.cos(spin + phase*0.3);
      const rx = R*(0.4+Math.abs(k2)*0.6);
      const a = 0.15+Math.abs(k2)*0.35;
      ctx.fillStyle = `rgba(245,182,66,${a})`;
      ctx.beginPath(); ctx.ellipse(cx, cy+k*5, rx, R*0.95, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(232,93,117,0.35)';
    for (let a=0;a<Math.PI*2;a+=Math.PI/12){
      const x = Math.cos(spin+a);
      ctx.beginPath(); ctx.ellipse(cx, cy, Math.abs(x)*R*0.95+2, R*0.95, 0, 0, Math.PI*2); ctx.stroke();
    }
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(245,182,66,0.9)'; ctx.fillText('MERA / ISSUANCE', 24, 28);
  }

  function chartStack(time){
    ctx.fillStyle = '#05060a'; ctx.fillRect(0,0,W,H);
    const cols = 32, bw = W/cols, base = H*0.85;
    for (let i=0;i<cols;i++){
      const phase = (time*0.0005 + i*0.05) % 1;
      const h = (Math.sin(i*0.7 + time*0.0015)*0.5+0.5)*H*0.55+20;
      const barY = base - h;
      const a = 0.35 + Math.sin(phase*Math.PI)*0.5;
      const grad = ctx.createLinearGradient(0, barY, 0, base);
      grad.addColorStop(0, `rgba(245,182,66,${a})`);
      grad.addColorStop(1, `rgba(78,205,196,${a*0.4})`);
      ctx.fillStyle = grad;
      ctx.fillRect(i*bw+2, barY, bw-4, h);
    }
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(245,182,66,0.9)'; ctx.fillText('SUPPLY / BUDGET / PENDING', 24, 28);
  }

  const SCENE_FN = { lossDescent, merkleFold, weightField, chainRun, coinSpin, chartStack };

  function draw(time){
    const fn = SCENE_FN[scenes[sceneIdx]];
    if (fn) fn(time);
    const cx = W*0.5 + Math.sin(time*0.0006)*W*0.35;
    const cy = H*0.5 + Math.cos(time*0.0009)*H*0.3;
    ctx.strokeStyle = 'rgba(245,182,66,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx-10,cy); ctx.lineTo(cx+10,cy);
    ctx.moveTo(cx,cy-10); ctx.lineTo(cx,cy+10);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,22,0,Math.PI*2); ctx.stroke();
  }

  function frame(now){
    if (!visible){ raf = null; return; }
    const time = now - t0;
    draw(time);
    if (now - last > 90){
      last = now;
      if (frameLabel) frameLabel.textContent = 'FRAME ' + String(Math.floor(time/16)).padStart(6,'0');
      if (hashLabel) hashLabel.textContent = 'hash ' + fakeHash(8);
      if (statLabel){
        const names = ['TRAIN · LOSS DESCENT','MERKLE · FOLDING','WEIGHTS · UPDATING','CHAIN · PROPAGATING','MERA · ISSUING','SUPPLY · BUDGET'];
        statLabel.textContent = names[sceneIdx];
      }
      if (timeLabel){
        const s = Math.floor(time/1000);
        const ff = Math.floor((time % 1000)/41.6);
        const hh = String(Math.floor(s/3600)).padStart(2,'0');
        const mm = String(Math.floor((s/60)%60)).padStart(2,'0');
        const ss = String(s%60).padStart(2,'0');
        timeLabel.textContent = `${hh}:${mm}:${ss}:${String(ff).padStart(2,'0')}`;
      }
    }
    if (time - sceneStart > SCENE_MS){
      sceneIdx = (sceneIdx + 1) % scenes.length;
      sceneStart = time;
    }
    raf = requestAnimationFrame(frame);
  }

  function start(){ if (!raf && visible) raf = requestAnimationFrame(frame); }
  function stop(){ if (raf){ cancelAnimationFrame(raf); raf = null; } }

  resize();
  addEventListener('resize', resize);
  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !document.hidden;
      if (visible) start(); else stop();
    }, { threshold: 0.15 });
    io.observe(canvas);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && visible) start(); else stop();
  });
})();

/* ---------- PIPELINE canvas ---------- */
(function(){
  const canvas = $('#pipeCanvas');
  if (!canvas || REDUCE) return;

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W = 0, H = 0, visible = false, raf = null, t0 = performance.now();

  const stages = [
    { id:'01', label:'CHALLENGE',  sub:'manifest · budget' },
    { id:'02', label:'TRAINING',   sub:'model · arch' },
    { id:'03', label:'VALIDATION', sub:'ops · reward' },
    { id:'04', label:'ISSUANCE',   sub:'marginal · capped' },
    { id:'05', label:'SEALING',    sub:'sign · PoW' },
  ];

  function resize(){
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function rr(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  function draw(time){
    ctx.fillStyle = '#0a0c12'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = 'rgba(28,34,48,0.7)'; ctx.lineWidth = 1;
    for (let x=0;x<W;x+=30){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y=0;y<H;y+=30){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    const n = stages.length, pad = 30;
    const bw = Math.min(180, (W - pad*2 - (n-1)*20) / n);
    const bh = 90;
    const y0 = H/2 - bh/2;
    const totalW = n*bw + (n-1)*20;
    const startX = (W - totalW)/2;
    const cy = H/2;

    ctx.strokeStyle = 'rgba(46,54,71,0.9)';
    ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(startX,cy); ctx.lineTo(startX+totalW,cy); ctx.stroke();
    ctx.setLineDash([]);

    const grad = ctx.createLinearGradient(startX, cy, startX+totalW, cy);
    grad.addColorStop(0,'rgba(78,205,196,0)');
    grad.addColorStop(0.35,'rgba(78,205,196,0.6)');
    grad.addColorStop(0.65,'rgba(245,182,66,0.8)');
    grad.addColorStop(1,'rgba(245,182,66,0)');
    ctx.strokeStyle = grad; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(startX,cy); ctx.lineTo(startX+totalW,cy); ctx.stroke();

    const pPhase = ((time*0.0004)%1.2)-0.1;
    if (pPhase>=0 && pPhase<=1){
      const px = startX + totalW*pPhase;
      ctx.fillStyle = 'rgba(245,182,66,0.9)';
      ctx.shadowColor = 'rgba(245,182,66,0.9)'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(px,cy,4,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (let i=0;i<n;i++){
      const x = startX + i*(bw+20);
      const pulse = Math.max(0, 1 - Math.abs(((time*0.0006 - i*0.15)%1)-0.5)*3.4);
      if (pulse > 0.1){
        ctx.fillStyle = `rgba(245,182,66,${0.05*pulse})`;
        ctx.beginPath(); ctx.arc(x+bw/2, cy, 90, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#0f131c';
      ctx.strokeStyle = `rgba(245,182,66,${0.25+pulse*0.6})`;
      ctx.lineWidth = 1 + pulse*0.8;
      rr(x, y0, bw, bh, 4); ctx.fill(); ctx.stroke();

      ctx.font = '11px ui-monospace, monospace';
      ctx.fillStyle = `rgba(245,182,66,${0.7+pulse*0.3})`;
      ctx.fillText(stages[i].id, x+12, y0+22);
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.fillStyle = '#f0ebe0';
      ctx.fillText(stages[i].label, x+12, y0+46);
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillStyle = 'rgba(138,133,120,0.9)';
      ctx.fillText(stages[i].sub, x+12, y0+66);

      if (i<n-1){
        const ax = x+bw+6;
        ctx.strokeStyle = `rgba(245,182,66,${0.3+pulse*0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ax,cy-4); ctx.lineTo(ax+8,cy); ctx.lineTo(ax,cy+4);
        ctx.stroke();
      }
    }
  }

  function frame(now){
    if (!visible){ raf = null; return; }
    draw(now-t0);
    raf = requestAnimationFrame(frame);
  }
  function start(){ if (!raf && visible) raf = requestAnimationFrame(frame); }
  function stop(){ if (raf){ cancelAnimationFrame(raf); raf = null; } }

  resize();
  addEventListener('resize', resize);
  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !document.hidden;
      if (visible) start(); else stop();
    }, { threshold: 0.15 });
    io.observe(canvas);
  }
})();

/* ---------- FORMULA highlight + counters ---------- */
(function(){
  const panel = $('#formulaPanel');
  if (!panel) return;
  const rows = $$('.f-row', panel);
  if (!rows.length) return;

  if (REDUCE){ rows.forEach(r => r.classList.add('hot')); }

  let i = 0, started = false;
  function step(){
    rows.forEach(r => r.classList.remove('hot'));
    rows[i].classList.add('hot');
    i = (i + 1) % rows.length;
  }
  if (!REDUCE && 'IntersectionObserver' in window){
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started){
        started = true; step();
        setInterval(step, 1900);
        io.unobserve(e.target);
      }
    }, { threshold: 0.25 });
    io.observe(panel);
  }

  const vals = $$('.f-row .val[data-count]');
  if (vals.length && !REDUCE && 'IntersectionObserver' in window){
    const fmt = n => n.toLocaleString('en-US').replace(/,/g, ' ');
    const io2 = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseInt(el.dataset.count, 10);
        const dur = 1400;
        const t0 = performance.now();
        (function s(now){
          const k = Math.min((now-t0)/dur, 1);
          const ease = 1 - Math.pow(1-k, 3);
          el.textContent = fmt(Math.round(target*ease));
          if (k < 1) requestAnimationFrame(s);
        })(t0);
        io2.unobserve(el);
      });
    }, { threshold: 0.5 });
    vals.forEach(v => io2.observe(v));
  }
})();

/* ---------- TERMINAL typing ---------- */
(function(){
  const body = $('#termBody');
  if (!body) return;

  const script = [
    { p:'$', t:'python mlabchain.py --data-dir ./node1 init --network devnet' },
    { o:'STATUS=initialized' },
    { o:'NETWORK=devnet' },
    { o:'ASSET=MERA · DECIMALS=8 · MAX_SUPPLY=100000000' },
    { n:true },
    { p:'$', t:'python mlabchain.py --data-dir ./node1 create-wallet' },
    { o:'Address: MERA1f3a…9c21b6e0', ok:true },
    { n:true },
    { p:'$', t:'python mlabchain.py --data-dir ./node1 challenge-create \\' },
    { o:'    --id MLC-LINEAR-001 --n-samples 1200 --max-epochs 100' },
    { o:'Manifest SHA256: 8b2c…f4a1' },
    { n:true },
    { p:'$', t:'python mlabchain.py --data-dir ./node1 mine \\' },
    { o:'    --challenge MLC-LINEAR-001.json --config config.json' },
    { o:'Training done. wall=0.018s  NMSE=0.041  I=24.4' },
    { o:'ML work accepted. reward=3.84 MERA' },
    { o:'Block: 9  0x0000a4f3…c8e1', ok:true },
    { n:true },
    { p:'$', t:'python mlabchain.py --data-dir ./node1 validate' },
    { o:'STATUS=VALID' },
    { o:'BLOCKS=10  TRANSACTIONS=3  TOTAL_SUPPLY=3.84000000 MERA', ok:true },
  ];

  body.innerHTML = '';
  const el = c => { const d = document.createElement('div'); d.className = 'ln ' + c; return d; };

  if (REDUCE){
    script.forEach(s => {
      if (s.p){
        const d = el('');
        d.innerHTML = `<span class="pr">${s.p}</span> <span class="cm">${s.t}</span>`;
        body.appendChild(d);
      } else if (s.o){
        body.appendChild(el(s.ok?'out ok':'out')).textContent = s.o;
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
      if (k < text.length) setTimeout(tick, 16 + Math.random()*22);
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
      typeInto(cm, s.t, () => setTimeout(step, 260));
    } else if (s.o){
      const d = el(s.ok ? 'out ok' : 'out');
      d.textContent = s.o;
      body.appendChild(d);
      setTimeout(step, 90);
    } else {
      const d = el('');
      d.innerHTML = '&nbsp;';
      body.appendChild(d);
      setTimeout(step, 180);
    }
  }

  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting){ step(); io.unobserve(e.target); }
    }, { threshold: 0.2 });
    io.observe(body);
  } else {
    step();
  }
})();

/* ---------- roundRect polyfill ---------- */
if (!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
    if (typeof r === 'number') r = [r, r, r, r];
    this.moveTo(x + r[0], y);
    this.lineTo(x + w - r[1], y);
    this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
    this.lineTo(x + w, y + h - r[2]);
    this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
    this.lineTo(x + r[3], y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
    this.lineTo(x, y + r[0]);
    this.quadraticCurveTo(x, y, x + r[0], y);
    return this;
  };
}