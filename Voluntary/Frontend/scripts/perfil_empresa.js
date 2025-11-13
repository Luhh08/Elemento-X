const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const popupFeedbacks = document.getElementById("popupFeedbacks");
const token = localStorage.getItem("token");
const empresaId = localStorage.getItem("empresaId") || localStorage.getItem("userId") || "";
const tipoConta = (localStorage.getItem("tipoConta") || localStorage.getItem("role") || "").toLowerCase();

const qs = new URLSearchParams(location.search);
const viewedId = qs.get("id") || empresaId;

const modoPublico = (qs.get("public") === "true") || !token;

const isSelf = viewedId && empresaId && String(viewedId) === String(empresaId);

if (!qs.get("id") && viewedId) {
  history.replaceState(null, "", `${location.pathname}?id=${encodeURIComponent(viewedId)}${modoPublico ? "&public=true" : ""}`);
}

if (!modoPublico && (!token || !empresaId || !tipoConta.includes("empresa"))) {
  window.location.href = "login_empresa.html";
}

function toggleActions() {
  const show = (sel, state) => { const el = document.querySelector(sel); if (el) el.hidden = !state; };

  if (modoPublico) {
    show("#btnEditar", false);
    show("#btnGerenciar", false);
    show("#btnPublicar", false);
    show("#btnDenunciar", true);
    return;
  }

  show("#btnEditar", isSelf);
  show("#btnDenunciar", !isSelf);
  show("#btnGerenciar", isSelf);
  show("#btnPublicar", isSelf);
}

const popupEdicao = $("#popupEdicao");
const popupDenuncia = $("#popupDenuncia");
const popupDenunciaOk = $("#popupDenunciaOk");

let _lock = { y: 0, padRight: "" };

function anyModalOpen() {
  return [popupEdicao, popupDenuncia, popupDenunciaOk, popupFeedbacks]
    .some((p) => p && p.getAttribute("aria-hidden") === "false");
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
function openPopup(p) {
  if (!p) return;
  p.setAttribute("aria-hidden", "false");
  lockScroll();
}
function closeAllPopups() {
  [popupEdicao, popupDenuncia, popupDenunciaOk, popupFeedbacks]
    .forEach((p) => p?.setAttribute("aria-hidden", "true"));
  if (!anyModalOpen()) unlockScroll();
}
$("#btnEditar")?.addEventListener("click", () => openPopup(popupEdicao));
$("#btnDenunciar")?.addEventListener("click", () => openPopup(popupDenuncia));
$$("[data-close]").forEach((b) => b.addEventListener("click", closeAllPopups));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && anyModalOpen()) closeAllPopups(); });

[popupEdicao, popupDenuncia, popupDenunciaOk, popupFeedbacks].forEach((p) => {
  p?.addEventListener("click", (e) => {
    const dialog = p.querySelector(".popup-dialog");
    if (dialog && !dialog.contains(e.target)) closeAllPopups();
  });
});

$("#logout")?.addEventListener("click", (e) => {
  e.preventDefault();
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("empresaId");
    localStorage.removeItem("empresa_nome");
    localStorage.removeItem("tipoConta");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("tipoUsuario");
  } finally {
    window.location.href = "login_empresa.html";
  }
});

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

function travarPublicacaoVaga(pct) {
  const btn = document.getElementById("btnPublicar");
  if (!btn) return;
  const ok = Number(pct) >= 100 && !modoPublico && isSelf;
  btn.hidden = !ok;
  if (!ok) btn.title = "Complete 100% do perfil para publicar uma vaga";
  else btn.removeAttribute("title");
}

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
  const img = art.querySelector("img");
  img.addEventListener("error", () => { img.src = DEFAULT_VAGA_IMG; });
  art.addEventListener("click", () => {
    if (!id) { alert("ID da vaga não encontrado."); return; }
    window.location.href = viewHref;
  });
  if (modoPublico || !isSelf) {
    const edit = art.querySelector(".edit-link");
    if (edit) edit.remove();
  }
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

const defaultAvatar = "img/default-avatar.jpg";
const defaultBanner = "img/default-banner.png";

