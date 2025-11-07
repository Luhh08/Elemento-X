// ----------- Utilidades -----------
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ---------- MÁSCARA DE TELEFONE (BR) ----------
function aplicarMascaraTelefone(input) {
  if (!input) return;
  const format = (v) => {
    v = (v || "").replace(/\D/g, "").slice(0, 11);
    if (v.length <= 10) {
      return v.replace(
        /^(\d{0,2})(\d{0,4})(\d{0,4}).*/,
        (_, a, b, c) =>
          (a ? `(${a}` : "") +
          (a && a.length === 2 ? ") " : "") +
          (b || "") +
          (b && b.length === 4 ? "-" : "") +
          (c || "")
      );
    }
    return v.replace(
      /^(\d{0,2})(\d{0,5})(\d{0,4}).*/,
      (_, a, b, c) =>
        (a ? `(${a}` : "") +
        (a && a.length === 2 ? ") " : "") +
        (b || "") +
        (b && b.length === 5 ? "-" : "") +
        (c || "")
    );
  };
  const handler = () => { input.value = format(input.value); };
  ["input", "blur", "paste"].forEach((ev) => input.addEventListener(ev, handler));
}

// ---------- Formatação p/ EXIBIÇÃO ----------
function formatTelefoneBR(v) {
  const d = String(v || "").replace(/\D/g, "");
  if (!d) return "—";
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  }
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

// ---------- TAGS/COMPETÊNCIAS EM CHIPS ----------
let _tagsInicializado = false;
function initChipsCompetencias() {
  if (_tagsInicializado) return;
  const input = $("#editCompetencias");
  if (!input) return;

  const chips = document.createElement("div");
  chips.id = "chipsCompetencias";
  chips.className = "chips";
  input.insertAdjacentElement("afterend", chips);

  const tags = new Set();

  (input.value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach(addTag);

  function syncInput() { input.value = Array.from(tags).join(", "); }

  function criarChipDom(texto) {
    const el = document.createElement("span");
    el.className = "chip-pill";
    const label = document.createElement("span");
    label.className = "chip-label";
    label.textContent = texto;
    const btn = document.createElement("button");
    btn.className = "remove";
    btn.type = "button";
    btn.setAttribute("aria-label", `Remover ${texto}`);
    btn.textContent = "×";
    btn.addEventListener("click", () => removeTag(texto));
    el.append(label, btn);
    return el;
  }

  function addTag(t) {
    const tag = (t || "").trim();
    if (!tag || tags.has(tag)) return;
    tags.add(tag);
    chips.appendChild(criarChipDom(tag));
    syncInput();
  }

  function removeTag(t) {
    if (!tags.has(t)) return;
    tags.delete(t);
    [...chips.children].forEach((chip) => {
      const label = chip.querySelector(".chip-label");
      if (label && label.textContent === t) chip.remove();
    });
    syncInput();
  }

  function commitInput() {
    const raw = input.value;
    if (!raw.trim()) return;
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach(addTag);
    input.value = "";
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      commitInput();
    } else if (e.key === "Backspace" && !input.value && tags.size) {
      const ultima = Array.from(tags).pop();
      removeTag(ultima);
    }
  });
  input.addEventListener("blur", commitInput);

  input._chips = { addTag, removeTag, get value() { return Array.from(tags); } };
  _tagsInicializado = true;
}

// ----------- Tokens de sessão -----------
const token = localStorage.getItem("token");
const userId = localStorage.getItem("userId");

const viewedId = new URLSearchParams(location.search).get("id") || userId;
const isSelf = viewedId === userId;
if (!new URLSearchParams(location.search).get("id")) {
  history.replaceState(null, "", `${location.pathname}?id=${viewedId}`);
}

// ----------- POPUPS -----------
const popupEdicao = $("#popupEdicao");
const popupDenuncia = $("#popupDenuncia");
const popupDenunciaOk = $("#popupDenunciaOk");

if (btnEditar)   btnEditar.style.display   = isSelf ? "" : "none";
if (btnDenunciar) btnDenunciar.style.display = isSelf ? "none" : "";

let _scrollLock = { y: 0, padRight: "" };

function lockScroll() {
  if (document.body.classList.contains("modal-open")) return;
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  _scrollLock.padRight = document.body.style.paddingRight;
  if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
  _scrollLock.y = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.top = `-${_scrollLock.y}px`;
  document.body.classList.add("modal-open");
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
}

