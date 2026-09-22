// ---------- data ----------
const nodes = [
  {icon:'👤', label:'Visitante', tag:'ponto 1',
   title:'Visitante digita o endereço',
   text:'Alguém acessa homelabs21.duckdns.org no navegador. Nesse momento, nenhuma conexão foi feita ainda — o navegador só sabe o nome do domínio.',
   kv:[['protocolo','HTTPS'],['porta esperada','443']]},
  {icon:'🌐', label:'DNS / DDNS', tag:'ponto 2',
   title:'O nome vira um endereço IP',
   text:'O DuckDNS resolve o domínio para o IP público atual da casa. Como esse IP muda com o tempo, um script próprio (update-duckdns.sh) roda a cada 5 minutos via cron e mantém o registro atualizado — foi criado depois de um incidente real de mudança de IP que derrubou o domínio antigo.',
   kv:[['domínio atual','homelabs21.duckdns.org'],['atualização','a cada 5 min via cron']],
   block:'lab/scripts/update-duckdns.sh\n → lê domínio e token (~/.duckdns-token, permissão 600)\n → contata DuckDNS via HTTPS\n → registra resultado em lab/logs/duckdns.log'},
  {icon:'📡', label:'Roteador', tag:'ponto 3',
   title:'NAT: da porta pública para a privada',
   text:'O roteador Huawei recebe a conexão HTTPS na porta pública 443 e a encaminha para a porta 8443 do S21+ dentro da rede local. Isso existe porque o Termux, sem root, não consegue abrir portas privilegiadas como 443 diretamente.',
   kv:[['porta pública','443'],['porta privada','8443'],['ip do S21+','192.168.100.4 (reserva DHCP)']]},
  {icon:'📱', label:'S21+', tag:'ponto 4',
   title:'O servidor recebe a conexão',
   text:'Dentro do Termux, o runit supervisiona todos os serviços (sshd, nginx, crond, s21monitor). Se algum processo cai, o runit percebe e reinicia automaticamente.',
   kv:[['supervisor','runit'],['administração','SSH :8022 por chave Ed25519']]},
  {icon:'🔒', label:'NGINX', tag:'ponto 5',
   title:'HTTPS válido e o site estático',
   text:'O NGINX termina o TLS (certificado real emitido via acme.sh + Let\'s Encrypt, usando o desafio DNS-01 pela DuckDNS) e serve os arquivos do site. Rotas como /api/status são encaminhadas internamente para a API Python.',
   kv:[['tls','1.2 / 1.3 apenas'],['certificado','Let\'s Encrypt ECC']]},
  {icon:'🐍', label:'API Python', tag:'ponto 6',
   title:'O painel de status, isolado',
   text:'A API de monitoramento escuta só em 127.0.0.1:8090 — nunca fica exposta diretamente à internet. O navegador só enxerga /api/status através do NGINX, nunca a porta 8090 em si.',
   kv:[['escuta em','127.0.0.1:8090 (local apenas)'],['exposta via','reverse proxy /api/status']]},
];

