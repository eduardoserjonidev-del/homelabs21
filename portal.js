// ---------- 1. Água interativa em pixel art ----------
(() => {
  const canvas = document.getElementById('water-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });

  const PIXEL_SIZE = 8;
  const DAMPING = 0.984;
  const STEP_MS = 1000 / 45;

  let cols = 0;
  let rows = 0;
  let curr = new Float32Array(0);
  let prev = new Float32Array(0);
  let sinX = new Float32Array(0);
  let cosY = new Float32Array(0);
  let imageData = null;
  let pixels = null;

  function resize() {
    cols = Math.max(40, Math.ceil(window.innerWidth / PIXEL_SIZE));
    rows = Math.max(30, Math.ceil(window.innerHeight / PIXEL_SIZE));
    canvas.width = cols;
    canvas.height = rows;
    curr = new Float32Array(cols * rows);
    prev = new Float32Array(cols * rows);
    sinX = new Float32Array(cols);
    cosY = new Float32Array(rows);
    imageData = ctx.createImageData(cols, rows);
    pixels = imageData.data;
    renderWater(0);
  }

  function disturb(clientX, clientY, radius = 3, strength = 320) {
    const cx = Math.floor(clientX / PIXEL_SIZE);
    const cy = Math.floor(clientY / PIXEL_SIZE);

    for (let dy = -radius; dy <= radius; dy++) {
      const y = cy + dy;
      if (y <= 1 || y >= rows - 2) continue;
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        if (x <= 1 || x >= cols - 2) continue;
        const distSq = dx * dx + dy * dy;
        if (distSq <= radius * radius) {
          const falloff = 1 - Math.sqrt(distSq) / (radius + 0.5);
          prev[y * cols + x] += strength * falloff;
        }
      }
    }
  }

  function stepPhysics() {
    for (let y = 1; y < rows - 1; y++) {
      const row = y * cols;
      for (let x = 1; x < cols - 1; x++) {
        const i = row + x;
        let val = (
          prev[i - 1] +
          prev[i + 1] +
          prev[i - cols] +
          prev[i + cols]
        ) * 0.5 - curr[i];
        val *= DAMPING;
        if (val > 600) val = 600;
        else if (val < -600) val = -600;
        curr[i] = val;
      }
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }

  function renderWater(t) {
    for (let x = 0; x < cols; x++) sinX[x] = Math.sin(x * 0.14 + t * 1.6);
    for (let y = 0; y < rows; y++) cosY[y] = Math.cos(y * 0.18 - t * 1.1);

    for (let y = 0; y < rows; y++) {
      const row = y * cols;
      const cy = cosY[y];

      for (let x = 0; x < cols; x++) {
        const i = row + x;
        const p = i * 4;

        const left = x > 0 ? prev[i - 1] : 0;
        const top = y > 0 ? prev[i - cols] : 0;
        const slope = (prev[i] - left) + (prev[i] - top);
        const level = Math.round(slope / 6);

        // Maré sutil de fundo para a água ficar viva mesmo sem mexer o mouse
        const tide = sinX[x] + cy;

        let r = 8;
        let g = 16;
        let b = 26;

        if (tide > 0.7) {
          r = 12;
          g = 24;
          b = 38;
        } else if (tide < -0.9) {
          r = 6;
          g = 12;
          b = 20;
        }

        if (level >= 6) {
          r = 110;
          g = 255;
          b = 214;
        } else if (level >= 4) {
          r = 57;
          g = 240;
          b = 186;
        } else if (level >= 2) {
          r = 35;
          g = 148;
          b = 148;
        } else if (level === 1) {
          r = 19;
          g = 68;
          b = 84;
        } else if (level <= -2) {
          r = 4;
          g = 8;
          b = 14;
        } else if (level === -1) {
          r = 6;
          g = 11;
          b = 18;
        }

        pixels[p] = r;
        pixels[p + 1] = g;
        pixels[p + 2] = b;
        pixels[p + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  let lastPointerX = null;
  let lastPointerY = null;

  window.addEventListener('pointermove', (e) => {
    const dx = lastPointerX === null ? 0 : e.clientX - lastPointerX;
    const dy = lastPointerY === null ? 0 : e.clientY - lastPointerY;
    const speed = Math.min(Math.hypot(dx, dy), 45);
    disturb(e.clientX, e.clientY, 3, 180 + speed * 7);
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  }, { passive: true });

  window.addEventListener('pointerdown', (e) => {
    disturb(e.clientX, e.clientY, 5, 520);
  }, { passive: true });

  window.addEventListener('resize', resize);
  resize();

  // Ondas iniciais ao abrir a página
  disturb(window.innerWidth * 0.5, window.innerHeight * 0.5, 5, 480);
  disturb(window.innerWidth * 0.25, window.innerHeight * 0.35, 3, 320);
  disturb(window.innerWidth * 0.75, window.innerHeight * 0.65, 3, 320);

  // Gotas periódicas de ambiente
  setInterval(() => {
    if (document.hidden) return;
    const rx = (0.1 + Math.random() * 0.8) * window.innerWidth;
    const ry = (0.1 + Math.random() * 0.8) * window.innerHeight;
    disturb(rx, ry, 3, 300);
  }, 1600);

  let lastTime = performance.now();
  let acc = 0;

  function loop(now) {
    const dt = Math.min(now - lastTime, 100);
    lastTime = now;
    acc += dt;

    let updated = false;
    let steps = 0;
    while (acc >= STEP_MS && steps < 3) {
      stepPhysics();
      acc -= STEP_MS;
      steps++;
      updated = true;
    }

    if (updated) renderWater(now * 0.001);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
  window.__waterSplash = disturb;
})();

// ---------- 2. Inclinação magnética 3D dos cards ----------
document.querySelectorAll('.portal-card').forEach((card) => {
  card.addEventListener('pointerenter', () => {
    const rect = card.getBoundingClientRect();
    if (window.__waterSplash) {
      window.__waterSplash(rect.left + rect.width / 2, rect.top + rect.height / 2, 5, 380);
    }
  });

  card.addEventListener('pointermove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const rotY = x * 14;
    const rotX = -y * 14;
    card.style.transform = `translateY(-4px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
  });

  card.addEventListener('pointerleave', () => {
    card.style.transform = '';
  });
});

// ---------- 3. Status ao vivo do S21+ (/api/status) ----------
async function carregarStatusTopo() {
  const pill = document.getElementById('live-pill');
  const text = document.getElementById('live-text');
  if (!pill || !text) return;

  const contar = !sessionStorage.getItem('s21_visita_registrada');
  const url = contar ? '/api/status?visit=1' : '/api/status';

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error();
    const d = await res.json();

    if (contar) {
      sessionStorage.setItem('s21_visita_registrada', '1');
    }

    pill.className = 'live-pill on';
    const ram = d.ram != null ? ` • RAM ${Number(d.ram).toFixed(0)}%` : '';
    const up = d.uptime ? ` • ${d.uptime}` : '';
    text.textContent = `S21+ online${ram}${up}`;
  } catch {
    pill.className = 'live-pill off';
    text.textContent = 'S21+ offline';
  }
}

carregarStatusTopo();
setInterval(carregarStatusTopo, 30000);