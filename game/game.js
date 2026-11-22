// HANSZY COIN RUSH — a tiny browser game built from one prompt:
// "Buatkan game browser kecil: kucing oranye mengumpulkan koin emas dalam
// 30 detik, pakai tombol panah, ada skor dan timer."
// Move the orange cat with arrow keys or WASD. Add ?auto=1 to the URL and the
// cat plays itself (used to film the game for the make.fun video).
// Plain canvas, no libraries, no network.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(location.search);
const AUTO = params.get('auto') === '1';
const SEED = Number(params.get('seed') || '20261122');

// Small deterministic RNG so the autopilot run films the same every time.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);

const GAME_TIME = 30;
const COIN_TARGET = 5;

let W = 0;
let H = 0;
let DPR = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// The cat: position, velocity, size. It starts in the middle of the screen.
const cat = { x: 0, y: 0, vx: 0, vy: 0, r: 46, face: 1 };
cat.x = W / 2;
cat.y = H / 2;

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

// Coins: gold circles the cat collects. Keep COIN_TARGET on screen.
const coins = [];
function spawnCoin() {
  const m = 90;
  coins.push({
    x: m + rand() * (W - 2 * m),
    y: 150 + rand() * (H - 260),
    r: 26,
    phase: rand() * Math.PI * 2,
    taken: false,
  });
}
for (let i = 0; i < COIN_TARGET; i++) spawnCoin();

// Stars in the background, placed once.
const stars = [];
for (let i = 0; i < 90; i++) {
  stars.push({ x: rand() * 2000, y: rand() * 2000, r: 0.6 + rand() * 1.8, tw: rand() * Math.PI * 2 });
}

let score = 0;
let collected = 0;
let timeLeft = GAME_TIME;
let over = false;
let startAt = 0;
let last = 0;

// ---- drawing ----