const timeline = [
  {n:1, title:'Primeiro servidor em Python', tag:'servidor',
   text:'O marco inicial: um servidor HTTP simples em Python rodando na porta 8080, provando que o telefone conseguia responder a outros dispositivos da rede local.',
   block:'~/lab/python/server.py → porta 8080\n192.168.100.4:8080 acessível pela LAN'},
  {n:2, title:'IP fixo dentro da rede', tag:'rede',
   text:'Em vez de configurar um IP estático manualmente no Android, foi feita uma reserva DHCP no roteador. O roteador continua no comando, mas sempre entrega o mesmo endereço ao S21+.',
   block:'reserva DHCP → 192.168.100.4 (sempre o mesmo IP)'},
  {n:3, title:'SSH com autenticação por chave', tag:'acesso',
   text:'OpenSSH instalado no Termux, na porta 8022 (não privilegiada, já que não há root). A autenticação por senha foi desativada em favor de uma chave Ed25519 gerada no Fedora.',
   block:'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPubkeyAuthentication yes\n\nalias no Fedora: ssh s21'},
  {n:4, title:'runit e serviços supervisionados', tag:'confiabilidade',
   text:'Com termux-services, os processos deixaram de ser iniciados manualmente. O runit passou a vigiar sshd, o servidor do laboratório, o monitor, o NGINX e o crond — reiniciando qualquer um que caísse.',
   block:'processo cai → runit percebe → processo é reiniciado'},
  {n:5, title:'NGINX como servidor web de verdade', tag:'infraestrutura',
   text:'O site deixou de depender diretamente do servidor Python. O NGINX passou a servir os arquivos estáticos, escutando em 8081 (HTTP) e 8443 (HTTPS) — sem precisar das portas privilegiadas 80/443.',
   block:'NGINX 1.31.5 → ~/lab/web/site/'},
  {n:6, title:'NAT e a primeira exposição pública', tag:'rede',
   text:'O roteador passou a encaminhar a porta pública 443 para a porta 8443 do S21+, permitindo o primeiro acesso externo real ao servidor.',
   block:'Internet :443 → NAT → 192.168.100.4:8443'},
  {n:7, title:'DuckDNS e um domínio que quebrou', tag:'incidente',
   text:'O domínio inicial (egamsolucoes.duckdns.org) parou de funcionar quando o IP público da casa mudou e o registro não foi atualizado. A solução foi migrar para um novo domínio, homelabs21.duckdns.org, e nunca mais depender de atualização manual.',
   block:'IP antigo:  200.103.2.224\nIP novo:    200.140.9.172\n→ domínio antigo ficou apontando para o IP errado'},
  {n:8, title:'DDNS automático via cron', tag:'automação',
   text:'Um script próprio passou a atualizar o DuckDNS a cada 5 minutos, guardando o token de acesso fora do código-fonte — uma decisão que já nasceu pensando no futuro versionamento com Git.',
   block:'*/5 * * * * update-duckdns.sh\ntoken em ~/.duckdns-token (permissão 600)'},
  {n:9, title:'HTTPS real com Let\'s Encrypt', tag:'segurança',
   text:'Certificado emitido via acme.sh usando o desafio DNS-01 pela DuckDNS. TLS restrito às versões 1.2 e 1.3, com cabeçalhos de segurança adicionados e informações do servidor ocultadas.',
   block:'ssl_protocols TLSv1.2 TLSv1.3;\nserver_tokens off;\n+ X-Frame-Options, CSP, Referrer-Policy'},
  {n:10, title:'Fedora vira o ambiente de desenvolvimento', tag:'decisão',
   text:'A decisão mais recente: separar onde se programa de onde se serve. O Fedora ganhou VS Code, Git e Node.js para ser a oficina; o S21+ ficou dedicado a produção.',
   block:'escrever → testar → git commit → deploy → S21+'},
];

const bugs = [
  {tag:'runit', title:'O arquivo "down" escondido', 
   text:'Depois de um desligamento, o NGINX estava cadastrado no runit mas não iniciava. A causa era um arquivo down dentro do diretório do serviço — no runit, isso significa "supervisione, mas mantenha desligado". Bastou removê-lo e rodar sv up nginx.',
   block:'$PREFIX/var/service/nginx/down\n→ removido\n→ sv up nginx\n→ status: run'},
  {tag:'DuckDNS', title:'O domínio que sumiu com o IP',
   text:'O IP público da casa mudou e o domínio antigo (egamsolucoes.duckdns.org) continuou apontando para o endereço anterior — e nem aparecia mais na conta usada. A solução foi criar um novo domínio e nunca mais depender de atualização manual.',
   block:'antes: egamsolucoes.duckdns.org (parado)\ndepois: homelabs21.duckdns.org (com DDNS automático)'},
  {tag:'monitor', title:'"nginx: true" mesmo desligado',
   text:'A checagem do NGINX usava pgrep -f nginx. Só que processos internos do runit (runsv, svlogd) também contêm a palavra "nginx" no nome, então a API dizia que o serviço estava no ar mesmo quando não estava — a diferença entre "existe um processo com esse nome" e "o serviço responde de verdade".',
   block:'pgrep -f nginx → falso positivo\nsolução planejada: checar 127.0.0.1:8443 de verdade'},
];

