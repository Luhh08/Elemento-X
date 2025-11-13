(() => {
  const ICONS = {
    CANDIDATURA: "fa-solid fa-briefcase",
    STATUS_CANDIDATURA: "fa-solid fa-circle-check",
    DENUNCIA: "fa-solid fa-flag",
  };

  const escapeHtml = (str = "") =>
    String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m]));

  document.addEventListener("DOMContentLoaded", () => {
    buildHeaderNavigation();
    initUserMenu();
    initNotificationWidget();
  });

  function buildHeaderNavigation() {
    const nav = document.querySelector(".main-navigation");
    if (!nav) return;
    const tipo = (localStorage.getItem("tipoConta") || localStorage.getItem("role") || "").toLowerCase();
    const isEmpresa = tipo.includes("empresa");
    const userId = localStorage.getItem("userId") || "";

    const links = isEmpresa
      ? [
          { href: "pesquisar-volutarios.html", label: "Procurar Voluntários", icon: "fa-users" },
          { href: "gerenciar_aplicacoes.html", label: "Aplicações", icon: "fa-key" },
        ]
      : [
          { href: "vagas.html", label: "Procurar Vagas", icon: "fa-search" },
          { href: userId ? `perfil-usuario.html?id=${encodeURIComponent(userId)}` : "login.html", label: "Minhas candidaturas", icon: "fa-clipboard-check" },
        ];

    nav.innerHTML = `
      <div class="nav-links">
        ${links
          .map(
            (link) => `
          <a class="nav-pill" href="${link.href}">
            <i class="fa-solid ${link.icon}"></i>
            ${link.label}
          </a>`
          )
          .join("")}
      </div>`;
  }

  function initUserMenu() {
    const avatar = document.getElementById("userAvatar");
    const dropdown = document.getElementById("dropdownMenu");
    if (!avatar || !dropdown) return;

    const tipo = (localStorage.getItem("tipoConta") || localStorage.getItem("role") || "").toLowerCase();
    const isEmpresa = tipo.includes("empresa");
    const userId = localStorage.getItem("userId") || localStorage.getItem("empresaId") || "";

    const links = isEmpresa
      ? [
          { href: userId ? `perfil-empresa.html?id=${encodeURIComponent(userId)}` : "login_empresa.html", icon: "fa-building", text: "Perfil da empresa" },
          { href: "gerenciar_aplicacoes.html", icon: "fa-key", text: "Aplicações" },
          { href: "configuracoes.html", icon: "fa-gear", text: "Configurações" },
          { href: "login_empresa.html", icon: "fa-arrow-right-from-bracket", text: "Sair", logout: true },
        ]
      : [
          { href: userId ? `perfil-usuario.html?id=${encodeURIComponent(userId)}` : "login.html", icon: "fa-user", text: "Perfil" },
          { href: "configuracoes.html", icon: "fa-gear", text: "Configurações" },
          { href: "login.html", icon: "fa-arrow-right-from-bracket", text: "Sair", logout: true },
        ];

    dropdown.innerHTML = links
      .map(
        (link) => `
        <a href="${link.href}" class="dropdown-item ${link.logout ? "logout" : ""}">
          <span class="icon"><i class="fa-solid ${link.icon}"></i></span> ${link.text}
        </a>`
      )
      .join("");

    avatar.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("active");
    });
    document.addEventListener("click", () => dropdown.classList.remove("active"));
  }

  function initNotificationWidget() {
    const wrapper = document.getElementById("notificationWrapper");
    const btn = document.getElementById("notifBtn");
    const panel = document.getElementById("notifPanel");
    const counterEls = document.querySelectorAll(".notification-count");
    if (!wrapper || !btn || !panel) return;

    let cache = [];
    const token = localStorage.getItem("token");

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      panel.classList.toggle("active");
      if (panel.classList.contains("active")) {
        await carregarNotificacoes();
        marcarTodasComoLidas(counterEls);
      }
    });

    document.addEventListener("click", (e) => {
      if (!panel.contains(e.target) && e.target !== btn) {
        panel.classList.remove("active");
      }
    });

    panel.addEventListener("click", async (e) => {
      const item = e.target.closest(".notif-item");
      if (!item) return;
      const notificationId = item.dataset.id;
      const link = item.dataset.link;
      if (notificationId) {
        await marcarNotificacao(notificationId);
        item.classList.remove("unread");
      }
      if (link) {
        window.location.href = link;
      }
    });

    async function carregarNotificacoes() {
      if (!token) {
        panel.innerHTML = `
          <div class="notif-header">Notificações</div>
          <p class="notif-empty">Entre para acompanhar suas notificações.</p>`;
        updateCounter(counterEls, 0);
        return;
      }
      panel.innerHTML = `
        <div class="notif-header">Notificações</div>
        <p class="notif-empty">Carregando...</p>`;
      try {
        const resp = await fetch("/api/notificacoes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || "Falha ao carregar notificações.");
        }
        const data = await resp.json();
        cache = data.items || [];
        renderLista(cache, panel);
        updateCounter(counterEls, data.unread || 0);
      } catch (err) {
        console.error(err);
        panel.innerHTML = `
          <div class="notif-header">Notificações</div>
          <p class="notif-empty">${err.message || "Erro ao carregar notificações."}</p>`;
        updateCounter(counterEls, 0);
      }
    }

    async function marcarTodasComoLidas(counterTargets) {
      if (!token) return;
      try {
        await fetch("/api/notificacoes/marcar-todas", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        cache = cache.map((n) => ({ ...n, lida: true }));
        panel.querySelectorAll(".notif-item").forEach((item) => item.classList.remove("unread"));
        updateCounter(counterTargets, 0);
      } catch (err) {
        console.error("Erro ao marcar notificações como lidas:", err);
      }
    }

    async function marcarNotificacao(id) {
      if (!token || !id) return;
      try {
        await fetch(`/api/notificacoes/${id}/lida`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error("Erro ao confirmar leitura da notificação:", err);
      }
    }

    function renderLista(lista, panelEl) {
      const corpo = lista
        .map((item) => {
          const icon = ICONS[item.categoria?.toUpperCase()] || "fa-solid fa-bell";
          return `
            <button class="notif-item ${item.lida ? "" : "unread"}" data-id="${item.id}" data-link="${item.link || ""}">
              <div class="notif-title">${escapeHtml(item.titulo)} <i class="${icon}"></i></div>
              <div class="notif-text">${escapeHtml(item.mensagem || "")}</div>
              <div class="notif-time">${formatDate(item.criadoEm)}</div>
            </button>`;
        })
        .join("");
      panelEl.innerHTML = `
        <div class="notif-header">Notificações</div>
        ${lista.length ? corpo : `<p class="notif-empty">Nenhuma notificação recente.</p>`}`;
    }

    carregarNotificacoes();
  }

  function updateCounter(counters, value) {
    const display = value > 0 ? (value > 9 ? "9+" : String(value)) : "";
    counters.forEach((counter) => {
      if (!counter) return;
      if (display) {
        counter.textContent = display;
        counter.style.display = "inline-block";
      } else {
        counter.textContent = "";
        counter.style.display = "none";
      }
    });
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  }
})();
