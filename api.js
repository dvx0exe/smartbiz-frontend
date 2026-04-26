/* ── SmartBiz · API + Auth v2 ── */

/* ═══════════════════════════════════════════════════════════════════════════
 * CONFIGURAÇÃO DO BACKEND
 *
 * LOCAL (Live Server):  'http://localhost:8080'
 * NGROK (GitHub Pages): 'https://XXXX-XX-XX-XX.ngrok-free.app'
 *
 *   ➜ Toda vez que reiniciar o ngrok, atualize a URL abaixo e dê git push.
 * ═══════════════════════════════════════════════════════════════════════════ */
var BACKEND_URL = 'https://COLE-SUA-URL-NGROK-AQUI.ngrok-free.app';

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

/* ── Auth Helpers ── */
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

/* ── Proteção de Rota ── */
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

/* ── HTTP helper com JWT ── */
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

/* ── Enriquecer sidebar/topbar após DOM carregar ── */
document.addEventListener('DOMContentLoaded', () => {
  const role  = localStorage.getItem('sb_role') || '';
  const email = localStorage.getItem('sb_email') || '';
  const nome  = window.getViewingBusinessNome();

  document.querySelectorAll('[data-admin-only]').forEach(el => {
    if (role !== 'ADMIN') el.style.display = 'none';
  });

  const footer = document.querySelector('.sidebar-footer');
  if (footer && email) {
    footer.innerHTML = `
      <div style="margin-bottom:10px;">
        <div style="font-size:11px;color:var(--text-mid);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${email}</div>
        <span class="badge ${role==='ADMIN'?'badge-green':'badge-blue'}" style="margin-top:4px;font-size:8px;">${role}</span>
      </div>
      ${nome ? `<div style="font-size:10px;color:var(--emerald);margin-bottom:8px;font-family:'DM Mono',monospace;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🏪 ${nome}</div>` : ''}
      <button onclick="logout()" class="btn btn-ghost btn-full btn-sm">Sair</button>
    `;
  }

  const topbarRight = document.querySelector('.topbar-right');
  if (topbarRight && role === 'ADMIN' && nome) {
    const chip = document.createElement('a');
    chip.href = 'admin-dashboard.html';
    chip.style.cssText = 'font-family:"DM Mono",monospace;font-size:10px;color:var(--text-dim);background:var(--surface2);border:1px solid var(--border);padding:4px 10px;border-radius:3px;letter-spacing:1px;text-decoration:none;white-space:nowrap;';
    chip.innerHTML = `← Todos os Negócios`;
    topbarRight.prepend(chip);
  }
});

/* ── UI Helpers ── */
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

/* ── Formatadores ── */
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
