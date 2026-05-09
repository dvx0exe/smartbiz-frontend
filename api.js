// ── Tema salvo — aplica ANTES do render para evitar flash ────
(function(){
  if (localStorage.getItem('sb_theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

// ── Backend URL — sempre HTTPS, nunca lido de localStorage ──────────────────
// CORREÇÃO Mixed Content: a URL era salva como http:// em versões antigas do app.
// Agora é fixa no código; qualquer valor antigo em localStorage é removido.
localStorage.removeItem('sb_backend_url');          // limpa resíduo http:// antigo

var BACKEND_URL = 'https://smartbiz-api.fly.dev';  // HTTPS fixo — nunca HTTP
// ─────────────────────────────────────────────────────────────────────────────

var BASE_AUTH = BACKEND_URL;
var BASE_API  = BACKEND_URL + '/api';

window.API = {
  negocios:       `${BASE_API}/negocios`,
  clientes:       `${BASE_API}/clientes`,
  produtos:       `${BASE_API}/produtos`,
  lancamentos:    `${BASE_API}/lancamentos`,
  vendas:         `${BASE_API}/vendas`,
  nfe:            `${BASE_API}/nfe`,
  authGoogle:     `${BASE_AUTH}/oauth2/authorization/google`
};

/**
 * Decodifica o payload do JWT sem verificar a assinatura (verificação ocorre no backend).
 * Impede que editar o localStorage conceda acesso indevido, pois a role
 * sempre vem do token assinado pelo servidor.
 */
window._decodeJWT = function(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return {}; }
};

window.getToken        = () => localStorage.getItem('sb_token')        || '';
window.getRefreshToken = () => localStorage.getItem('sb_refresh_token') || '';

/** Todas as claims vêm do JWT assinado — nunca do localStorage. */
window._claims       = () => window._decodeJWT(localStorage.getItem('sb_token') || '');
window.getRole       = () => window._claims().role       || '';
window.getUserEmail  = () => window._claims().sub        || '';
window.isTrial       = () => window._claims().trial      === true;

window.getBusinessId = () =>
  sessionStorage.getItem('sb_viewing_business') ||
  window._claims().businessId                   || '';

window.getViewingBusinessNome = () =>
  sessionStorage.getItem('sb_viewing_business_nome') || '';

window.setViewingBusiness = (id, nome, emailVinculado) => {
  sessionStorage.setItem('sb_viewing_business',        id              || '');
  sessionStorage.setItem('sb_viewing_business_nome',   nome            || '');
  sessionStorage.setItem('sb_viewing_user_email',      emailVinculado  || '');
};

window.logout = () => {
  localStorage.removeItem('sb_token');
  localStorage.removeItem('sb_refresh_token');  // limpa refresh token também
  localStorage.removeItem('sb_trial_setup_done');
  sessionStorage.clear();
  window.location.href = 'login.html';
};

// ─── JWT Refresh ─────────────────────────────────────────────────────────────

/**
 * Retorna quantos segundos faltam para o access token expirar.
 * Retorna 0 se o token for inválido ou já tiver expirado.
 */
window._secondsUntilExpiry = function(token) {
  try {
    const exp = window._decodeJWT(token).exp;
    if (!exp) return 0;
    return exp - Math.floor(Date.now() / 1000);
  } catch { return 0; }
};

/**
 * Tenta renovar o access token usando o refresh token armazenado em
 * localStorage('sb_refresh_token').
 *
 * Retorna true se conseguiu renovar (novos tokens já salvos).
 * Retorna false se o refresh token não existir ou também expirou —
 * nesse caso limpa o storage mas NÃO redireciona (quem decide é quem chamou).
 *
 * NOTA BACKEND: o CustomOAuth2SuccessHandler também precisa incluir
 * o refreshToken na URL de redirect, para que o login-success.html
 * salve localStorage('sb_refresh_token'). Exemplo de redirect:
 *   /login-success.html?token=XXX&refreshToken=YYY
 */
async function _tryRefresh() {
  const refreshToken = localStorage.getItem('sb_refresh_token');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!res.ok) {
      // Refresh inválido/expirado — limpa tudo
      localStorage.removeItem('sb_token');
      localStorage.removeItem('sb_refresh_token');
      return false;
    }

    const data = await res.json();
    localStorage.setItem('sb_token',         data.token);
    localStorage.setItem('sb_refresh_token', data.refreshToken); // rotação: sempre salva o novo
    return true;

  } catch {
    // Falha de rede — não limpa tokens (pode ser offline temporário)
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

(function guardRoute() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  if (page === 'login.html' || page === 'login-success.html') return;

  const token = localStorage.getItem('sb_token');
  if (!token) { window.location.href = 'login.html'; return; }

  const role = window.getRole();
  const adminPages = ['admin-dashboard.html', 'admin-cadastro.html'];

  if (adminPages.includes(page) && role === 'ADMIN') {
    sessionStorage.removeItem('sb_viewing_business');
    sessionStorage.removeItem('sb_viewing_business_nome');
    sessionStorage.removeItem('sb_viewing_user_email');
  }

  if (adminPages.includes(page) && role !== 'ADMIN') {
    window.location.href = 'cadastro.html';
  }
})();

function _injectViewingUser(url) {
  if (window.getRole() !== 'ADMIN') return url;
  const page = window.location.pathname.split('/').pop() || '';
  if (page === 'admin-dashboard.html' || page === 'admin-cadastro.html') return url;
  const viewingEmail = sessionStorage.getItem('sb_viewing_user_email') || '';
  if (!viewingEmail || !url.includes('/api/') || url.includes('viewingUserId=')) return url;
  return url + (url.includes('?') ? '&' : '?') + 'viewingUserId=' + encodeURIComponent(viewingEmail);
}

async function api(url, opts = {}) {
  let token = localStorage.getItem('sb_token');

  // ── Refresh proativo ──────────────────────────────────────────────────────
  // Se o access token expirar em menos de 5 minutos, renova silenciosamente
  // ANTES de fazer a chamada. O usuário nunca percebe.
  if (token && window._secondsUntilExpiry(token) < 300) {
    await _tryRefresh();
    token = localStorage.getItem('sb_token');
  }

  const buildHeaders = (tk) => ({
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(tk ? { 'Authorization': `Bearer ${tk}` } : {})
  });

  let res = await fetch(_injectViewingUser(url), { headers: buildHeaders(token), ...opts });

  // ── Retry após 401 ────────────────────────────────────────────────────────
  // 401 inesperado (token revogado no servidor, deploy, etc.):
  // tenta o refresh uma vez antes de redirecionar para login.
  if (res.status === 401 && !window.location.pathname.includes('login.html')) {
    const refreshed = await _tryRefresh();
    if (refreshed) {
      token = localStorage.getItem('sb_token');
      res   = await fetch(_injectViewingUser(url), { headers: buildHeaders(token), ...opts });
    }
    // Ainda 401 após tentativa de refresh → sessão morta, força login
    if (res.status === 401) {
      localStorage.removeItem('sb_token');
      localStorage.removeItem('sb_refresh_token');
      window.location.href = 'login.html';
      return;
    }
  }

  // 402 = trial expirado — redireciona para página de upgrade
  if (res.status === 402) {
    const page = window.location.pathname.split('/').pop();
    if (page !== 'trial-expirado.html') {
      window.location.href = 'trial-expirado.html';
    }
    return;
  }

  if (!res.ok) throw new Error(await res.text().catch(() => 'Erro desconhecido'));
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : res.text();
}

window.get   = url         => api(url);
window.post  = (url, body) => api(url, { method:'POST',   body: JSON.stringify(body) });
window.put   = (url, body) => api(url, { method:'PUT',    body: JSON.stringify(body) });
window.patch = (url, body) => api(url, { method:'PATCH',  body: body ? JSON.stringify(body) : null });
window.del   = url         => api(url, { method:'DELETE' });

document.addEventListener('DOMContentLoaded', () => {
  /* ═══════════════════════════════════════════════════════
     MOBILE NAV — injeta hamburger, overlay e bottom-nav
     em todas as páginas automaticamente
  ═══════════════════════════════════════════════════════ */
  const sidebar = document.querySelector('.sidebar');
  const topbar  = document.querySelector('.topbar');
  const topbarTitle = document.querySelector('.topbar-title');

  if (sidebar && topbar) {
    // 1. Overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sb-overlay';
    sidebar.after(overlay);

    // 2. Hamburger no topo esquerdo
    const hamburger = document.createElement('button');
    hamburger.className = 'btn-hamburger';
    hamburger.setAttribute('aria-label', 'Abrir menu');
    hamburger.innerHTML = '<svg width="18" height="14" viewBox="0 0 18 14" fill="none"><rect width="18" height="2" rx="1" fill="currentColor"/><rect y="6" width="18" height="2" rx="1" fill="currentColor"/><rect y="12" width="18" height="2" rx="1" fill="currentColor"/></svg>';
    if (topbarTitle) {
      topbar.insertBefore(hamburger, topbarTitle);
    } else {
      topbar.prepend(hamburger);
    }

    // 3. Bottom nav
    const curPage = window.location.pathname.split('/').pop() || 'index.html';
    const navItems = [
      { href: 'cadastro.html', icon: '📊', label: 'Dashboard' },
      { href: 'pdv.html',      icon: '🛒', label: 'PDV'       },
      { href: 'estoque.html',  icon: '📦', label: 'Estoque'   },
      { href: 'caixa.html',    icon: '💰', label: 'Caixa'     },
      { id: 'btn-bnav-menu',   icon: '☰',  label: 'Menu'      },
    ];

    const bottomNav = document.createElement('nav');
    bottomNav.className = 'bottom-nav';
    bottomNav.innerHTML = navItems.map(item => {
      if (item.id) {
        return `<button class="bottom-nav-item" id="${item.id}"><span class="bottom-nav-icon">${item.icon}</span>${item.label}</button>`;
      }
      const active = curPage === item.href ? ' active' : '';
      return `<a href="${item.href}" class="bottom-nav-item${active}"><span class="bottom-nav-icon">${item.icon}</span>${item.label}</a>`;
    }).join('');
    document.body.appendChild(bottomNav);

    // 4. Lógica de toggle
    const openSidebar  = () => { sidebar.classList.add('open');  overlay.classList.add('open');  };
    const closeSidebar = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); };

    hamburger.addEventListener('click', openSidebar);
    overlay.addEventListener('click', closeSidebar);

    // Fechar ao clicar num link do sidebar no mobile
    sidebar.querySelectorAll('.nav-item').forEach(a => {
      a.addEventListener('click', () => { if (window.innerWidth <= 900) closeSidebar(); });
    });

    const btnMenu = document.getElementById('btn-bnav-menu');
    if (btnMenu) btnMenu.addEventListener('click', openSidebar);
  }

  const role  = window.getRole();
  const email = window.getUserEmail();
  const nome  = window.getViewingBusinessNome();

  document.querySelectorAll('[data-admin-only]').forEach(el => {
    if (role !== 'ADMIN') el.style.display = 'none';
  });

  // Limpa o sidebar footer (apenas versão)
  const footer = document.querySelector('.sidebar-footer');
  if (footer) footer.innerHTML = `<p>SmartBiz v1.0</p>`;

  // ── USER MENU DROPDOWN ────────────────────────────────────────
  const topbarRight = document.querySelector('.topbar-right');
  if (topbarRight && email) {
    const initials = email.split('@')[0].slice(0,2).toUpperCase();
    const isDark   = localStorage.getItem('sb_theme') === 'dark';

    const adminLink = (role === 'ADMIN' && nome)
      ? `<div class="sb-dd-item" onclick="location.href='admin-dashboard.html'">
           <span class="sb-dd-item-icon">🏢</span>Todos os Negócios
         </div><div class="sb-dd-sep"></div>`
      : '';

    const menuHtml = `
      <div class="sb-user-pill" id="sb-user-pill">
        <div class="sb-user-avatar">${initials}</div>
        <div class="sb-user-info">
          <span class="sb-user-email">${email}</span>
          <span class="sb-user-role">${role}</span>
        </div>
        <span class="sb-chevron">▾</span>

        <div class="sb-dropdown" id="sb-dropdown">
          <div class="sb-dd-header">
            <div class="sb-dd-email">${email}</div>
            <span class="badge ${role==='ADMIN'?'badge-green':'badge-blue'}" style="font-size:8px;">${role}</span>
          </div>

          <div class="sb-dd-sep"></div>

          <div class="sb-dd-item" id="sb-theme-item">
            <span class="sb-dd-item-icon">🌙</span>
            Tema escuro
            <div class="sb-theme-toggle">
              <div class="sb-toggle-track ${isDark?'on':''}" id="sb-toggle">
                <div class="sb-toggle-thumb"></div>
              </div>
            </div>
          </div>

          <div class="sb-dd-sep"></div>

          ${adminLink}

          <div class="sb-dd-item danger" onclick="logout()">
            <span class="sb-dd-item-icon">⏻</span>
            Sair da conta
          </div>
        </div>
      </div>
    `;

    // Insere antes de qualquer conteúdo existente
    topbarRight.insertAdjacentHTML('afterbegin', menuHtml);

    const pill     = document.getElementById('sb-user-pill');
    const dropdown = document.getElementById('sb-dropdown');
    const toggle   = document.getElementById('sb-toggle');

    // Abrir / fechar dropdown
    pill.addEventListener('click', e => {
      const open = dropdown.classList.toggle('open');
      pill.classList.toggle('open', open);
      e.stopPropagation();
    });
    document.addEventListener('click', () => {
      dropdown.classList.remove('open');
      pill.classList.remove('open');
    });
    dropdown.addEventListener('click', e => e.stopPropagation());

    // Toggle de tema
    toggle.addEventListener('click', e => {
      e.stopPropagation();
      const nowDark = !toggle.classList.contains('on');
      toggle.classList.toggle('on', nowDark);
      if (nowDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('sb_theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('sb_theme', 'light');
      }
    });
  }
});

window.toast = function(msg, type='') {
  const t = document.createElement('div');
  t.className = `toast show ${type==='err'?'error':''}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
};

window.spin = function(btn, label) {
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${label}`;
  return () => { btn.disabled=false; btn.innerHTML=orig; };
};

window.brl = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);
window.dt = iso => { if (!iso) return '—'; return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); };
window.dtd = iso => { if (!iso) return '—'; return new Date(iso).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}); };