async function carregarPerfilEmpresa(){
  toggleActions();
  if(!viewedId) return;
  try{
    let perfil, vagas;
    if (modoPublico) {
      const wrap = document.getElementById("progressWrap") || document.querySelector(".progress-wrap");
      if (wrap) wrap.style.display = "none";
      const [perfilRes, vagasRes] = await Promise.all([
        fetch(`/api/empresas/${viewedId}/public`),
        fetch(`/api/empresas/${viewedId}/vagas/public`)
      ]);
      perfil = await perfilRes.json();
      vagas = await vagasRes.json();
    } else {
      const [perfilRes, vagasRes] = await Promise.all([
        fetch(`/api/empresas/${viewedId}`, { headers:{ Authorization:`Bearer ${token}` } }),
        fetch(`/api/empresas/${viewedId}/vagas`, { headers:{ Authorization:`Bearer ${token}` } })
      ]);
      perfil = await perfilRes.json();
      vagas = await vagasRes.json();
    }

    const nomeEl = $("#razaoSocial");
    if (nomeEl) nomeEl.textContent = perfil.razao_social || perfil.nome || "Empresa";

    const tagEl = $("#empresaTag");
    if (tagEl) {
      const handle = (perfil.usuario && perfil.usuario.trim())
        ? "@"+perfil.usuario.trim()
        : "@"+ String(perfil.razao_social || "empresa").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g,"");
      tagEl.textContent = handle;
    }

    $("#descricaoEmpresa") && ($("#descricaoEmpresa").textContent = perfil.descricao || "Aqui vai a descrição da empresa.");
    const banner = $("#bannerEmpresa"); if (banner) banner.src = perfil.bannerUrl || defaultBanner;
    const logo = $("#logoEmpresa"); if (logo) logo.src = perfil.logoUrl || defaultAvatar;

    $("#bannerPreview") && ($("#bannerPreview").src = banner?.src || defaultBanner);
    $("#logoPreview") && ($("#logoPreview").src = logo?.src || defaultAvatar);

    const emailPublico = perfil.emailcontato || "—";
    const telPublico   = formatTelefoneBR(perfil.telefonecontato || "");
    $("#emailEmpresa")    && ($("#emailEmpresa").textContent = emailPublico);
    $("#telefoneEmpresa") && ($("#telefoneEmpresa").textContent = telPublico);
    $("#enderecoEmpresa") && ($("#enderecoEmpresa").textContent = perfil.endereco || "—");
    $("#cepEmpresa")      && ($("#cepEmpresa").textContent = perfil.cep || "—");

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

    const progresso = typeof perfil.progresso === "number" ? perfil.progresso : calcProgressoEmpresaFront(perfil);
    setProgress(progresso);
    travarPublicacaoVaga(progresso);

    renderVagas(Array.isArray(vagas) ? vagas : []);

    const tituloVagas = document.querySelector(".titulo-vagas") || document.querySelector("#tituloVagas");
    if (tituloVagas) {
      if (modoPublico || !isSelf) tituloVagas.textContent = "Vagas da empresa";
      else tituloVagas.textContent = "Minhas vagas";
    }
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

    if (modoPublico) {
      $("#btnEditar") && ($("#btnEditar").hidden = true);
      $("#btnGerenciar") && ($("#btnGerenciar").hidden = true);
      $("#btnPublicar") && ($("#btnPublicar").hidden = true);
    }
  }catch(e){
    console.error("Erro ao carregar perfil:", e);
  }
}

