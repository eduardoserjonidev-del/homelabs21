// ---------- data ----------
const nodes = [
  {
    icon: '👤',
    label: 'Visitante',
    tag: 'ponto 1',
    title: 'Visitante digita o endereço',
    text: 'Alguém acessa homelabs21.duckdns.org no navegador. Nesse momento, nenhuma conexão foi feita ainda — o navegador só sabe o nome do domínio.',
    kv: [['protocolo', 'HTTPS'], ['porta esperada', '443']]
  },
  {
    icon: '🌐',
    label: 'DNS / DDNS',
    tag: 'ponto 2',
    title: 'O nome vira um endereço IP',
    text: 'O DuckDNS resolve o domínio para o IP público atual da rede. Como esse IP muda com o tempo, um script próprio (update-duckdns.sh) roda a cada 5 minutos via cron e mantém o registro atualizado — criado depois de um incidente real de mudança de IP que derrubou o domínio antigo.',
    kv: [['domínio atual', 'homelabs21.duckdns.org'], ['atualização', 'a cada 5 min via cron']],
    block: 'lab/scripts/update-duckdns.sh\n → lê domínio e token (~/.duckdns-token, permissão 600)\n → contata DuckDNS via HTTPS\n → registra resultado em lab/logs/duckdns.log'
  },
  {
    icon: '📡',
    label: 'Roteador',
    tag: 'ponto 3',
    title: 'NAT: da porta pública para a privada',
    text: 'O gateway da rede recebe a conexão HTTPS na porta pública 443 e a encaminha para a porta 8443 do S21+ dentro da rede local. Isso existe porque o Termux, sem root, não consegue abrir portas privilegiadas como 443 diretamente.',
    kv: [['porta pública', '443'], ['porta privada', '8443'], ['ip do S21+', 'IP fixo (reserva DHCP)']]
  },
  {
    icon: '📱',
    label: 'S21+',
    tag: 'ponto 4',
    title: 'O servidor recebe a conexão',
    text: 'Dentro do Termux, o runit supervisiona todos os serviços (sshd, nginx, crond, s21monitor). Se algum processo cai, o runit percebe e reinicia automaticamente.',
    kv: [['supervisor', 'runit'], ['administração', 'SSH na LAN por chave Ed25519']]
  },
  {
    icon: '🔒',
    label: 'NGINX',
    tag: 'ponto 5',
    title: 'HTTPS válido e o site estático',
    text: 'O NGINX termina o TLS (certificado real emitido via acme.sh + Let\'s Encrypt, usando o desafio DNS-01 pela DuckDNS) e serve os arquivos do site. Rotas como /api/status são encaminhadas internamente para a API Python.',
    kv: [['tls', '1.2 / 1.3 apenas'], ['certificado', 'Let\'s Encrypt ECC']]
  },
  {
    icon: '🐍',
    label: 'API Python',
    tag: 'ponto 6',
    title: 'O painel de status, isolado',
    text: 'A API de monitoramento escuta só em 127.0.0.1:8090 — nunca fica exposta diretamente à internet. O navegador só enxerga /api/status através do NGINX, nunca a porta 8090 em si.',
    kv: [['escuta em', '127.0.0.1:8090 (local apenas)'], ['exposta via', 'reverse proxy /api/status']]
  }
];

