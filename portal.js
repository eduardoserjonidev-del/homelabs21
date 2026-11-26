// ---------- 1. Água interativa suave em pixel art ----------
(() => {
  const canvas = document.getElementById('water-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });

  const PIXEL_SIZE = 7;
  const DAMPING = 0.978;
  const STEP_MS = 1000 / 48;

  let cols = 0;
  let rows = 0;
  let curr = new Float32Array(0);
  let prev = new Float32Array(0);
  let sinX = new Float32Array(0);
  let cosY = new Float32Array(0);
  let imageData = null;
  let pixels = null;

  // Preferência de gotas automáticas salva no navegador
  let dropsEnabled = localStorage.getItem('s21_drops') !== '0';

  function resize() {
    cols = Math.max(48, Math.ceil(window.innerWidth / PIXEL_SIZE));
    rows = Math.max(36, Math.ceil(window.innerHeight / PIXEL_SIZE));
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

  function disturb(clientX, clientY, radius = 3, strength = 150) {
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
          const norm = Math.sqrt(distSq) / (radius + 0.4);
          // Queda suave (curva quadrática) para ondas redondas e macias
          const falloff = (1 - norm) * (1 - norm);
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
        if (val > 360) val = 360;
        else if (val < -360) val = -360;
        curr[i] = val;
      }
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }

  function renderWater(t) {
    for (let x = 0; x < cols; x++) sinX[x] = Math.sin(x * 0.1 + t * 0.75);
    for (let y = 0; y < rows; y++) cosY[y] = Math.cos(y * 0.12 - t * 0.55);

    for (let y = 0; y < rows; y++) {
      const row = y * cols;
      const cy = cosY[y];

      for (let x = 0; x < cols; x++) {
        const i = row + x;
        const p = i * 4;

        const left = x > 0 ? prev[i - 1] : 0;
        const top = y > 0 ? prev[i - cols] : 0;
        const slope = (prev[i] - left) + (prev[i] - top);

        // Maré calma de fundo
        const tide = (sinX[x] + cy) * 0.5;
        let r = 9 + tide * 2.2;
        let g = 17 + tide * 3.8;
        let b = 27 + tide * 5.2;

        // Quantização leve em 12 degraus para manter pixel art sem saltos bruscos
        const raw = Math.max(-1, Math.min(1, slope / 62));
        const q = Math.round(raw * 12) / 12;

        if (q > 0) {
          // Mistura suave até o turquesa --signal (#49e0c4)
          const glow = q * q;
          r += 48 * q + 18 * glow;
          g += 155 * q + 52 * glow;
          b += 140 * q + 35 * glow;
        } else if (q < 0) {
          const shade = -q;
          r -= 5 * shade;
          g -= 8 * shade;
          b -= 11 * shade;
        }

        pixels[p] = r < 4 ? 4 : r > 255 ? 255 : r;
        pixels[p + 1] = g < 8 ? 8 : g > 255 ? 255 : g;
        pixels[p + 2] = b < 14 ? 14 : b > 255 ? 255 : b;
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
    const speed = Math.min(Math.hypot(dx, dy), 36);
    disturb(e.clientX, e.clientY, 3, 75 + speed * 3.4);
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  }, { passive: true });

  window.addEventListener('pointerdown', (e) => {
    disturb(e.clientX, e.clientY, 5, 290);
  }, { passive: true });

  window.addEventListener('resize', resize);
  resize();

  // Botão de ativar/desativar gotas automáticas
  const toggleBtn = document.getElementById('toggle-drops');
  const toggleLabel = document.getElementById('toggle-drops-label');

  function syncDropsUI() {
    if (!toggleBtn || !toggleLabel) return;
    toggleBtn.classList.toggle('off', !dropsEnabled);
    toggleBtn.setAttribute('aria-pressed', String(dropsEnabled));
    toggleLabel.textContent = dropsEnabled ? 'gotas: on' : 'gotas: off';
  }

  if (toggleBtn) {
    syncDropsUI();
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropsEnabled = !dropsEnabled;
      localStorage.setItem('s21_drops', dropsEnabled ? '1' : '0');
      syncDropsUI();
    });
  }

  if (dropsEnabled) {
    disturb(window.innerWidth * 0.5, window.innerHeight * 0.48, 4, 210);
  }

  // Gotas ambientais mais espaçadas e suaves
  setInterval(() => {
    if (!dropsEnabled || document.hidden) return;
    const rx = (0.12 + Math.random() * 0.76) * window.innerWidth;
    const ry = (0.12 + Math.random() * 0.76) * window.innerHeight;
    disturb(rx, ry, 3, 175);
  }, 2600);

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

// ---------- 2. Inclinação 3D suave nos cards (apenas mouse) ----------
document.querySelectorAll('.portal-card').forEach((card) => {
  card.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    const rect = card.getBoundingClientRect();
    if (window.__waterSplash) {
      window.__waterSplash(rect.left + rect.width / 2, rect.top + rect.height / 2, 4, 190);
    }
  });

  card.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const rotY = x * 10;
    const rotX = -y * 10;
    card.style.transform = `translateY(-4px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
  });

  card.addEventListener('pointerleave', () => {
    card.style.transform = '';
  });
});

// ---------- 3. Aba expansível de contatos no rodapé ----------
(() => {
  const root = document.getElementById('contacts-root');
  const tab = document.getElementById('contacts-tab');
  const drawer = document.getElementById('contacts-drawer');
  if (!root || !tab || !drawer) return;

  function setOpen(open) {
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    tab.setAttribute('aria-expanded', String(open));
  }

  tab.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = drawer.classList.contains('open');
    setOpen(!isOpen);
  });

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
})();

// ---------- 4. Status ao vivo do S21+ (/api/status) ----------
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