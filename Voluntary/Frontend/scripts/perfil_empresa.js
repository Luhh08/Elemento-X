// ----------------- helpers -----------------
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const token = localStorage.getItem("token");

// ids salvos pelo login da EMPRESA
const empresaId = localStorage.getItem("empresaId") || localStorage.getItem("userId") || "";
const tipoConta = (localStorage.getItem("tipoConta") || localStorage.getItem("role") || "").toLowerCase();

// id do perfil na URL (?id=) ou o próprio id
const qs = new URLSearchParams(location.search);
const viewedId = qs.get("id") || empresaId;

// sou o dono do perfil?
const isSelf = viewedId && empresaId && String(viewedId) === String(empresaId);

// se abriu sem ?id, coloca na URL
if (!qs.get("id") && viewedId) {
  history.replaceState(null, "", `${location.pathname}?id=${encodeURIComponent(viewedId)}`);
}

// se não tem sessão válida de empresa, manda pro login
if (!token || !empresaId || !tipoConta.includes("empresa")) {
  window.location.href = "login_empresa.html";
}

// mostra/oculta ações conforme o dono do perfil
function toggleActions() {
  const show = (sel, state) => { const el = document.querySelector(sel); if (el) el.hidden = !state; };
  show("#btnEditar", isSelf);
  show("#btnDenunciar", !isSelf);
  show("#btnGerenciar", isSelf);
  show("#btnPublicar", isSelf);
}

// ----------------- scroll lock (popups) -----------------
const popupEdicao = $("#popupEdicao");
const popupDenuncia = $("#popupDenuncia");
const popupDenunciaOk = $("#popupDenunciaOk");

let _lock = { y: 0, padRight: "" };

function anyModalOpen() {
  return [popupEdicao, popupDenuncia, popupDenunciaOk].some(
    (p) => p && p.getAttribute("aria-hidden") === "false"
  );
}
function lockScroll() {
  if (document.body.classList.contains("modal-open")) return;
  const sb = window.innerWidth - document.documentElement.clientWidth;
  _lock.padRight = document.body.style.paddingRight;
  if (sb > 0) document.body.style.paddingRight = `${sb}px`;
  _lock.y = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.top = `-${_lock.y}px`;
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  document.body.classList.add("modal-open");
}
function unlockScroll() {
  if (!document.body.classList.contains("modal-open")) return;
  document.body.classList.remove("modal-open");
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.paddingRight = _lock.padRight || "";
  window.scrollTo(0, _lock.y);
}
function openPopup(p) { p?.setAttribute("aria-hidden", "false"); lockScroll(); }
function closeAllPopups() {
  [popupEdicao, popupDenuncia, popupDenunciaOk].forEach((p) => p?.setAttribute("aria-hidden", "true"));
  if (!anyModalOpen()) unlockScroll();
}
$("#btnEditar")?.addEventListener("click", () => openPopup(popupEdicao));
$("#btnDenunciar")?.addEventListener("click", () => openPopup(popupDenuncia));
$$("[data-close]").forEach((b) => b.addEventListener("click", closeAllPopups));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && anyModalOpen()) closeAllPopups(); });

// ----------------- logout -----------------
$("#logout")?.addEventListener("click", (e) => {
  e.preventDefault();
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("empresaId");
    localStorage.removeItem("empresa_nome");
    localStorage.removeItem("tipoConta");
    localStorage.removeItem("role");
    // se tiver resquício de login de usuário PF:
    localStorage.removeItem("userId");
    localStorage.removeItem("tipoUsuario");
  } finally {
    window.location.href = "login_empresa.html";
  }
});

// ----------------- telefone -----------------
function aplicarMascaraTelefone(input) {
  if (!input) return;
  const format = (v) => {
    v = (v || "").replace(/\D/g, "").slice(0, 11);
    if (v.length <= 10) {
      return v.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
        (a ? `(${a}` : "") + (a && a.length === 2 ? ") " : "") + (b || "") + (b && b.length === 4 ? "-" : "") + (c || "")
      );
    }
    return v.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*/, (_, a, b, c) =>
      (a ? `(${a}` : "") + (a && a.length === 2 ? ") " : "") + (b || "") + (b && b.length === 5 ? "-" : "") + (c || "")
    );
  };
  const handler = () => (input.value = format(input.value));
  ["input", "blur", "paste"].forEach((ev) => input.addEventListener(ev, handler));
}
function formatTelefoneBR(v){
  const d = String(v||"").replace(/\D/g,"");
  if(!d) return "—";
  if(d.length<=10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/,"($1) $2-$3").replace(/-$/,"");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/,"($1) $2-$3").replace(/-$/,"");
}