const timeline = [
  {
    n: 1,
    title: 'Primeiro servidor em Python',
    tag: 'servidor',
    text: 'O marco inicial: um servidor HTTP simples em Python rodando em porta alta, provando que o telefone conseguia responder a outros dispositivos da rede local.',
    block: '~/lab/python/server.py → porta 8080\n192.0.2.10:8080 acessível pela LAN'
  },
  {
    n: 2,
    title: 'IP fixo dentro da rede',
    tag: 'rede',
    text: 'Em vez de configurar um IP estático manualmente no Android, foi feita uma reserva DHCP no roteador. O roteador continua no comando, mas sempre entrega o mesmo endereço ao S21+.',
    block: 'reserva DHCP → IP privado fixo atribuído pelo MAC'
  },
  {
    n: 3,
    title: 'SSH com autenticação por chave',
    tag: 'acesso',
    text: 'OpenSSH instalado no Termux em porta alta (não privilegiada, já que não há root). A autenticação por senha foi desativada em favor de uma chave Ed25519 gerada no Fedora.',
    block: 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPubkeyAuthentication yes\n\nalias no Fedora: ssh s21'
  },
  {
    n: 4,
    title: 'runit e serviços supervisionados',
    tag: 'confiabilidade',
    text: 'Com termux-services, os processos deixaram de ser iniciados manualmente. O runit passou a vigiar sshd, o servidor do laboratório, o monitor, o NGINX e o crond — reiniciando qualquer um que caísse.',
    block: 'processo cai → runit percebe → processo é reiniciado'
  },
  {
    n: 5,
    title: 'NGINX como servidor web de verdade',
    tag: 'infraestrutura',
    text: 'O site deixou de depender diretamente do servidor Python. O NGINX passou a servir os arquivos estáticos, escutando em portas altas para HTTP e HTTPS — sem precisar das portas privilegiadas 80/443.',
    block: 'NGINX → ~/lab/web/site/'
  },
  {
    n: 6,
    title: 'NAT e a primeira exposição pública',
    tag: 'rede',
    text: 'O roteador passou a encaminhar a porta pública 443 para a porta 8443 do S21+, permitindo o primeiro acesso externo real ao servidor.',
    block: 'Internet :443 → NAT → LAN :8443'
  },
  {
    n: 7,
    title: 'DuckDNS e um domínio que quebrou',
    tag: 'incidente',
    text: 'O domínio inicial parou de funcionar quando o IP público da casa mudou e o registro não foi atualizado. A solução foi migrar para homelabs21.duckdns.org e nunca mais depender de atualização manual.',
    block: 'IP público anterior: 198.51.100.42 (exemplo)\nIP público novo:     203.0.113.89 (exemplo)\n→ domínio sem DDNS ficou apontando para o IP antigo'
  },
  {
    n: 8,
    title: 'DDNS automático via cron',
    tag: 'automação',
    text: 'Um script próprio passou a atualizar o DuckDNS a cada 5 minutos, guardando o token de acesso fora do código-fonte — uma decisão que já nasceu pensando no futuro versionamento com Git.',
    block: '*/5 * * * * update-duckdns.sh\ntoken em ~/.duckdns-token (permissão 600)'
  },
  {
    n: 9,
    title: 'HTTPS real com Let\'s Encrypt',
    tag: 'segurança',
    text: 'Certificado emitido via acme.sh usando o desafio DNS-01 pela DuckDNS. TLS restrito às versões 1.2 e 1.3, com cabeçalhos de segurança adicionados e informações do servidor ocultadas.',
    block: 'ssl_protocols TLSv1.2 TLSv1.3;\nserver_tokens off;\n+ X-Frame-Options, CSP, Referrer-Policy'
  },
  {
    n: 10,
    title: 'Fedora vira o ambiente de desenvolvimento',
    tag: 'decisão',
    text: 'A decisão mais recente: separar onde se programa de onde se serve. O Fedora ganhou VS Code, Git e Node.js para ser a oficina; o S21+ ficou dedicado a produção.',
    block: 'escrever → testar → git commit → deploy → S21+'
  }
];

const bugs = [
  {
    tag: 'runit',
    title: 'O arquivo "down" escondido',
    text: 'Depois de um desligamento, o NGINX estava cadastrado no runit mas não iniciava. A causa era um arquivo down dentro do diretório do serviço — no runit, isso significa "supervisione, mas mantenha desligado". Bastou removê-lo e rodar sv up nginx.',
    block: '$PREFIX/var/service/nginx/down\n→ removido\n→ sv up nginx\n→ status: run'
  },
  {
    tag: 'DuckDNS',
    title: 'O domínio que sumiu com o IP',
    text: 'O IP público da casa mudou e o domínio antigo continuou apontando para o endereço anterior. A solução foi configurar o novo domínio com atualização automática via cron.',
    block: 'antes: registro estático manual (parou na troca de IP)\ndepois: homelabs21.duckdns.org (com DDNS automático)'
  },
  {
    tag: 'monitor',
    title: '"nginx: true" mesmo desligado',
    text: 'A checagem do NGINX usava pgrep -f nginx. Só que processos internos do runit (runsv, svlogd) também contêm a palavra "nginx" no nome, então a API dizia que o serviço estava no ar mesmo quando não estava — a diferença entre "existe um processo com esse nome" e "o serviço responde de verdade".',
    block: 'pgrep -f nginx → falso positivo\nsolução planejada: checar resposta na porta local de verdade'
  }
];