window.badgeStatus = function(status) {
  const map = {
    'CONCLUIDA':['badge-green','Concluída'],'CANCELADA':['badge-red','Cancelada'],
    'PENDENTE':['badge-yellow','Pendente'],'EMITIDA':['badge-green','Emitida'],
    'CANCELADO':['badge-red','Cancelada'],'NF-e':['badge-blue','NF-e'],
    'NFS-e':['badge-blue','NFS-e'],'VIP':['badge-green','VIP'],
    'Regular':['badge-gray','Regular'],'Inativo':['badge-red','Inativo'],
    'ATIVO':['badge-green','Ativo'],'INATIVO':['badge-gray','Inativo'],
  };
  const [cls, label] = map[status] || ['badge-gray', status||'—'];
  return `<span class="badge ${cls}">${label}</span>`;
};

window.maskCpf = function(input) {
  if(!input) return;
  input.addEventListener('input',function(){
    let v=this.value.replace(/\D/g,'').slice(0,11);
    if(v.length>9) v=v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/,'$1.$2.$3-$4');
    else if(v.length>6) v=v.replace(/(\d{3})(\d{3})(\d{1,3})/,'$1.$2.$3');
    else if(v.length>3) v=v.replace(/(\d{3})(\d{1,3})/,'$1.$2');
    this.value=v;
  });
};

window.maskCnpj = function(input) {
  if(!input) return;
  input.addEventListener('input',function(){
    let v=this.value.replace(/\D/g,'').slice(0,14);
    if(v.length>12) v=v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/,'$1.$2.$3/$4-$5');
    else if(v.length>8) v=v.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/,'$1.$2.$3/$4');
    else if(v.length>5) v=v.replace(/(\d{2})(\d{3})(\d{1,3})/,'$1.$2.$3');
    else if(v.length>2) v=v.replace(/(\d{2})(\d{1,3})/,'$1.$2');
    this.value=v;
  });
};
