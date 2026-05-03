var BACKEND_URL = localStorage.getItem('sb_backend_url') || 'https://smartbiz-api.fly.dev';

var BASE_AUTH = BACKEND_URL;
var BASE_API  = BACKEND_URL + '/api';

window.API = {
  negocios:    `${BASE_API}/negocios`,
  clientes:    `${BASE_API}/clientes`,
  produtos:    `${BASE_API}/produtos`,
  lancamentos: `${BASE_API}/lancamentos`,
  vendas:      `${BASE_API}/vendas`,
  nfe:         `${BASE_API}/nfe`,
  authGoogle:  `${BASE_AUTH}/oauth2/authorization/google`
};

window.getToken      = () => localStorage.getItem('sb_token')    || '';
window.getRole       = () => localStorage.getItem('sb_role')     || '';
window.getUserEmail  = () => localStorage.getItem('sb_email')    || '';

window.getBusinessId = () =>
  sessionStorage.getItem('sb_viewing_business') ||
  localStorage.getItem('sb_business_id')        || '';

window.getViewingBusinessNome = () =>
  sessionStorage.getItem('sb_viewing_business_nome') || '';

window.setViewingBusiness = (id, nome, emailVinculado) => {
  sessionStorage.setItem('sb_viewing_business',        id              || '');
  sessionStorage.setItem('sb_viewing_business_nome',   nome            || '');
  sessionStorage.setItem('sb_viewing_user_email',      emailVinculado  || '');
};

window.logout = () => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = 'login.html';
};

(function guardRoute() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  if (page === 'login.html' || page === 'login-success.html') return;

  const token = localStorage.getItem('sb_token');
  if (!token) { window.location.href = 'login.html'; return; }

  const role = localStorage.getItem('sb_role') || '';
  const adminPages = ['admin-dashboard.html', 'admin-cadastro.html'];

  if (adminPages.includes(page) && role === 'ADMIN') {
    sessionStorage.removeItem('sb_viewing_business');
    sessionStorage.removeItem('sb_viewing_business_nome');
    sessionStorage.removeItem('sb_viewing_user_email');
  }

  if (adminPages.includes(page) && role !== 'ADMIN') {
    window.location.href = 'index.html';
  }
})();

function _injectViewingUser(url) {
  if ((localStorage.getItem('sb_role') || '') !== 'ADMIN') return url;
  const page = window.location.pathname.split('/').pop() || '';
  if (page === 'admin-dashboard.html' || page === 'admin-cadastro.html') return url;
  const viewingEmail = sessionStorage.getItem('sb_viewing_user_email') || '';
  if (!viewingEmail || !url.includes('/api/') || url.includes('viewingUserId=')) return url;
  return url + (url.includes('?') ? '&' : '?') + 'viewingUserId=' + encodeURIComponent(viewingEmail);
}

async function api(url, opts = {}) {
  const token = localStorage.getItem('sb_token');
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  const res = await fetch(_injectViewingUser(url), { headers, ...opts });
  if (res.status === 401 && !window.location.pathname.includes('login.html')) {
    localStorage.removeItem('sb_token');
    window.location.href = 'login.html';
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
      { href: 'index.html',    icon: '📊', label: 'Dashboard' },
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

  const role  = localStorage.getItem('sb_role') || '';
  const email = localStorage.getItem('sb_email') || '';
  const nome  = window.getViewingBusinessNome();

  document.querySelectorAll('[data-admin-only]').forEach(el => {
    if (role !== 'ADMIN') el.style.display = 'none';
  });

  // Limpa o sidebar footer (apenas versão)
  const footer = document.querySelector('.sidebar-footer');
  if (footer) footer.innerHTML = `<p>SmartBiz v1.0 · Uniube 2026</p>`;

  // Topbar direita: email + role + botão Sair (substitui API Conectada + relógio)
  const topbarRight = document.querySelector('.topbar-right');
  if (topbarRight && email) {
    topbarRight.innerHTML = `
      ${ role === 'ADMIN' && nome ? `<a href="admin-dashboard.html" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text-dim);background:var(--surface2);border:1px solid var(--border);padding:4px 10px;border-radius:3px;letter-spacing:1px;text-decoration:none;white-space:nowrap;">← Todos os Negócios</a>` : '' }
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
        <span style="font-size:11px;color:var(--text-mid);font-family:'DM Mono',monospace;">${email}</span>
        <span class="badge ${role==='ADMIN'?'badge-green':'badge-blue'}" style="font-size:8px;">${role}</span>
      </div>
      <button onclick="logout()" style="background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.4);color:#ff6b6b;padding:6px 14px;border-radius:4px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;cursor:pointer;">⏻ SAIR</button>
    `;
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