// ---------- render ----------
const pathEl = document.getElementById('path');
if (pathEl) {
  nodes.forEach((n, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'node focus-ring';
    btn.innerHTML = `<span class="box">${n.icon}</span><span class="label">${n.label}</span>`;
    btn.addEventListener('click', () => openModal(n.tag, n.title, n.text, n.kv, n.block, btn));
    pathEl.appendChild(btn);

    if (i < nodes.length - 1) {
      const link = document.createElement('div');
      link.className = 'link';
      pathEl.appendChild(link);
    }
  });
}

function bindCardInteraction(el, callback) {
  el.addEventListener('click', () => callback(el));
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback(el);
    }
  });
}

const tlEl = document.getElementById('timeline');
if (tlEl) {
  timeline.forEach(t => {
    const item = document.createElement('div');
    item.className = 'tl-item focus-ring';
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    const summary = t.text.length > 100 ? `${t.text.slice(0, 100)}…` : t.text;
    item.innerHTML = `
      <div class="tl-num">${String(t.n).padStart(2, '0')}</div>
      <h3>${t.title}</h3>
      <p>${summary}</p>
      <span class="tag">${t.tag}</span>`;
    bindCardInteraction(item, trigger => openModal(t.tag, t.title, t.text, null, t.block, trigger));
    tlEl.appendChild(item);
  });
}

const bugsEl = document.getElementById('bugs-grid');
if (bugsEl) {
  bugs.forEach(b => {
    const card = document.createElement('div');
    card.className = 'bug-card focus-ring';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    const summary = b.text.length > 90 ? `${b.text.slice(0, 90)}…` : b.text;
    card.innerHTML = `
      <div class="bug-head"><span class="flag"></span><span>${b.tag}</span></div>
      <h3>${b.title}</h3>
      <p>${summary}</p>`;
    bindCardInteraction(card, trigger => openModal(b.tag, b.title, b.text, null, b.block, trigger));
    bugsEl.appendChild(card);
  });
}

// ---------- modal ----------
const overlay = document.getElementById('overlay');
const modalBody = document.getElementById('modal-body');
const modalTag = document.getElementById('modal-tag');
const modalClose = document.getElementById('modal-close');
let lastFocusedEl = null;

function openModal(tag, title, text, kv, block, triggerEl = null) {
  lastFocusedEl = triggerEl;
  modalTag.textContent = tag;

  const kvHtml = kv
    ? kv.map(([k, v]) => `<div class="kv"><b>${k}</b><span>${v}</span></div>`).join('')
    : '';
  const blockHtml = block
    ? `<div class="block"><span class="lab">detalhe técnico</span>${block}</div>`
    : '';

  modalBody.innerHTML = `<h3>${title}</h3><p>${text}</p>${kvHtml}${blockHtml}`;
  overlay.classList.add('open');
  modalClose?.focus();
}

function closeModal() {
  if (!overlay.classList.contains('open')) return;
  overlay.classList.remove('open');
  lastFocusedEl?.focus();
}