// ----------------- chips de tags (no popup de edição) -----------------
let _tagsInit = false;
function initChipsTags() {
  if (_tagsInit) return;
  const input = $("#editTags");
  if (!input) return;

  const chips = document.createElement("div");
  chips.id = "chipsTags";
  chips.className = "chips";
  const field = input.closest(".input") || input.parentElement;
  field.insertAdjacentElement("afterend", chips);

  const set = new Set();

  const toggle = () => {
    if (set.size === 0) {
      chips.style.display = "none";
      chips.style.marginTop = "0";
    } else {
      chips.style.display = "flex";
      chips.style.marginTop = "8px";
    }
  };
  toggle();

  function sync() { input.value = Array.from(set).join(", "); }

  function pill(text) {
    const el = document.createElement("span");
    el.className = "chip-pill";
    el.innerHTML = `<span class="chip-label">${text}</span><button type="button" class="remove">×</button>`;
    el.querySelector(".remove").addEventListener("click", () => remove(text));
    return el;
  }

  function add(t) {
    const tag = (t || "").trim();
    if (!tag || set.has(tag)) return;
    set.add(tag);
    chips.appendChild(pill(tag));
    sync();
    toggle();
  }

  function remove(t) {
    if (!set.has(t)) return;
    set.delete(t);
    [...chips.children].forEach((c) => {
      const l = c.querySelector(".chip-label");
      if (l && l.textContent === t) c.remove();
    });
    sync();
    toggle();
  }

  function commit() {
    const raw = input.value;
    if (!raw.trim()) return;
    raw.split(",").map((s) => s.trim()).filter(Boolean).forEach(add);
    input.value = "";
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !input.value && set.size) {
      remove(Array.from(set).pop());
    }
  });
  input.addEventListener("blur", commit);

  (input.value || "").split(",").map(s => s.trim()).filter(Boolean).forEach(add);
  toggle();

  input._chips = { get value(){ return Array.from(set); }, add, remove };
  _tagsInit = true;
}

// ----------------- progresso -----------------
function setProgress(pct) {
  const p = Math.max(0, Math.min(100, Number(pct || 0)));
  if ($("#barraProgresso")) $("#barraProgresso").style.width = `${p}%`;
  if ($("#labelProgresso")) $("#labelProgresso").textContent = `${p}% completo`;
}

function calcProgressoEmpresaFront(e = {}) {
  let pontos = 0;
  const total = 8;
  if (e.razao_social) pontos++;
  if (e.usuario) pontos++;
  if (e.descricao) pontos++;
  if (Array.isArray(e.tags) && e.tags.length) pontos++;
  if (e.logoUrl) pontos++;
  if (e.bannerUrl) pontos++;
  if (e.telefonecontato || e.telefone_empresa) pontos++;
  if (e.endereco && e.cep) pontos++;
  return Math.round((pontos / total) * 100);
}

// bloquear publicação até 100%
function travarPublicacaoVaga(pct) {
  const btn = document.getElementById("btnPublicar");
  if (!btn) return;
  const ok = Number(pct) >= 100;
  btn.hidden = !ok;              // se preferir, use: btn.disabled = !ok;
  if (!ok) btn.title = "Complete 100% do perfil para publicar uma vaga";
  else btn.removeAttribute("title");
}

// ----------------- vagas -----------------
const DEFAULT_VAGA_IMG = "img/default-banner.png";

function resolveImage(src) {
  if (!src || typeof src !== "string" || !src.trim()) return DEFAULT_VAGA_IMG;
  if (src.startsWith("/uploads/") || src.startsWith("uploads/")) return src.startsWith("/") ? src : `/${src}`;
  return src;
}