function unlockScroll() {
  if (!document.body.classList.contains("modal-open")) return;
  document.body.classList.remove("modal-open");
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.paddingRight = _scrollLock.padRight || "";
  window.scrollTo(0, _scrollLock.y);
}

function anyModalOpen() {
  return [popupEdicao, popupDenuncia, popupDenunciaOk].some(
    (p) => p && p.getAttribute("aria-hidden") === "false"
  );
}

function openPopup(p) {
  p?.setAttribute("aria-hidden", "false");
  lockScroll();
}

function closeAllPopups() {
  [popupEdicao, popupDenuncia, popupDenunciaOk].forEach((p) =>
    p?.setAttribute("aria-hidden", "true")
  );
  if (!anyModalOpen()) unlockScroll();
}

$("#btnEditar")?.addEventListener("click", () => openPopup(popupEdicao));
$("#btnDenunciar")?.addEventListener("click", () => openPopup(popupDenuncia));
$$("[data-close]").forEach((btn) =>
  btn.addEventListener("click", closeAllPopups)
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && anyModalOpen()) closeAllPopups();
});

// ----------- Caminhos padrão -----------
const defaultFoto = "../img/default-avatar.jpg";
const defaultBanner = "../img/default-banner.png";

// ----------- Carregar perfil -----------
async function carregarPerfil() {
  if (!token || !userId) return;

  try {
    const res = await fetch(`/api/usuario/${viewedId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Erro ao carregar perfil.");
    const data = await res.json();

    $("#nomeUsuario").textContent = data.nome || "";
    $("#usuarioTag").textContent = data.usuario ? `@${data.usuario}` : "";
    $("#descricaoUsuario").textContent =
      data.descricao || "Este usuário ainda não adicionou uma descrição.";

    $("#bannerUsuario").src = data.bannerUrl || defaultBanner;
    $("#fotoUsuario").src = data.fotoUrl || defaultFoto;
    $("#bannerPreview").src = data.bannerUrl || defaultBanner;
    $("#fotoPreview").src = data.fotoUrl || defaultFoto;

    const tagsEl = $("#listaCompetencias");
    if (tagsEl) {
      tagsEl.innerHTML = "";
      (data.competencias || []).forEach((t) => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = t;
        tagsEl.appendChild(span);
const progressRow = document.querySelector('.progress-row');
if (progressRow && !isSelf) {
  progressRow.style.display = 'none';
}
      });
    }

    const horarios = Array.isArray(data.preferenciaHorario)
      ? data.preferenciaHorario
      : data.preferenciaHorario
      ? [data.preferenciaHorario]
      : [];

    $("#turnoUsuario").textContent = horarios.length ? horarios.join(", ") : "—";
    $("#emailContato").textContent = data.emailcontato || "—";
    $("#telefoneContato").textContent = formatTelefoneBR(data.telefonecontato);

    $("#editNome").value = data.nome || "";
    $("#editUsuario").value = data.usuario || "";
    $("#editDescricao").value = data.descricao || "";
    $("#editEmailContato").value = data.emailcontato || "";
    $("#editTelefoneContato").value = formatTelefoneBR(data.telefonecontato || "");
    $("#editCompetencias").value = (data.competencias || []).join(", ");

    aplicarMascaraTelefone($("#editTelefoneContato"));
    initChipsCompetencias();

    $$('input[name="disp[]"]').forEach((ch) => (ch.checked = false));
    horarios.forEach((h) => {
      const cb = document.querySelector(`input[name="disp[]"][value="${h}"]`);
      if (cb) cb.checked = true;
    });

    // ----------- Barra de progresso -----------
    atualizarBarraProgresso(data.progresso);

    // 🔒 Oculta a barra de progresso se não for o próprio perfil
    const barra = document.querySelector(".progress-container, #barraProgresso");
    if (barra && !isSelf) {
      barra.style.display = "none";
    }

  } catch (err) {
    console.error("Erro ao carregar perfil:", err);
  }
}

// ----------- Atualizar barra de progresso -----------
function atualizarBarraProgresso(valor) {
  const p = Math.max(0, Math.min(100, Number(valor || 0)));
  $("#barraProgresso").style.width = `${p}%`;
  $("#labelProgresso").textContent = `${p}% completo`;
}

// ----------- Salvar edição / Upload / Denúncia (restante do seu código permanece igual) -----------

document.addEventListener("DOMContentLoaded", carregarPerfil);