modalClose?.addEventListener('click', closeModal);
overlay?.addEventListener('click', e => {
  if (e.target === overlay) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ---------- painel de status ----------
const devMessages = [
  'Construindo interface...',
  'Configurando S21 Home Server...',
  'Testando serviços...',
  'Implementando automações...',
  'Monitorando servidor...',
  'Preparando novas funcionalidades...'
];

const devMessage = document.getElementById('dev-message');
if (devMessage) {
  let devMessageIndex = 0;
  setInterval(() => {
    devMessageIndex = (devMessageIndex + 1) % devMessages.length;
    devMessage.textContent = devMessages[devMessageIndex];
  }, 2500);
}

// ---------- navegação ativa ----------
const navButtons = document.querySelectorAll('.top-btn');
const navSections = ['inicio', 'arquitetura', 'monitor', 'roadmap']
  .map(id => document.getElementById(id))
  .filter(Boolean);

function updateActiveNav() {
  if (!navSections.length) return;
  let currentSection = navSections[0];

  for (const section of navSections) {
    if (section.getBoundingClientRect().top <= 180) {
      currentSection = section;
    }
  }

  navButtons.forEach(button => {
    button.classList.toggle('active', button.getAttribute('href') === `#${currentSection.id}`);
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });
updateActiveNav();

// ---------- chatbot (/api/chat) ----------
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const chatSubmit = document.getElementById('chat-submit');

function appendChatMessage(sender, text, type) {
  const msgEl = document.createElement('div');
  msgEl.className = `chat-msg ${type}`;

  const senderEl = document.createElement('span');
  senderEl.className = 'chat-sender mono';
  senderEl.textContent = sender;

  const textEl = document.createElement('span');
  textEl.className = 'chat-text';
  textEl.textContent = text;

  msgEl.appendChild(senderEl);
  msgEl.appendChild(textEl);
  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (chatForm && chatInput && chatMessages) {
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mensagem = chatInput.value.trim();
    if (!mensagem) return;

    appendChatMessage('você:', mensagem, 'user');
    chatInput.value = '';
    chatSubmit.disabled = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem })
      });

      const data = await res.json();

      if (!res.ok) {
        appendChatMessage('erro:', data.erro || 'Falha ao consultar a API.', 'bot');
      } else {
        const prefixo = data.assunto ? `s21-bot [${data.assunto}]:` : 's21-bot:';
        appendChatMessage(prefixo, data.resposta, 'bot');
      }
    } catch {
      appendChatMessage('erro:', 'Não foi possível conectar ao servidor.', 'bot');
    } finally {
      chatSubmit.disabled = false;
      chatInput.focus();
    }
  });
}

const CIRCUNFERENCIA = 2 * Math.PI * 52;

function atualizarGauge(id, percentual) {
  const el = document.getElementById(id);
  if (!el) return;

  const valor = Math.max(0, Math.min(100, Number(percentual) || 0));
  const arco = el.querySelector('.arco');
  const txt = el.querySelector('.g-txt strong');

  if (arco) arco.style.strokeDashoffset = CIRCUNFERENCIA * (1 - valor / 100);
  if (txt) txt.textContent = `${valor.toFixed(1)}%`;
}

function atualizarRelogioMonitor() {
  const agora = new Date();
  const horaEl = document.getElementById('mon-hora');
  const dataEl = document.getElementById('mon-data');
  if (horaEl) {
    horaEl.textContent = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  if (dataEl) {
    dataEl.textContent = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
}

async function atualizarMonitorS21() {
  const statusEl = document.getElementById('mon-status');
  const upEl = document.getElementById('mon-up');
  const srvEl = document.getElementById('mon-servicos');

  try {
    const res = await fetch('/api/status', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();

    if (statusEl) {
      statusEl.textContent = d.status || 'online';
      statusEl.className = 'mon-status on';
    }

    atualizarGauge('g-ram', d.ram);
    atualizarGauge('g-sto', d.storage);

    if (upEl) upEl.textContent = `Online há ${d.uptime}`;

    if (srvEl && d.services) {
      srvEl.innerHTML = Object.entries(d.services)
        .map(([nome, ativo]) => `
          <span class="srv-pill">
            <i class="srv-dot ${ativo ? 'on' : 'off'}"></i>${nome}
          </span>
        `)
        .join('');
    }
  } catch {
    if (statusEl) {
      statusEl.textContent = 'offline';
      statusEl.className = 'mon-status off';
    }
    if (upEl) upEl.textContent = 'Sem resposta de /api/status';
  }
}

atualizarRelogioMonitor();
setInterval(atualizarRelogioMonitor, 10000);

atualizarMonitorS21();
setInterval(atualizarMonitorS21, 30000);