// ---------- render ----------
const pathEl = document.getElementById('path');
nodes.forEach((n, i) => {
  const btn = document.createElement('button');
  btn.className = 'node focus-ring';
  btn.innerHTML = `<span class="box">${n.icon}</span><span class="label">${n.label}</span>`;
  btn.addEventListener('click', () => openModal(n.tag, n.title, n.text, n.kv, n.block));
  pathEl.appendChild(btn);
  if (i < nodes.length - 1) {
    const link = document.createElement('div');
    link.className = 'link';
    pathEl.appendChild(link);
  }
});

const tlEl = document.getElementById('timeline');
timeline.forEach(t => {
  const item = document.createElement('div');
  item.className = 'tl-item focus-ring';
  item.tabIndex = 0;
  item.innerHTML = `<div class="tl-num">${String(t.n).padStart(2,'0')}</div>
    <h3>${t.title}</h3>
    <p>${t.text.slice(0, 100)}${t.text.length > 100 ? '…' : ''}</p>
    <span class="tag"></span>`;
  item.addEventListener('click', () => openModal(t.tag, t.title, t.text, null, t.block));
  item.addEventListener('keypress', e => { if (e.key === 'Enter') item.click(); });
  tlEl.appendChild(item);
});

const bugsEl = document.getElementById('bugs-grid');
bugs.forEach(b => {
  const card = document.createElement('div');
  card.className = 'bug-card focus-ring';
  card.tabIndex = 0;
  card.innerHTML = `<div class="bug-head"><span class="flag"></span><span>${b.tag}</span></div>
    <h3>${b.title}</h3>
    <p>${b.text.slice(0, 90)}…</p>`;
  card.addEventListener('click', () => openModal(b.tag, b.title, b.text, null, b.block));
  card.addEventListener('keypress', e => { if (e.key === 'Enter') card.click(); });
  bugsEl.appendChild(card);
});

// ---------- modal ----------
const overlay = document.getElementById('overlay');
const modalBody = document.getElementById('modal-body');
const modalTag = document.getElementById('modal-tag');

function openModal(tag, title, text, kv, block) {
  modalTag.textContent = tag;
  let kvHtml = '';
  if (kv) {
    kvHtml = kv.map(pair => `<div class="kv"><b>${pair[0]}</b><span>${pair[1]}</span></div>`).join('');
  }
  let blockHtml = '';
  if (block) {
    blockHtml = `<div class="block"><span class="lab">detalhe técnico</span>${block}</div>`;
  }
  modalBody.innerHTML = `<h3>${title}</h3><p>${text}</p>${kvHtml}${blockHtml}`;
  overlay.classList.add('open');
  document.getElementById('modal-close').focus();
}
function closeModal() { overlay.classList.remove('open'); }
document.getElementById('modal-close').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ========================================
// PAINEL — SITE EM DESENVOLVIMENTO
// ========================================

const devMessages = [
    "Construindo interface...",
    "Configurando S21 Home Server...",
    "Testando serviços...",
    "Implementando automações...",
    "Monitorando servidor...",
    "Preparando novas funcionalidades..."
];

const devMessage = document.getElementById("dev-message");

let devMessageIndex = 0;

if (devMessage) {
    setInterval(() => {
        devMessageIndex++;

        if (devMessageIndex >= devMessages.length) {
            devMessageIndex = 0;
        }

        devMessage.textContent = devMessages[devMessageIndex];
    }, 2500);
}

// ========================================
// NAVEGAÇÃO — DESTACA A SEÇÃO ATUAL
// ========================================

const navButtons = document.querySelectorAll(".top-btn");

const navSections = [
    document.getElementById("inicio"),
    document.getElementById("arquitetura"),
    document.getElementById("monitor"),
    document.getElementById("roadmap")
].filter(Boolean);

function updateActiveNav() {
    let currentSection = navSections[0];

    navSections.forEach((section) => {
        const sectionTop = section.getBoundingClientRect().top;

        if (sectionTop <= 180) {
            currentSection = section;
        }
    });

    navButtons.forEach((button) => {
        button.classList.remove("active");

        if (button.getAttribute("href") === `#${currentSection.id}`) {
            button.classList.add("active");
        }
    });
}

window.addEventListener("scroll", updateActiveNav);

updateActiveNav();