$("#formEdicao")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!token || !isSelf || modoPublico) return;

  const rawUsuario = $("#editUsuario")?.value || "";
  const usuario = rawUsuario.trim().replace(/^@+/, "").toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9._-]/g, "");

  const tags =
    $("#editTags")?._chips?.value ??
    ($("#editTags")?.value || "").split(",").map(s => s.trim()).filter(Boolean);

  const body = {
    razao_social: $("#editRazaoSocial")?.value,
    usuario: usuario || null,
    descricao: $("#editDescricao")?.value,
    tags: [...new Set(tags)],
    emailcontato: $("#editEmailContato")?.value || null,
    telefonecontato: ($("#editTelefoneContato")?.value || "").replace(/\D/g, "")
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

async function uploadImagem(tipo) {
  if (!isSelf || modoPublico) return;
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

$("#formDenuncia")?.addEventListener("submit", (e) => {
  e.preventDefault();
  popupDenuncia?.setAttribute("aria-hidden", "true");
  popupDenunciaOk?.setAttribute("aria-hidden", "false");
});

document.addEventListener("DOMContentLoaded", carregarPerfilEmpresa);

/* ================== AVALIAÇÕES (resumo no card + popup paginado) ================== */
(function(){
  const card    = document.getElementById("cardAvaliacoes");
  const resumo  = document.getElementById("resumoAvaliacao");
  const popup   = document.getElementById("popupFeedbacks");
  const lista   = document.getElementById("listaFeedbacks");
  const btnMais = document.getElementById("btnMaisFeedbacks");
  if (!card || !resumo) return;

  const headersAuth = modoPublico ? {} : { Authorization: `Bearer ${token}` };
  const defaultMiniAvatar = "img/default-avatar.jpg";

  const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return "—"; } };
  const stars = (n) => {
    n = Math.max(0, Math.min(5, Number(n)||0));
    const f = "★".repeat(Math.round(n));
    const e = "☆".repeat(5 - Math.round(n));
    return `<span class="stars" aria-label="Nota ${n}/5" title="${n.toFixed(2)}">${f}${e}</span>`;
  };

  // --- helpers mini-perfil (avatar/nome + normalização de imagem)
  const getNomeVol = (v) => (v?.nome || v?.usuario || "Voluntário");
  const getAvatarVol = (v) => {
    const src = v?.fotoUrl || v?.foto || v?.avatarUrl || "";
    return (src && String(src).trim()) ? src : defaultMiniAvatar;
  };
  const normImg = (src) => {
    if (!src) return src;
    return (src.startsWith("/uploads/") || src.startsWith("uploads/"))
      ? (src.startsWith("/") ? src : `/${src}`)
      : src;
  };

  async function carregarResumo(){
    try{
      if (!viewedId) throw new Error("Empresa não encontrada.");
      const r = await fetch(`/api/empresas/${encodeURIComponent(viewedId)}/avaliacoes/summary`, { headers: headersAuth });
      if (!r.ok) {
        resumo.innerHTML = `<p style="color:#ef4444">Falha ao carregar (HTTP ${r.status})</p>`;
        return;
      }
      const { total=0, media=0, porEstrela={}, recentes=[] } = await r.json();

      const barras = [5,4,3,2,1].map(s=>{
        const q = Number(porEstrela[s] || 0);
        const pct = total ? Math.round((q/total)*100) : 0;
        return `
          <div class="row" style="align-items:center;gap:8px">
            <span style="width:22px">${s}★</span>
            <div style="flex:1;height:8px;background:#e5e7eb;border-radius:999px;overflow:hidden">
              <div style="height:8px;width:${pct}%;background:#fbbf24"></div>
            </div>
            <span style="width:34px;text-align:right">${q}</span>
          </div>`;
      }).join("");

      // === versão nova com mini-perfil + "Participou da vaga: <titulo>" ===
      const recentesHtml = (recentes||[]).map(av => {
        const vol    = av?.voluntario || {};
        const foto   = getAvatarVol(vol);
        const nome   = getNomeVol(vol);
        const titulo = av?.vaga?.titulo ? av.vaga.titulo : "";

        return `
          <div class="mini-avl" style="margin-top:10px">
            <!-- mini perfil -->
            <div class="mini-head" style="display:flex;align-items:center;gap:10px">
              <img src="${foto}" alt="" class="mini-avatar"
                   style="width:36px;height:36px;border-radius:50%;object-fit:cover"
                   onerror="this.src='${defaultMiniAvatar}'">
              <div class="mini-id" style="min-width:0">
                <div class="mini-name" style="font-weight:600;line-height:1.1">${nome}</div>
                ${titulo ? `<div class="mini-sub" style="color:#6b7280;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Participou da vaga: ${titulo}</div>` : ""}
              </div>
            </div>

            <!-- linha estrelas + data -->
            <div class="mini-meta" style="display:flex;justify-content:space-between;align-items:center;margin:6px 0 4px">
              <span class="mini-stars">${stars(av.nota)}</span>
              <span class="mini-date" style="color:#6b7280;font-size:12px">${fmtDate(av.createdAt)}</span>
            </div>

            <!-- comentário -->
            <div class="mini-text" style="font-size:14px;color:#374151">
              ${(av.comentario||"").trim() || "<i>Sem comentário</i>"}
            </div>

            ${av?.resposta ? `
              <div class="mini-reply" style="margin-top:8px;padding:8px;border-radius:10px;background:#f3f4f6">
                <div style="font-size:12px;color:#6b7280;margin-bottom:4px">Resposta da empresa • ${fmtDate(av.resposta.createdAt)}</div>
                <div>${av.resposta.mensagem}</div>
              </div>` : ""}
          </div>
        `;
      }).join("");

      resumo.innerHTML = `
        <div class="row" style="justify-content:space-between;align-items:center">
          <div>${stars(media)} <span style="margin-left:6px;color:#6b7280">(${total})</span></div>
          <button class="chip" id="btnAbrirFeedbacks" type="button">Ver todos</button>
        </div>
        <div class="bars" style="margin:10px 0 6px">${barras}</div>
        ${recentes?.length ? `<div class="recentes">${recentesHtml}</div>` : `<p style="color:#6b7280">Ainda não há avaliações.</p>`}
      `;

      document.getElementById("btnAbrirFeedbacks")?.addEventListener("click", () => {
        openPopup(popup);
        resetLista();
        carregarMais();
      });

      card.addEventListener("click", (e)=>{
        if (e.target.closest("button,a")) return;
        openPopup(popup);
        resetLista();
        carregarMais();
      });
    }catch(err){
      console.error(err);
      resumo.innerHTML = `<p style="color:#ef4444">Erro ao carregar avaliações.</p>`;
    }
  }

  // ---- popup lista paginada
  const state = { page: 1, pageSize: 10, loading:false, ended:false };
  function resetLista(){
    lista.innerHTML = "";
    state.page = 1; state.ended = false; state.loading = false;
    if (btnMais) { btnMais.disabled = false; btnMais.textContent = "Carregar mais"; }
  }

  // mini-perfil no item detalhado + "Participou da vaga"
  const itemHtml = (av) => {
    const vol    = av?.voluntario || {};
    const nome   = getNomeVol(vol);
    const avatar = getAvatarVol(vol);
    const titulo = av?.vaga?.titulo ? av.vaga.titulo : "";
    const fotos  = Array.isArray(av?.fotos) ? av.fotos : [];

    return `
      <article class="feedback-card" style="border-top:1px solid #e5e7eb;padding:12px 0">
        <!-- mini perfil -->
        <div class="mini-head" style="display:flex;align-items:center;gap:10px">
          <img src="${avatar}" alt="" class="mini-avatar"
               style="width:38px;height:38px;border-radius:50%;object-fit:cover"
               onerror="this.src='${defaultMiniAvatar}'">
          <div class="mini-id" style="min-width:0">
            <div class="mini-name" style="font-weight:600;line-height:1.1">${nome}</div>
            ${titulo ? `<div class="mini-sub" style="color:#6b7280;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Participou da vaga: ${titulo}</div>` : ""}
          </div>
        </div>

        <!-- estrelas à esquerda • data à direita -->
        <div class="mini-meta" style="display:flex;justify-content:space-between;align-items:center;margin:8px 0 6px">
          <span class="mini-stars">${stars(av.nota)}</span>
          <span class="mini-date" style="color:#6b7280;font-size:12px">${fmtDate(av.createdAt)}</span>
        </div>

        <!-- comentário -->
        <div class="mini-text" style="font-size:14px;color:#374151">
          ${(av.comentario||"").trim() || "<i>Sem comentário</i>"}
        </div>

        ${fotos.length ? `
          <div class="photos" style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
            ${fotos.map(s => `<img src="${normImg(s)}" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:10px" onerror="this.remove()">`).join("")}
          </div>` : ""}

        ${av?.resposta ? `
          <div class="mini-reply" style="margin-top:10px;padding:10px;border-radius:12px;background:#f3f4f6">
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px">Resposta da empresa • ${fmtDate(av.resposta.createdAt)}</div>
            <div>${av.resposta.mensagem}</div>
          </div>` : ""}
      </article>`;
  };

  async function carregarMais(){
    if (state.loading || state.ended || !viewedId) return;
    state.loading = true;
    if (btnMais) { btnMais.disabled = true; btnMais.textContent = "Carregando…"; }

    try{
      const url = `/api/empresas/${encodeURIComponent(viewedId)}/avaliacoes?page=${state.page}&pageSize=${state.pageSize}`;
      const r = await fetch(url, { headers: headersAuth });
      if (!r.ok) {
        lista.insertAdjacentHTML("beforeend", `<p style="color:#ef4444">Falha ao carregar (HTTP ${r.status}).</p>`);
        state.ended = true;
        return;
      }
      const data  = await r.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const total = Number(data?.total || 0);
      const page  = Number(data?.page  || state.page);
      const size  = Number(data?.pageSize || state.pageSize);

      if (page === 1 && total === 0) {
        lista.innerHTML = `<p style="color:#6b7280">Ainda não há avaliações.</p>`;
        state.ended = true;
        return;
      }

      if (items.length) {
        lista.insertAdjacentHTML("beforeend", items.map(itemHtml).join(""));
      }

      const last = page * size;
      if (last >= total || items.length < size) {
        state.ended = true;
        if (btnMais) { btnMais.disabled = true; btnMais.textContent = "Fim"; }
      } else {
        state.page = page + 1;
        if (btnMais) { btnMais.disabled = false; btnMais.textContent = "Carregar mais"; }
      }
    } catch (err){
      console.error(err);
      lista.insertAdjacentHTML("beforeend", `<p style="color:#ef4444">Erro ao carregar.</p>`);
      state.ended = true;
    } finally {
      state.loading = false;
    }
  }

  btnMais?.addEventListener("click", carregarMais);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", carregarResumo);
  } else {
    carregarResumo();
  }
})();