function statusLabel(s){
  switch(s){
    case "ABERTA": return "Aberto para inscrição";
    case "INSCRICOES_FINALIZADAS": return "Inscrições finalizadas";
    case "ANDAMENTO": return "Em andamento";
    case "FINALIZADA": return "Finalizado";
    default: return "—";
  }
}
function statusClass(s){
  switch(s){
    case "ABERTA": return "status-participando";
    case "INSCRICOES_FINALIZADAS":
    case "FINALIZADA": return "status-finalizado";
    case "ANDAMENTO": return "status-participando";
    default: return "";
  }
}
function vagaCard(v){
  const art = document.createElement("article");
  art.className = "vaga-card clickable";

  const id = v.id ?? v._id ?? v.vagaId ?? v.uuid;
  if (!id) console.warn("Vaga sem ID válido:", v);

  let capa = DEFAULT_VAGA_IMG;
  if (Array.isArray(v.imagens) && v.imagens.length) capa = resolveImage(v.imagens[0]);
  else if (v.capaUrl) capa = resolveImage(v.capaUrl);

  const viewHref = `/descricao_vagas.html?id=${encodeURIComponent(id || "")}`;
  const editHref = `/criacao_vagas.html?id=${encodeURIComponent(id || "")}`;

  art.innerHTML = `
    <div class="vaga-cover">
      <img src="${capa}" alt="vaga">
    </div>
    <div class="vaga-info">
      <p class="vaga-title">${v.titulo || "Vaga"}</p>
      <p class="vaga-sub">${v.descricao || "Descrição"}</p>
      <div class="row">
        <span class="status ${statusClass(v.status)}">${statusLabel(v.status)}</span>
        <a class="chip edit-link" href="${editHref}" onclick="event.stopPropagation()">Editar vaga</a>
      </div>
    </div>`;

  // fallback da imagem
  const img = art.querySelector("img");
  img.addEventListener("error", () => { img.src = DEFAULT_VAGA_IMG; });

  // clique no card abre a descrição
  art.addEventListener("click", () => {
    if (!id) { alert("ID da vaga não encontrado."); return; }
    window.location.href = viewHref;
  });

  return art;
}

function renderVagas(vagas){
  const box = $("#listaVagas");
  if(!box) return;
  box.innerHTML = "";
  if(!vagas || !vagas.length){
    box.innerHTML = `<p style="color:#6b7280">Nenhuma vaga publicada.</p>`;
    return;
  }
  vagas.forEach(v => box.appendChild(vagaCard(v)));
}

// ----------------- carregar perfil -----------------
const defaultAvatar = "img/default-avatar.jpg";
const defaultBanner = "img/default-banner.png";

async function carregarPerfilEmpresa(){
  toggleActions();
  if(!token || !viewedId) return;

  try{
    const [perfilRes, vagasRes] = await Promise.all([
      fetch(`/api/empresas/${viewedId}`, { headers:{ Authorization:`Bearer ${token}` } }),
      fetch(`/api/empresas/${viewedId}/vagas`, { headers:{ Authorization:`Bearer ${token}` } })
    ]);

    const perfil = await perfilRes.json();
    const vagas = await vagasRes.json();

    // header
    const nomeEl = $("#razaoSocial");
    if (nomeEl) nomeEl.textContent = perfil.razao_social || perfil.nome || "Empresa";

    const tagEl = $("#empresaTag");
    if (tagEl) {
      const handle = (perfil.usuario && perfil.usuario.trim())
        ? "@"+perfil.usuario.trim()
        : "@"+ String(perfil.razao_social || "empresa")
            .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
            .toLowerCase().replace(/\s+/g,"");
      tagEl.textContent = handle;
    }

    $("#descricaoEmpresa") && ($("#descricaoEmpresa").textContent = perfil.descricao || "Aqui vai a descrição da empresa.");
    const banner = $("#bannerEmpresa"); if (banner) banner.src = perfil.bannerUrl || defaultBanner;
    const logo = $("#logoEmpresa"); if (logo) logo.src = perfil.logoUrl || defaultAvatar;

    // preview dos popups
    $("#bannerPreview") && ($("#bannerPreview").src = banner?.src || defaultBanner);
    $("#logoPreview") && ($("#logoPreview").src = logo?.src || defaultAvatar);

    // contatos/endereço
    const emailPublico = perfil.emailcontato || "—";
    const telPublico   = formatTelefoneBR(perfil.telefonecontato || "");

    $("#emailEmpresa")    && ($("#emailEmpresa").textContent = emailPublico);
    $("#telefoneEmpresa") && ($("#telefoneEmpresa").textContent = telPublico);
    $("#enderecoEmpresa") && ($("#enderecoEmpresa").textContent = perfil.endereco || "—");
    $("#cepEmpresa")      && ($("#cepEmpresa").textContent = perfil.cep || "—");

    // tags
    const tagsEl = $("#listaTags");
    if (tagsEl) {
      tagsEl.innerHTML = "";
      (perfil.tags || []).forEach(t => {
        const s = document.createElement("span");
        s.className = "tag";
        s.textContent = t;
        tagsEl.appendChild(s);
      });
    }

    // progresso
    const progresso = typeof perfil.progresso === "number"
      ? perfil.progresso
      : calcProgressoEmpresaFront(perfil);
    setProgress(progresso);
    travarPublicacaoVaga(progresso);

    // vagas
    renderVagas(Array.isArray(vagas) ? vagas : []);

    // popup edição
    $("#editRazaoSocial") && ($("#editRazaoSocial").value = perfil.razao_social || perfil.nome || "");
    $("#editUsuario") && ($("#editUsuario").value = perfil.usuario || "");
    $("#editDescricao") && ($("#editDescricao").value = perfil.descricao || "");
    $("#editEmailContato") && ($("#editEmailContato").value = perfil.emailcontato || perfil.email || "");
    if ($("#editTelefoneContato")) {
      $("#editTelefoneContato").value = formatTelefoneBR(perfil.telefonecontato || perfil.telefone_empresa || "");
      aplicarMascaraTelefone($("#editTelefoneContato"));
    }
    if ($("#editTags")) {
      $("#editTags").value = (perfil.tags || []).join(", ");
      initChipsTags();
    }
  }catch(e){
    console.error("Erro ao carregar perfil:", e);
  }
}

