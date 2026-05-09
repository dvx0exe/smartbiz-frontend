/**
 * SmartBiz · Onboarding Tutorial
 * Inclua este arquivo em qualquer página que deve exibir o tutorial.
 * O tutorial aparece apenas na primeira visita (controlado por localStorage).
 *
 * USO:
 *   <script src="onboarding.js"></script>                  ← todas as páginas (mostra tudo)
 *   <script>SmartBizOnboarding.start({ steps: ['pdv'] });</script>  ← página específica
 *
 * Para resetar (testar): localStorage.removeItem('smartbiz_onboarding_v1')
 */

(function () {
  "use strict";

  /* ── Configuração dos steps ──────────────────────────────── */
  const ALL_STEPS = [
    {
      id: "pdv",
      pages: ["pdv.html"],
      icon: "🛒",
      label: "Operacional",
      title: "PDV — Frente de Caixa",
      desc: "O PDV é o coração das suas vendas. Registre cada venda em tempo real, identifique clientes pelo CPF e aplique descontos automaticamente.",
      tips: [
        "Clique em um produto para adicioná-lo ao carrinho. Use a busca para achar pelo nome ou código de barras.",
        "Informe o CPF do cliente para vincular a venda ao histórico dele e acumular visitas.",
        "Após finalizar, o estoque é descontado automaticamente e um comprovante é gerado.",
      ],
    },
    {
      id: "pagamentos",
      pages: ["pagamentos.html"],
      icon: "💳",
      label: "Financeiro",
      title: "Fluxo de Pagamentos",
      desc: "Gerencie cobranças únicas ou recorrentes, acompanhe o status de cada transação e envie links de pagamento diretamente para seus clientes.",
      tips: [
        "Crie um pagamento em "Novo Pagamento" — escolha se é avulso, recorrente ou assinatura.",
        "O cliente recebe um link por email ou WhatsApp para pagar com Pix, cartão ou boleto.",
        "O status atualiza automaticamente para Pago assim que o pagamento é confirmado.",
      ],
    },
    {
      id: "portal",
      pages: ["portal-pagamento.html"],
      icon: "🌐",
      label: "Self-service",
      title: "Portal do Cliente",
      desc: "Seu cliente acessa o portal para visualizar faturas, baixar comprovantes e atualizar dados de pagamento — sem precisar te contatar.",
      tips: [
        "Envie o link do portal pelo botão "Compartilhar" na tela de pagamentos.",
        "O cliente faz login com CPF ou email — sem necessidade de criar senha.",
        "Faturas pagas, pendentes e vencidas ficam listadas em ordem cronológica.",
      ],
    },
    {
      id: "assinaturas",
      pages: ["pagamentos.html"],
      icon: "🔄",
      label: "Recorrência",
      title: "Assinaturas",
      desc: "Crie planos mensais ou anuais para seus serviços. O SmartBiz cobra automaticamente no vencimento e te notifica caso um pagamento falhe.",
      tips: [
        "Acesse Pagamentos → Assinaturas → Nova Assinatura para configurar plano e valor.",
        "Você pode pausar ou cancelar uma assinatura sem perder o histórico de cobranças.",
        "O cliente recebe um email de lembrete 3 dias antes do vencimento.",
      ],
    },
    {
      id: "cobranca",
      pages: ["pagamentos.html"],
      icon: "📬",
      label: "Cobrança",
      title: "Régua de Cobrança",
      desc: "Automatize o contato com clientes inadimplentes. Configure os intervalos de envio e o SmartBiz faz o resto — sem trabalho manual.",
      tips: [
        "Em Pagamentos → Régua de Cobrança, defina os intervalos: D+1, D+5, D+10, etc.",
        "As mensagens são enviadas por email e incluem um link direto de pagamento.",
        "Veja o histórico completo de tentativas de contato para cada fatura em atraso.",
      ],
    },
  ];

  /* ── Controle de estado ──────────────────────────────────── */
  const STORAGE_KEY = "smartbiz_onboarding_v1";

  function isDone(stepId) {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return !!data[stepId];
    } catch {
      return false;
    }
  }

  function markDone(stepId) {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      data[stepId] = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }

  function markAllDone(steps) {
    steps.forEach((s) => markDone(s.id));
  }

  /* ── Estilos injetados ───────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById("sb-onboarding-styles")) return;
    const css = `
      #sb-onboarding-overlay {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(5, 10, 7, 0.82);
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(3px);
        animation: sb-fadein .25s ease;
      }
      @keyframes sb-fadein { from { opacity:0 } to { opacity:1 } }
      @keyframes sb-slideup { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }

      #sb-onboarding-card {
        width: 480px; max-width: calc(100vw - 32px);
        background: #0f1a12;
        border: 1px solid rgba(0,200,150,.22);
        border-radius: 6px;
        overflow: hidden;
        box-shadow: 0 0 80px rgba(0,200,150,.07);
        animation: sb-slideup .3s cubic-bezier(.2,.8,.4,1);
      }

      .sb-ob-header {
        background: #131e16;
        padding: 18px 24px 14px;
        border-bottom: 1px solid rgba(0,200,150,.1);
      }
      .sb-ob-title-row {
        display: flex; align-items: center;
        justify-content: space-between; margin-bottom: 14px;
      }
      .sb-ob-logo {
        font-family: 'Syne', sans-serif;
        font-weight: 800; font-size: 17px; color: #fff; letter-spacing: -.3px;
      }
      .sb-ob-logo span { color: #00c896; }
      .sb-ob-badge {
        font-family: 'DM Mono', monospace;
        font-size: 9px; color: #00c896; letter-spacing: 2px;
        text-transform: uppercase;
        border: 1px solid rgba(0,200,150,.3);
        padding: 3px 8px; border-radius: 2px;
      }
      .sb-ob-progress { display: flex; gap: 5px; align-items: center; }
      .sb-ob-dot {
        height: 3px; border-radius: 2px;
        background: rgba(0,200,150,.13);
        transition: background .3s, flex .3s;
        flex: 1;
      }
      .sb-ob-dot.active { background: #00c896; }
      .sb-ob-dot.done  { background: rgba(0,200,150,.35); }

      .sb-ob-body { padding: 24px; }
      .sb-ob-icon { font-size: 30px; display: block; margin-bottom: 10px; }
      .sb-ob-step-label {
        font-family: 'DM Mono', monospace;
        font-size: 9px; color: #00c896; letter-spacing: 2px;
        text-transform: uppercase; margin-bottom: 5px;
      }
      .sb-ob-step-title {
        font-family: 'Syne', sans-serif;
        font-size: 20px; font-weight: 800;
        color: #e2ede6; margin-bottom: 10px; line-height: 1.2;
      }
      .sb-ob-step-desc {
        font-size: 13px; color: rgba(226,237,230,.68); line-height: 1.7; margin-bottom: 16px;
      }
      .sb-ob-tips {
        background: #192419;
        border: 1px solid rgba(0,200,150,.1);
        border-radius: 4px; padding: 14px;
        display: flex; flex-direction: column; gap: 9px;
      }
      .sb-ob-tip {
        display: flex; align-items: flex-start; gap: 10px;
        font-size: 12px; color: rgba(226,237,230,.62); line-height: 1.55;
      }
      .sb-ob-tip-num {
        width: 20px; height: 20px; border-radius: 50%;
        background: rgba(0,200,150,.14);
        font-family: 'DM Mono', monospace; font-size: 10px;
        color: #00c896; display: flex; align-items: center;
        justify-content: center; flex-shrink: 0; margin-top: 1px;
      }

      .sb-ob-footer {
        padding: 14px 24px;
        border-top: 1px solid rgba(0,200,150,.08);
        display: flex; align-items: center; justify-content: space-between;
      }
      .sb-ob-skip {
        font-size: 12px; color: rgba(226,237,230,.28); cursor: pointer;
        background: none; border: none;
        font-family: 'DM Sans', sans-serif; transition: color .15s;
      }
      .sb-ob-skip:hover { color: rgba(226,237,230,.5); }
      .sb-ob-btns { display: flex; gap: 8px; }
      .sb-ob-btn-prev {
        background: transparent;
        border: 1px solid rgba(0,200,150,.18);
        color: rgba(226,237,230,.55);
        font-size: 11px; font-family: 'DM Mono', monospace;
        letter-spacing: 1px; text-transform: uppercase;
        padding: 8px 16px; border-radius: 3px; cursor: pointer;
        transition: all .15s;
      }
      .sb-ob-btn-prev:hover { border-color: rgba(0,200,150,.4); color: rgba(226,237,230,.9); }
      .sb-ob-btn-next {
        background: #00c896; border: 1px solid #00c896;
        color: #080d0b; font-size: 11px;
        font-family: 'DM Mono', monospace; font-weight: 500;
        letter-spacing: 1px; text-transform: uppercase;
        padding: 8px 20px; border-radius: 3px; cursor: pointer;
        transition: all .15s;
      }
      .sb-ob-btn-next:hover { background: #00b585; border-color: #00b585; }

      .sb-ob-final { text-align: center; padding: 8px 0; }
      .sb-ob-final-check {
        width: 54px; height: 54px; border-radius: 50%;
        background: rgba(0,200,150,.1);
        border: 2px solid rgba(0,200,150,.28);
        font-size: 22px;
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 14px;
      }

      /* Botão flutuante para reabrir */
      #sb-onboarding-trigger {
        position: fixed; bottom: 22px; right: 22px; z-index: 9998;
        background: #0f1a12;
        border: 1px solid rgba(0,200,150,.25);
        color: #00c896;
        font-family: 'DM Mono', monospace;
        font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
        padding: 9px 14px; border-radius: 3px; cursor: pointer;
        transition: all .15s;
        display: none;
      }
      #sb-onboarding-trigger:hover {
        background: rgba(0,200,150,.08);
        border-color: rgba(0,200,150,.45);
      }
    `;
    const style = document.createElement("style");
    style.id = "sb-onboarding-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ── Renderização ────────────────────────────────────────── */
  function buildOverlay(steps, onClose) {
    const overlay = document.createElement("div");
    overlay.id = "sb-onboarding-overlay";

    const card = document.createElement("div");
    card.id = "sb-onboarding-card";
    card.innerHTML = `
      <div class="sb-ob-header">
        <div class="sb-ob-title-row">
          <div class="sb-ob-logo">Smart<span>Biz</span></div>
          <div class="sb-ob-badge">Tutorial</div>
        </div>
        <div class="sb-ob-progress" id="sb-progress"></div>
      </div>
      <div class="sb-ob-body" id="sb-body"></div>
      <div class="sb-ob-footer">
        <button class="sb-ob-skip" id="sb-skip">Pular tutorial</button>
        <div class="sb-ob-btns">
          <button class="sb-ob-btn-prev" id="sb-prev">← Voltar</button>
          <button class="sb-ob-btn-next" id="sb-next">Próximo →</button>
        </div>
      </div>
    `;
    overlay.appendChild(card);

    let cur = 0;

    function dots() {
      const el = card.querySelector("#sb-progress");
      el.innerHTML = "";
      steps.forEach((_, i) => {
        const d = document.createElement("div");
        d.className =
          "sb-ob-dot" +
          (i === cur ? " active" : i < cur ? " done" : "");
        el.appendChild(d);
      });
    }

    function body() {
      const el = card.querySelector("#sb-body");
      if (cur >= steps.length) {
        el.innerHTML = `
          <div class="sb-ob-final">
            <div class="sb-ob-final-check">✓</div>
            <div class="sb-ob-step-title" style="font-size:18px;margin-bottom:8px;">Tudo pronto!</div>
            <div class="sb-ob-step-desc">Você já conhece os módulos principais do SmartBiz. Explore à vontade — para rever este tutorial, clique no botão no canto inferior direito.</div>
          </div>`;
        return;
      }
      const s = steps[cur];
      const tipsHtml = s.tips
        .map(
          (t, i) =>
            `<div class="sb-ob-tip"><div class="sb-ob-tip-num">${i + 1}</div><span>${t}</span></div>`
        )
        .join("");
      el.innerHTML = `
        <span class="sb-ob-icon">${s.icon}</span>
        <div class="sb-ob-step-label">Passo ${cur + 1} de ${steps.length} · ${s.label}</div>
        <div class="sb-ob-step-title">${s.title}</div>
        <div class="sb-ob-step-desc">${s.desc}</div>
        <div class="sb-ob-tips">${tipsHtml}</div>`;
    }

    function update() {
      dots();
      body();
      const prev = card.querySelector("#sb-prev");
      const next = card.querySelector("#sb-next");
      prev.style.display = cur === 0 ? "none" : "";
      if (cur >= steps.length) {
        next.textContent = "Começar ✓";
        next.onclick = close;
      } else {
        next.textContent =
          cur === steps.length - 1 ? "Finalizar" : "Próximo →";
        next.onclick = () => {
          cur++;
          update();
        };
      }
    }

    function close() {
      markAllDone(steps);
      overlay.style.transition = "opacity .25s";
      overlay.style.opacity = "0";
      setTimeout(() => {
        overlay.remove();
        showReopenButton(steps);
      }, 250);
      onClose && onClose();
    }

    card.querySelector("#sb-prev").onclick = () => {
      if (cur > 0) { cur--; update(); }
    };
    card.querySelector("#sb-skip").onclick = close;

    update();
    return overlay;
  }

  /* ── Botão flutuante para reabrir ────────────────────────── */
  function showReopenButton(steps) {
    if (document.getElementById("sb-onboarding-trigger")) {
      document.getElementById("sb-onboarding-trigger").style.display = "";
      return;
    }
    const btn = document.createElement("button");
    btn.id = "sb-onboarding-trigger";
    btn.textContent = "? Tutorial";
    btn.onclick = () => {
      btn.style.display = "none";
      document.body.appendChild(buildOverlay(steps, null));
    };
    btn.style.display = "";
    document.body.appendChild(btn);
  }

  /* ── API pública ─────────────────────────────────────────── */
  window.SmartBizOnboarding = {
    /**
     * Inicia o tutorial.
     * @param {Object}   [opts]
     * @param {string[]} [opts.steps]  IDs dos steps a exibir. Omita para usar todos.
     * @param {boolean}  [opts.force]  Se true, ignora o localStorage e sempre exibe.
     */
    start(opts) {
      opts = opts || {};
      injectStyles();

      const ids = opts.steps || ALL_STEPS.map((s) => s.id);
      const chosen = ALL_STEPS.filter((s) => ids.includes(s.id));

      // Filtra apenas os steps não concluídos (a menos que force=true)
      const pending = opts.force
        ? chosen
        : chosen.filter((s) => !isDone(s.id));

      if (!pending.length) {
        showReopenButton(chosen);
        return;
      }

      document.body.appendChild(buildOverlay(pending, null));
    },

    /** Reseta completamente o progresso do tutorial. */
    reset() {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      console.info("[SmartBiz Onboarding] Tutorial resetado.");
    },
  };

  /* ── Auto-inicialização por página ───────────────────────── */
  function autoStart() {
    const page = location.pathname.split("/").pop() || "index.html";
    const relevant = ALL_STEPS.filter(
      (s) => s.pages.some((p) => page.includes(p)) && !isDone(s.id)
    );
    if (!relevant.length) return;

    injectStyles();
    // Pequeno delay para não competir com o carregamento da página
    setTimeout(() => {
      document.body.appendChild(
        buildOverlay(relevant, () => showReopenButton(relevant))
      );
    }, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoStart);
  } else {
    autoStart();
  }
})();