function drawBackground(t) {
  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(0, 0, W, H);
  for (const s of stars) {
    const a = 0.25 + 0.55 * Math.abs(Math.sin(t / 900 + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#8ef5e3';
    ctx.beginPath();
    ctx.arc((s.x % W), (s.y % H), s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCoin(c, t) {
  const bob = Math.sin(t / 300 + c.phase) * 4;
  const pulse = 1 + 0.08 * Math.sin(t / 240 + c.phase);
  ctx.save();
  ctx.translate(c.x, c.y + bob);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#f7b731';
  ctx.strokeStyle = '#c98a12';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, c.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffe08a';
  ctx.beginPath();
  ctx.arc(-7, -8, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c98a12';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, 1);
  ctx.restore();
}

function drawCat(t) {
  const blink = (Math.sin(t / 1400) > 0.96) ? 0.15 : 1;
  ctx.save();
  ctx.translate(cat.x, cat.y);
  // Tail.
  ctx.strokeStyle = '#e8821e';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-34, 26);
  ctx.quadraticCurveTo(-70, 34 + Math.sin(t / 350) * 8, -78, 6);
  ctx.stroke();
  // Body.
  ctx.fillStyle = '#f39c2c';
  ctx.beginPath();
  ctx.ellipse(0, 18, 40, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ears.
  ctx.fillStyle = '#f39c2c';
  ctx.beginPath();
  ctx.moveTo(-30, -18); ctx.lineTo(-40, -48); ctx.lineTo(-12, -30); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(30, -18); ctx.lineTo(40, -48); ctx.lineTo(12, -30); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffcf9e';
  ctx.beginPath();
  ctx.moveTo(-29, -24); ctx.lineTo(-35, -42); ctx.lineTo(-18, -29); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(29, -24); ctx.lineTo(35, -42); ctx.lineTo(18, -29); ctx.closePath(); ctx.fill();
  // Head.
  ctx.fillStyle = '#f7a83c';
  ctx.beginPath();
  ctx.arc(0, -12, 34, 0, Math.PI * 2);
  ctx.fill();
  // Stripes.
  ctx.strokeStyle = '#e8821e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-12, -44); ctx.lineTo(-8, -32);
  ctx.moveTo(0, -46); ctx.lineTo(0, -33);
  ctx.moveTo(12, -44); ctx.lineTo(8, -32);
  ctx.stroke();
  // Eyes.
  ctx.fillStyle = '#1d1d1d';
  ctx.beginPath();
  ctx.ellipse(-13, -16, 4.5, 6 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(13, -16, 4.5, 6 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  // Nose + mouth.
  ctx.fillStyle = '#e2574c';
  ctx.beginPath();
  ctx.moveTo(-6, -4); ctx.lineTo(6, -4); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#1d1d1d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 3); ctx.quadraticCurveTo(0, 9, -8, 8);
  ctx.moveTo(0, 3); ctx.quadraticCurveTo(0, 9, 8, 8);
  ctx.stroke();
  // Whiskers.
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-28, -6); ctx.lineTo(-48, -10);
  ctx.moveTo(-28, 0); ctx.lineTo(-48, 2);
  ctx.moveTo(28, -6); ctx.lineTo(48, -10);
  ctx.moveTo(28, 0); ctx.lineTo(48, 2);
  ctx.stroke();
  ctx.restore();
}

function drawHud() {
  ctx.fillStyle = 'rgba(11,14,20,0.55)';
  ctx.fillRect(0, 0, W, 118);
  ctx.fillStyle = '#2de1c2';
  ctx.font = '800 44px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('HANSZY COIN RUSH', 28, 44);
  ctx.fillStyle = '#ffd166';
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('SKOR ' + score, W - 28, 40);
  ctx.fillStyle = '#8ef5e3';
  ctx.font = '600 26px system-ui, sans-serif';
  ctx.fillText('KOIN ' + collected, W - 28, 84);
  // Timer bar.
  const bw = W - 56;
  const frac = Math.max(0, timeLeft / GAME_TIME);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(28, 92, bw, 12);
  ctx.fillStyle = frac > 0.33 ? '#2de1c2' : '#e2574c';
  ctx.fillRect(28, 92, bw * frac, 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(Math.ceil(timeLeft) + ' dtk', 28, 76);
}

function drawOver() {
  ctx.fillStyle = 'rgba(5,7,10,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd166';
  ctx.font = '800 84px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WAKTU HABIS!', W / 2, H / 2 - 90);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 56px system-ui, sans-serif';
  ctx.fillText('Skor akhir: ' + score + '  •  Koin: ' + collected, W / 2, H / 2 + 10);
  ctx.fillStyle = '#2de1c2';
  ctx.font = '600 40px system-ui, sans-serif';
  ctx.fillText('Satu prompt. Satu game. make.fun', W / 2, H / 2 + 100);
}

// ---- update ----

function nearestCoin() {
  let best = null;
  let bd = Infinity;
  for (const c of coins) {
    if (c.taken) continue;
    const d = (c.x - cat.x) ** 2 + (c.y - cat.y) ** 2;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

function update(dt) {
  if (over) return;
  timeLeft -= dt;
  if (timeLeft <= 0) {
    timeLeft = 0;
    over = true;
    document.getElementById('hint').style.display = 'none';
    return;
  }

  // Autopilot: steer toward the nearest coin. A human plays with keys.
  let ax = 0;
  let ay = 0;
  if (AUTO) {
    const c = nearestCoin();
    if (c) {
      ax = Math.sign(c.x - cat.x);
      ay = Math.sign(c.y - cat.y);
    }
  } else {
    if (keys['arrowleft'] || keys['a']) ax -= 1;
    if (keys['arrowright'] || keys['d']) ax += 1;
    if (keys['arrowup'] || keys['w']) ay -= 1;
    if (keys['arrowdown'] || keys['s']) ay += 1;
  }
  const len = Math.hypot(ax, ay) || 1;
  const SPEED = 420;
  cat.vx += (ax / len) * SPEED * dt * 6;
  cat.vy += (ay / len) * SPEED * dt * 6;
  cat.vx *= Math.pow(0.0015, dt);
  cat.vy *= Math.pow(0.0015, dt);
  const sp = Math.hypot(cat.vx, cat.vy);
  const MAX = 460;
  if (sp > MAX) { cat.vx = (cat.vx / sp) * MAX; cat.vy = (cat.vy / sp) * MAX; }
  cat.x += cat.vx * dt;
  cat.y += cat.vy * dt;
  cat.x = Math.max(50, Math.min(W - 50, cat.x));
  cat.y = Math.max(150, Math.min(H - 60, cat.y));
  if (Math.abs(cat.vx) > 20) cat.face = Math.sign(cat.vx);

  for (const c of coins) {
    if (c.taken) continue;
    if (Math.hypot(c.x - cat.x, c.y - cat.y) < cat.r + c.r - 8) {
      c.taken = true;
      score += 10;
      collected += 1;
      spawnCoin();
    }
  }
  for (let i = coins.length - 1; i >= 0; i--) {
    if (coins[i].taken) coins.splice(i, 1);
  }
}

// ---- main loop ----

function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0);
  last = t;
  if (!startAt) startAt = t;
  update(dt);
  drawBackground(t);
  for (const c of coins) drawCoin(c, t);
  drawCat(t);
  drawHud();
  if (over) drawOver();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