// ----------------- salvar edição -----------------
$("#formEdicao")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!token || !isSelf) return;

  // normaliza o usuario igual ao backend
  const rawUsuario = $("#editUsuario")?.value || "";
  const usuario = rawUsuario
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");

  const tags =
    $("#editTags")?._chips?.value ??
    ($("#editTags")?.value || "")
      .split(",").map(s => s.trim()).filter(Boolean);

  const body = {
    razao_social: $("#editRazaoSocial")?.value,
    usuario: usuario || null,
    descricao: $("#editDescricao")?.value,
    tags: [...new Set(tags)],
    emailcontato: $("#editEmailContato")?.value || null,
    telefonecontato: ($("#editTelefoneContato")?.value || "").replace(/\D/g, ""),
  };

  try {
    const resp = await fetch(`/api/empresas/${empresaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const msg = data?.error || `Erro ao atualizar perfil (HTTP ${resp.status})`;
      throw new Error(msg);
    }

    // feedback imediato
    setProgress(data?.progresso ?? calcProgressoEmpresaFront(data));
    travarPublicacaoVaga(data?.progresso ?? calcProgressoEmpresaFront(data));

    closeAllPopups();
    await carregarPerfilEmpresa();
    alert("✅ Perfil da empresa atualizado!");
  } catch (err) {
    console.error(err);
    alert(`❌ ${err.message || "Erro ao salvar as alterações."}`);
  }
});

// ----------------- upload imagens (logo/banner) -----------------
async function uploadImagem(tipo) {
  if (!isSelf) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e) => {
    const arq = e.target.files[0];
    if (!arq) return;
    const fd = new FormData();
    fd.append("imagem", arq);
    try {
      const resp = await fetch(`/api/empresas/${empresaId}/upload/${tipo}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro no upload.");

      if (tipo === "logo") {
        $("#logoEmpresa").src = data.empresa.logoUrl || defaultAvatar;
        if ($("#logoPreview")) $("#logoPreview").src = $("#logoEmpresa").src;
      } else {
        $("#bannerEmpresa").src = data.empresa.bannerUrl || defaultBanner;
        if ($("#bannerPreview")) $("#bannerPreview").src = $("#bannerEmpresa").src;
      }

      const prog = typeof data?.empresa?.progresso === "number"
        ? data.empresa.progresso
        : calcProgressoEmpresaFront(data.empresa || {});
      setProgress(prog);
      travarPublicacaoVaga(prog);

      alert("🖼️ Imagem enviada!");
    } catch (err) {
      console.error(err);
      alert("❌ Falha no upload.");
    }
  };
  input.click();
}
$("#btnNovaLogo")?.addEventListener("click", () => uploadImagem("logo"));
$("#btnNovoBanner")?.addEventListener("click", () => uploadImagem("banner"));

// denúncia (somente visual)
$("#formDenuncia")?.addEventListener("submit", (e) => {
  e.preventDefault();
  popupDenuncia?.setAttribute("aria-hidden", "true");
  popupDenunciaOk?.setAttribute("aria-hidden", "false");
});

// init
document.addEventListener("DOMContentLoaded", carregarPerfilEmpresa);
