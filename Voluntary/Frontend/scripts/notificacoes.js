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
    const openNotifications = initNotificationWidget();
    buildNavigation(openNotifications);
    attachNotificationTriggers(openNotifications);
    initUserMenu();
    initHeaderAvatar();
  });

  function buildNavigation(openNotificationsCb) {
    const links = getNavigationLinks();
    const mainNav = document.querySelector(".main-navigation");
    if (mainNav) {
      mainNav.innerHTML = renderLinks(links, "nav-pill");
      mainNav.addEventListener("click", (e) => {
        const pill = e.target.closest(".nav-pill");
        if (!pill) return;
        const action = pill.dataset.action;
        if (action === "notifications") {
          e.preventDefault();
          openNotificationsCb?.();
        }
      });
    }

    const drawerMenu = document.getElementById("drawerMenu");
    if (drawerMenu) {
      drawerMenu.innerHTML = renderLinks(links, "drawer-pill");
      drawerMenu.addEventListener("click", (e) => {
        const pill = e.target.closest(".drawer-pill");
        if (!pill) return;
        const action = pill.dataset.action;
        if (action === "notifications") {
          e.preventDefault();
          toggleDrawer(false);
          openNotificationsCb?.();
          return;
        }
        toggleDrawer(false);
      });
    }

    const menuToggle = document.getElementById("menuToggle");
    const closeDrawer = document.getElementById("closeDrawer");
    const overlay = document.getElementById("drawerOverlay");
    const backBtn = document.getElementById("btnBack");
    menuToggle?.addEventListener("click", () => toggleDrawer(true));
    closeDrawer?.addEventListener("click", () => toggleDrawer(false));
    overlay?.addEventListener("click", () => toggleDrawer(false));
    backBtn?.addEventListener("click", () => history.back());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") toggleDrawer(false);
    });
  }

  function attachNotificationTriggers(openFn) {
    if (typeof openFn !== "function") return;
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-open-notifications]");
      if (!trigger) return;
      e.preventDefault();
      openFn();
    });
  }

  function toggleDrawer(forceOpen) {
    const drawer = document.getElementById("navDrawer");
    const overlay = document.getElementById("drawerOverlay");
    if (!drawer || !overlay) return;
    const willOpen = forceOpen === true ? true : forceOpen === false ? false : !drawer.classList.contains("open");
    drawer.classList.toggle("open", willOpen);
    overlay.classList.toggle("show", willOpen);
  }

  function getNavigationLinks() {
    const tipo = (localStorage.getItem("tipoConta") || localStorage.getItem("role") || "").toLowerCase();
    const isEmpresa = tipo.includes("empresa");
    const userId = localStorage.getItem("userId") || "";
    const empresaId = localStorage.getItem("empresaId") || userId || "";
    const perfilEmpresaHref = empresaId ? `perfil-empresa.html?id=${encodeURIComponent(empresaId)}` : "login_empresa.html";
    const perfilUsuarioHref = userId ? `perfil-usuario.html?id=${encodeURIComponent(userId)}` : "login.html";

    if (isEmpresa) {
      return [
        { href: perfilEmpresaHref, label: "Perfil", icon: "fa-building" },
        { href: "pesquisar-volutarios.html", label: "Procurar Voluntarios", icon: "fa-users" },
        { href: "gerenciar_aplicacoes.html", label: "Aplicações", icon: "fa-key" },
        { href: "login_empresa.html", label: "Sair", icon: "fa-arrow-right-from-bracket", danger: true },
      ];
    }
    return [
      { href: perfilUsuarioHref, label: "Perfil", icon: "fa-user" },
      { href: "vagas.html", label: "Procurar Vagas", icon: "fa-search" },
      {
        href: perfilUsuarioHref,
        label: "Minhas candidaturas",
        icon: "fa-clipboard-check",
      },
      { href: "login.html", label: "Sair", icon: "fa-arrow-right-from-bracket", danger: true },
    ];
}

  function renderLinks(links, baseClass) {
    return links
      .map((link) => {
        const className = `${baseClass}${link.danger ? " danger" : ""}`;
        if (link.action) {
          return `<button type="button" class="${className}" data-action="${link.action}">
            <i class="fa-solid ${link.icon}"></i>${link.label}
          </button>`;
        }
        return `<a class="${className}" href="${link.href}">
          <i class="fa-solid ${link.icon}"></i>${link.label}
        </a>`;
      })
      .join("");
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

  function initHeaderAvatar() {
    const avatarEls = Array.from(document.querySelectorAll("#headerAvatar, .avatar-btn img"));
    if (!avatarEls.length) return;

    const tipo = (localStorage.getItem("tipoConta") || localStorage.getItem("role") || "").toLowerCase();
    const token = localStorage.getItem("token") || "";
    const isEmpresa = tipo.includes("empresa");
    const userId = localStorage.getItem("userId") || "";
    const empresaId = localStorage.getItem("empresaId") || "";
    const accountId = isEmpresa ? (empresaId || userId) : userId;
    if (!accountId) return;

    const endpoint = isEmpresa ? `/api/empresas/${encodeURIComponent(accountId)}` : `/api/usuario/${encodeURIComponent(accountId)}`;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(endpoint, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const rawSrc = extractAvatarUrl(data, isEmpresa);
        const finalSrc = normalizeUploadUrl(rawSrc);
        if (!finalSrc) return;
        avatarEls.forEach((img) => {
          img.src = finalSrc;
        });
      })
      .catch((err) => console.error("Erro ao carregar avatar do header:", err));
  }

  function extractAvatarUrl(data, isEmpresa) {
    if (!data) return "";
    if (isEmpresa) {
      return data.logoUrl || data.logo || data.bannerUrl || "";
    }
    return data.fotoUrl || data.foto || data.avatar || "";
  }

  function normalizeUploadUrl(src) {
    if (!src) return "";
    let s = String(src).trim().replace(/\\/g, "/");
    if (!s || s === "[object Object]") return "";
    if (/^https?:|^data:/i.test(s)) return s;
    if (/^\/?api\/uploads\//i.test(s)) return s.startsWith("/") ? s : `/${s}`;
    if (/^\/?uploads\//i.test(s)) {
      s = s.replace(/^\/?/, "");
      return `/api/${s}`;
    }
    if (!s.includes("/") && /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(s)) {
      return `/api/uploads/${s}`;
    }
    return s;
  }

  function initNotificationWidget() {
    const wrappers = Array.from(document.querySelectorAll(".notification-wrapper"));
    if (!wrappers.length) return null;
    const handlers = wrappers
      .map((wrapper) => createWrapperController(wrapper))
      .filter(Boolean);
    return handlers[0]?.open || null;
  }

  function createWrapperController(wrapper) {
    const btn = wrapper.querySelector("button");
    const panel = wrapper.querySelector(".notif-panel");
    const counterEls = wrapper.querySelectorAll(".notification-count");
    if (!btn || !panel) return null;

    let cache = [];
    const token = localStorage.getItem("token");

    const abrirPainel = async () => {
      panel.classList.add("active");
      await carregarNotificacoes();
      await marcarTodasComoLidas();
    };

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (panel.classList.contains("active")) {
        panel.classList.remove("active");
      } else {
        await abrirPainel();
      }
    });

    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-open-notifications]")) return;
      if (!panel.contains(e.target) && !btn.contains(e.target)) {
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

    async function marcarTodasComoLidas() {
      if (!token) return;
      try {
        await fetch("/api/notificacoes/marcar-todas", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        cache = cache.map((n) => ({ ...n, lida: true }));
        panel.querySelectorAll(".notif-item").forEach((item) => item.classList.remove("unread"));
        updateCounter(counterEls, 0);
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
    return { open: abrirPainel };
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
