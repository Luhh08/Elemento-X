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

  // cria o contêiner de chips FORA da caixa do input
  const chips = document.createElement("div");
  chips.id = "chipsCompetencias";
  chips.className = "chips";
  input.insertAdjacentElement("afterend", chips); // 👈 fora do input

  const tags = new Set();

  // carrega valores iniciais
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
    .split(",")                 // 👈 apenas vírgula
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

// id do perfil que está sendo visto: ?id=123 ou o próprio
const viewedId = new URLSearchParams(location.search).get("id") || userId;
const isSelf = viewedId === userId;
if (!new URLSearchParams(location.search).get("id")) {
  history.replaceState(null, "", `${location.pathname}?id=${viewedId}`);
}

// ----------- POPUPS -----------
const popupEdicao = $("#popupEdicao");
const popupDenuncia = $("#popupDenuncia");
const popupDenunciaOk = $("#popupDenunciaOk");

// exibe só o que faz sentido
if (btnEditar)   btnEditar.style.display   = isSelf ? "" : "none";
if (btnDenunciar) btnDenunciar.style.display = isSelf ? "none" : "";

let _scrollLock = { y: 0, padRight: "" };

function lockScroll() {
  if (document.body.classList.contains("modal-open")) return;

  // evita "pulo" quando some a barra de rolagem
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  _scrollLock.padRight = document.body.style.paddingRight;
  if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

  // trava a posição
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

// abrir
$("#btnEditar")?.addEventListener("click", () => openPopup(popupEdicao));
$("#btnDenunciar")?.addEventListener("click", () => openPopup(popupDenuncia));

// fechar por botões [data-close]
$$("[data-close]").forEach((btn) =>
  btn.addEventListener("click", closeAllPopups)
);

// fechar com ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && anyModalOpen()) closeAllPopups();
});


// ----------- Caminhos padrão de imagem -----------
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

    // Header
    $("#nomeUsuario").textContent = data.nome || "";
    $("#usuarioTag").textContent = data.usuario ? `@${data.usuario}` : "";
    $("#descricaoUsuario").textContent =
      data.descricao || "Este usuário ainda não adicionou uma descrição.";

    // Imagens
    $("#bannerUsuario").src = data.bannerUrl || defaultBanner;
    $("#fotoUsuario").src = data.fotoUrl || defaultFoto;
    $("#bannerPreview").src = data.bannerUrl || defaultBanner;
    $("#fotoPreview").src = data.fotoUrl || defaultFoto;

    // Competências (visualização)
    const tagsEl = $("#listaCompetencias");
    if (tagsEl) {
      tagsEl.innerHTML = "";
      (data.competencias || []).forEach((t) => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = t;
        tagsEl.appendChild(span);
      });
    }

    // Disponibilidade e contatos
    const horarios = Array.isArray(data.preferenciaHorario)
      ? data.preferenciaHorario
      : data.preferenciaHorario
      ? [data.preferenciaHorario]
      : [];

    $("#turnoUsuario").textContent = horarios.length ? horarios.join(", ") : "—";
    $("#emailContato").textContent = data.emailcontato || "—";

    // Exibe telefone formatado no card
    $("#telefoneContato").textContent = formatTelefoneBR(data.telefonecontato);

    // Preenche popup de edição (telefone já formatado)
    $("#editNome").value = data.nome || "";
    $("#editUsuario").value = data.usuario || "";
    $("#editDescricao").value = data.descricao || "";
    $("#editEmailContato").value = data.emailcontato || "";
    $("#editTelefoneContato").value = formatTelefoneBR(data.telefonecontato || "");
    $("#editCompetencias").value = (data.competencias || []).join(", ");

    // Inicializações de UI (máscara + chips)
    aplicarMascaraTelefone($("#editTelefoneContato"));
    initChipsCompetencias();

    // Marcar disponibilidade (checkboxes)
    $$('input[name="disp[]"]').forEach((ch) => (ch.checked = false));
    horarios.forEach((h) => {
      const cb = document.querySelector(`input[name="disp[]"][value="${h}"]`);
      if (cb) cb.checked = true;
    });

    // Barra de progresso
    atualizarBarraProgresso(data.progresso);
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

// ----------- Salvar edição -----------
$("#formEdicao")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!token || !userId) return;

  // horários marcados
  const selecionados = [...document.querySelectorAll('input[name="disp[]"]:checked')]
    .map((el) => el.value);

  // competencias como ARRAY
  const comps =
    $("#editCompetencias")._chips?.value ||
    $("#editCompetencias").value.split(",").map((s) => s.trim()).filter(Boolean);
  const competenciasArray = [...new Set(comps)];

  // telefone só números para envio
  const telefoneLimpo = $("#editTelefoneContato").value.replace(/\D/g, "");

  const body = {
    nome: $("#editNome").value,
    usuario: $("#editUsuario").value,
    descricao: $("#editDescricao").value,
    competencias: competenciasArray,
    preferenciaHorario: selecionados,
    emailcontato: $("#editEmailContato").value,
    telefonecontato: telefoneLimpo,
  };

  try {
    const resp = await fetch(`/api/usuario/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const result = await resp.json();
    if (!resp.ok) throw new Error(result.error || "Erro ao atualizar perfil.");

    popupEdicao?.setAttribute("aria-hidden", "true");
    await carregarPerfil();
    alert("✅ Perfil atualizado com sucesso!");
  } catch (err) {
    console.error("Erro ao salvar perfil:", err);
    alert("❌ Erro ao salvar as alterações.");
  }
});

// ----------- Upload de imagem (foto e banner) -----------
async function uploadImagem(tipo) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const formData = new FormData();
    formData.append("imagem", arquivo);

    try {
      const resp = await fetch(`/api/usuario/${userId}/upload/${tipo}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro no upload.");

      if (tipo === "foto") {
        $("#fotoUsuario").src = data.usuario.fotoUrl || defaultFoto;
        $("#fotoPreview").src = data.usuario.fotoUrl || defaultFoto;
      } else {
        $("#bannerUsuario").src = data.usuario.bannerUrl || defaultBanner;
        $("#bannerPreview").src = data.usuario.bannerUrl || defaultBanner;
      }

      alert("🖼️ Imagem enviada com sucesso!");
    } catch (err) {
      console.error("Erro ao enviar imagem:", err);
      alert("❌ Falha no envio da imagem.");
    }
  };
  input.click();
}
$("#btnNovaFoto")?.addEventListener("click", () => uploadImagem("foto"));
$("#btnNovoBanner")?.addEventListener("click", () => uploadImagem("banner"));

// ----------- Denúncia visual -----------
$("#formDenuncia")?.addEventListener("submit", (e) => {
  e.preventDefault();
  popupDenuncia?.setAttribute("aria-hidden", "true");
  popupDenunciaOk?.setAttribute("aria-hidden", "false");
});

// ----------- Inicialização -----------
document.addEventListener("DOMContentLoaded", carregarPerfil);
