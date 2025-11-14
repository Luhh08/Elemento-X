// ========= helpers =========
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
function esc(t){ return String(t ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }

console.log("✓ perfil.js carregado");

// ---- normalizador de caminhos de upload + extratores de URL ----

// Tenta extrair uma URL de vários formatos (string, objeto, arrays, etc.)
function pickUrl(x){
  if(!x) return "";
  if(typeof x === "string") return x.trim();
  if(Array.isArray(x)){
    for(const it of x){
      const u = pickUrl(it);
      if(u) return u;
    }
    return "";
  }
  if(typeof x === "object"){
    return String(
      x.url || x.src || x.path || x.capaUrl || x.banner || x.cover || x.thumb || ""
    ).trim();
  }
  return "";
}
function firstImage(imagens){
  if(!imagens) return "";
  if(Array.isArray(imagens)) return pickUrl(imagens);

  if(typeof imagens === "string"){
    try{ // tenta JSON
      const j = JSON.parse(imagens);
      const u = pickUrl(j);
      if(u) return u;
    }catch(_){ /* não era JSON */ }

    // tenta CSV/espacado
    const parts = imagens.split(/[,\s]+/).map(s=>s.trim()).filter(Boolean);
    return parts[0] || imagens.trim();
  }

  if(typeof imagens === "object") return pickUrl(imagens);

  return "";
}

function toUploadUrl(src){
  if(!src) return "";
  let s = String(src).trim().replace(/\\/g,"/");

  // evita cair em "[object Object]"
  if(s === "[object Object]") return "";

  // http(s) ou data:
  if(/^https?:|^data:/i.test(s)) return s;

  // remover prefixos comuns
  s = s.replace(/^\/?api\/(?=uploads\/)/i, "");     // tira "api/"
  s = s.replace(/\/?backend\/(?=uploads\/)/i, "");  // tira "backend/"

  // já aponta para uploads -> preferir /api/uploads/...
  if(/^\/?uploads\//i.test(s)){
    s = s.replace(/^\/?/,"");
    return "/api/"+s; // -> "/api/uploads/..."
  }

  // veio só o nome do arquivo (sem barra): vira /api/uploads/arquivo.jpg
  if(!s.includes("/") && /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(s)){
    return "/api/uploads/"+s;
  }

  // mantém relativo se for um caminho custom
  return s;
}

const DEFAULT_COMPANY_IMG = "img/default-company.png"; // troque se este arquivo não existir
const HIST_DEFAULT_IMG    = "img/default-banner.png";

function companyLogoThumb(src){
  const u = toUploadUrl(src);
  return u || DEFAULT_COMPANY_IMG;
}

// Resolve a capa da vaga com vários candidatos de campos diferentes
function resolveCapaFromVaga(v = {}){
  const candidates = [
    v._thumb,
    v.capaUrl, v.capa, v.cover, v.banner, v.thumb,
    firstImage(v.imagens)
  ];
  let raw = candidates.find(Boolean) || "";
  const norm = toUploadUrl(raw);
  return norm || HIST_DEFAULT_IMG;
}

// ========= sessão / página =========
// (definimos aqui para evitar duplicidades em outras partes do arquivo)
const token  = localStorage.getItem("token");      // opcional
const userId = localStorage.getItem("userId");     // opcional
const params   = new URLSearchParams(location.search);
const viewedId = params.get("id") || userId;       // permite público via ?id=
const isSelf   = userId && viewedId === userId;

console.log("📊 Variáveis globais inicializadas:");
console.log("   token=", !!token);
console.log("   userId=", userId);
console.log("   params.get('id')=", params.get("id"));
console.log("   viewedId=", viewedId);
console.log("   isSelf=", isSelf);

if(!params.get("id") && viewedId){
  history.replaceState(null,"",`${location.pathname}?id=${encodeURIComponent(viewedId)}`);
}

setupSidebarForViewer();

// ========= mapeamentos de status =========
function mapCandidaturaStatus(s){
  const v = String(s||"").toUpperCase();
  switch(v){
    case "ACEITA":   return { text:"Inscrição aceita",   cls:"status-participando" };
    case "RECUSADA":
    case "RECUSADO": return { text:"Inscrição recusada", cls:"status-finalizado" };
    case "INSCRITA":
    default:         return { text:"Inscrição em análise", cls:"status-inscrita" };
  }
}

function setupSidebarForViewer(){
  try{
    const tipo = (localStorage.getItem("tipoConta") || localStorage.getItem("role") || "").toLowerCase();
    const viewerIsEmpresa = tipo.includes("empresa");
    if(!viewerIsEmpresa) return; // já é versão usuário por padrão

    const menu = document.querySelector(".sidebar .menu");
    if(menu){
      menu.innerHTML = `
        <a class="pill" href="pesquisar-volutarios.html">
          <i class="ri-search-line"></i> Procurar Voluntarios
        </a>
        <div class="notification-wrapper">
          <button type="button" class="pill" data-open-notifications>
            <i class="ri-notification-3-line"></i>
            Notificações
            <span class="notification-count"></span>
          </button>
          <div class="notif-panel">
            <div class="notif-header">Notificações</div>
            <p class="notif-empty">Carregando...</p>
          </div>
        </div>
        <a class="pill pill-accent" href="gerenciar_aplicacoes.html">
          <i class="ri-key-2-line"></i> Aplicações
        </a>
      `;
    }
    const logout = document.querySelector(".pill-logout");
    if(logout) logout.href = "login_empresa.html";
  }catch(err){
    console.warn("Falha ao ajustar sidebar do perfil para o visitante:", err);
  }
}

function decideRowUI(item, vagaId, vagaStatus, linkVaga){
  const vs = String(vagaStatus||"").toUpperCase();

  if (vs === "FINALIZADA") {
    return {
      chipText:  "Finalizado",
      chipClass: "status-finalizado",
      btnHtml:   `<a class="chip primary" href="avaliacao.html?vaga=${encodeURIComponent(vagaId||"")}">Avaliar</a>`
    };
  }

  if (vs === "ANDAMENTO") {
    return {
      chipText:  "Projeto em andamento",
      chipClass: "status-participando",
      btnHtml:   `<a class="chip outline chip-link" href="${linkVaga}">Ver detalhes</a>`
    };
  }

  const { text, cls } = mapCandidaturaStatus(item.status);
  const cand = String(item.status||"").toUpperCase();
  const showDetails = (cand === "ACEITA"); 
  return {
    chipText:  text,
    chipClass: cls,
    btnHtml:   showDetails ? `<a class="chip outline chip-link" href="${linkVaga}">Ver detalhes</a>` : ""
  };
}

// ========= histórico de candidaturas =========
const historicoContainer = $("#historicoContainer");

// handler de fallback sem usar onerror inline (funciona com CSP)
function attachImgFallbacks(root=document){
  root.querySelectorAll('img[data-fallback="step0"]').forEach(img=>{
    const once = (fn)=>{ let ran=false; return function(...a){ if(!ran){ ran=true; fn.apply(this,a); } }; };
    const handler = once(function(){
      const s = img.currentSrc || img.src || "";
      if (/\/api\/uploads\//.test(s)) {
        img.src = s.replace("/api/uploads/","/uploads/");
      } else if (/\/uploads\//.test(s)) {
        img.src = "/api" + s.replace(/^\/+/, "/");
      } else {
        img.src = HIST_DEFAULT_IMG;
      }
      img.addEventListener('error', ()=>{ img.src = HIST_DEFAULT_IMG; }, { once:true });
    });
    img.addEventListener('error', handler, { once:true });
  });
}

function historicoCard(item){
  const v        = item.vaga || {};
  const vagaId   = v.id;
  const titulo   = v.titulo || "Vaga";
  const capaUrl  = v._thumb || resolveCapaFromVaga(v);
  const linkVaga = vagaId ? `descricao_vagas.html?id=${encodeURIComponent(vagaId)}` : "#";
  const status   = String(item.status || "").toUpperCase();
  const rejectionReason = status === "RECUSADA" ? (item.motivoRecusa || "").trim() : "";
  const rejectionHtml = rejectionReason ? esc(rejectionReason).replace(/\n/g,"<br>") : "";

  const emp         = v.empresa || {};
  const empresaId   = emp.id || v.empresaId || null;
  const empresaNome = (emp.razao_social || v.empresaNome || "").trim();
  const empresaLogo = companyLogoThumb(emp.logoUrl || v.empresaLogoUrl);
  const showEmpresa = Boolean(empresaId || empresaNome);

  // se o visitante não for empresa logada, abrimos perfil-empresa em modo público
  const viewerRole   = (localStorage.getItem("tipoConta") || localStorage.getItem("role") || "").toLowerCase();
  const viewerToken  = localStorage.getItem("token");
  const needsPublic  = !viewerToken || !viewerRole.includes("empresa");
  const linkEmpresa  = empresaId
    ? `perfil-empresa.html?id=${encodeURIComponent(empresaId)}${needsPublic ? "&public=true" : ""}`
    : "#";

  // Chip + botão (considera status da VAGA e da CANDIDATURA)
  const row = decideRowUI(item, vagaId, v.status, linkVaga);

  return `
  <article class="vaga-card">
    <a href="${linkVaga}" class="thumb-wrap" style="display:block">
      <img
        src="${esc(capaUrl)}"
        alt="${esc(titulo)}"
        data-fallback="step0"
      >
    </a>

    <div class="vaga-info">
      <p class="vaga-title">${esc(titulo)}</p>

      ${showEmpresa ? `
      <div class="empresa-mini">
        <a class="empresa-link" href="${linkEmpresa}">
          <img class="empresa-logo" src="${esc(empresaLogo)}" alt="${esc(empresaNome || 'Empresa')}"
               onerror="this.src='${DEFAULT_COMPANY_IMG}'">
          <span class="empresa-nome">${esc(empresaNome || "Empresa")}</span>
        </a>
      </div>` : ""}

      <div class="row hist-row">
        <span class="status ${row.chipClass}">${esc(row.chipText)}</span>
        ${row.btnHtml}
      </div>
      ${rejectionHtml ? `<div class="hist-reason"><strong>Motivo da recusa</strong>${rejectionHtml}</div>` : ""}
    </div>
  </article>`;
}

// Enriquecer itens sem empresa usando /api/empresas/:id e também fixar o _thumb
async function enrichWithEmpresaInfo(items){
  const cache = new Map();
  const need  = [];

  items.forEach(it=>{
    const v = it.vaga || {};
    const empId = v.empresa?.id || v.empresaId;
    if(empId && !cache.has(empId)){ cache.set(empId,null); need.push(empId); }
    // fixa a thumb (prioriza a função robusta)
    v._thumb = resolveCapaFromVaga(v);
  });

  await Promise.all(need.map(async id=>{
    try{
      const r = await fetch(`/api/empresas/${encodeURIComponent(id)}`);
      if(r.ok) cache.set(id, await r.json());
    }catch(_){}
  }));

  items.forEach(it=>{
    const v = it.vaga || {};
    const empId = v.empresa?.id || v.empresaId;
    const e = empId ? cache.get(empId) : null;
    if(e){
      v.empresa = {
        id: e.id,
        razao_social: e.razao_social || e.nome_fantasia || e.nome || "",
        logoUrl: e.logoUrl || e.logo || ""
      };
      v.empresaNome    = v.empresa.razao_social;
      v.empresaLogoUrl = v.empresa.logoUrl;
    }
    // reafirma a thumb caso as infos da empresa tenham trazido algo novo
    v._thumb = resolveCapaFromVaga(v);
  });
  return items;
}

function renderHistorico(items){
  if(!historicoContainer) return;
  historicoContainer.querySelectorAll(".vaga-card").forEach(el=>el.remove());

  const wrap = document.createElement("div");
  wrap.className = "hist-wrap";
  wrap.innerHTML = items.length
    ? items.map(historicoCard).join("")
    : `<p style="color:#64748b;margin-top:6px;">Nenhuma candidatura ainda.</p>`;
  historicoContainer.appendChild(wrap);

  // anexa fallback de imagem após inserir no DOM
  attachImgFallbacks(historicoContainer);
}

async function carregarHistoricoCandidaturas(){
  // histórico só quando logado
  if(!token){ renderHistorico([]); return; }

  try{
    const qs = new URLSearchParams();
    if(!isSelf) qs.set("usuarioId", viewedId); // se o back aceitar
    const res = await fetch(`/api/candidaturas${qs.toString() ? `?${qs}` : ""}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
    });
    if(res.status === 401){ renderHistorico([]); return; }
    if(!res.ok) throw new Error("Falha ao carregar candidaturas");

    const data = await res.json();
    const items = (data.items || []).map((it)=>({
      id: it.id,
      status: it.status || "INSCRITA",
      motivoRecusa: it.motivoRecusa || "",
      vaga: {
        id: it.vaga?.id,
        titulo: it.vaga?.titulo,
        status: it.vaga?.status,           // <- status da VAGA (para FINALIZADA)
        empresa: it.vaga?.empresa || null,
        empresaId: it.vaga?.empresaId,
        empresaNome: it.vaga?.empresaNome,
        empresaLogoUrl: it.vaga?.empresaLogoUrl,
        capaUrl: it.vaga?.capaUrl,
        imagens: it.vaga?.imagens
      }
    }));

    await enrichWithEmpresaInfo(items);
    renderHistorico(items);
  }catch(e){
    console.error("Erro ao carregar histórico:", e);
    renderHistorico([]);
  }
}

// ========= máscara/formatadores =========
function aplicarMascaraTelefone(input){
  if(!input) return;
  const fmt = (v)=>{
    v = (v||"").replace(/\D/g,"").slice(0,11);
    if(v.length<=10) return v.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/,(_,a,b,c)=>
      (a?`(${a}`:"")+(a&&a.length===2?") ":"")+(b||"")+(b&&b.length===4?"-":"")+(c||"")
    );
    return v.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*/,(_,a,b,c)=>
      (a?`(${a}`:"")+(a&&a.length===2?") ":"")+(b||"")+(b&&b.length===5?"-":"")+(c||"")
    );
  };
  const h = ()=>{ input.value = fmt(input.value); };
  ["input","blur","paste"].forEach(ev=>input.addEventListener(ev,h));
}

function formatTelefoneBR(v){
  const d = String(v||"").replace(/\D/g,"");
  if(!d) return "—";
  if(d.length<=10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/,"($1) $2-$3").replace(/-$/,"");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/,"($1) $2-$3").replace(/-$/,"");
}

// ========= chips de competências =========
let _tagsInicializado=false;
function initChipsCompetencias(){
  if(_tagsInicializado) return;
  const input = $("#editCompetencias");
  if(!input) return;

  const chips = document.createElement("div");
  chips.id = "chipsCompetencias";
  chips.className = "chips";
  input.insertAdjacentElement("afterend", chips);

  const tags = new Set();
  (input.value||"").split(",").map(s=>s.trim()).filter(Boolean).forEach(addTag);

  function sync(){ input.value = Array.from(tags).join(", "); }
  function chipDom(t){
    const el = document.createElement("span");
    el.className = "chip-pill";
    el.innerHTML = `<span class="chip-label">${esc(t)}</span><button class="remove" type="button" aria-label="Remover ${esc(t)}">×</button>`;
    el.querySelector(".remove").addEventListener("click",()=>removeTag(t));
    return el;
  }
  function addTag(t){ const x=(t||"").trim(); if(!x||tags.has(x)) return; tags.add(x); chips.appendChild(chipDom(x)); sync(); }
  function removeTag(t){ if(!tags.has(t)) return; tags.delete(t); [...chips.children].forEach(ch=>{ if(ch.querySelector(".chip-label")?.textContent===t) ch.remove(); }); sync(); }
  function commit(){ const raw=input.value; if(!raw.trim()) return; raw.split(",").map(s=>s.trim()).filter(Boolean).forEach(addTag); input.value=""; }

  input.addEventListener("keydown",(e)=>{
    if(["Enter",",","Tab"].includes(e.key)){ e.preventDefault(); commit(); }
    else if(e.key==="Backspace" && !input.value && tags.size){ const last=[...tags].pop(); removeTag(last); }
  });
  input.addEventListener("blur", commit);

  input._chips = { addTag, removeTag, get value(){ return [...tags]; } };
  _tagsInicializado = true;
}

// ========= popups / scroll lock =========
const popupEdicao    = $("#popupEdicao");
const popupDenuncia  = $("#popupDenuncia");
const popupDenunciaOk= $("#popupDenunciaOk");
const btnEditar    = $("#btnEditar");
const btnDenunciar = $("#btnDenunciar");

// mostra/oculta ações
if(btnEditar)    btnEditar.style.display   = isSelf ? "" : "none";
if(btnDenunciar) btnDenunciar.style.display= (userId && !isSelf) ? "" : "none";

let _scrollLock={ y:0, padRight:"" };
function lockScroll(){
  if(document.body.classList.contains("modal-open")) return;
  const sb=window.innerWidth-document.documentElement.clientWidth;
  _scrollLock.padRight=document.body.style.paddingRight;
  if(sb>0) document.body.style.paddingRight=`${sb}px`;
  _scrollLock.y=window.scrollY||document.documentElement.scrollTop||0;
  document.body.style.top=`-${_scrollLock.y}px`;
  document.body.classList.add("modal-open");
  document.body.style.position="fixed";
  document.body.style.width="100%";
}
function unlockScroll(){
  if(!document.body.classList.contains("modal-open")) return;
  document.body.classList.remove("modal-open");
  document.body.style.position="";
  document.body.style.top="";
  document.body.style.width="";
  document.body.style.paddingRight=_scrollLock.padRight||"";
  window.scrollTo(0,_scrollLock.y);
}
function anyModalOpen(){
  return [popupEdicao,popupDenuncia,popupDenunciaOk].some(p=>p && p.getAttribute("aria-hidden")==="false");
}
function openPopup(p){
  p?.setAttribute("aria-hidden","false");
  lockScroll();
}
function closeAllPopups(){
  [popupEdicao,popupDenuncia,popupDenunciaOk].forEach(p=>p?.setAttribute("aria-hidden","true"));
  if(!anyModalOpen()) unlockScroll();
}
$("#btnEditar")?.addEventListener("click", ()=>openPopup(popupEdicao));
$("#btnDenunciar")?.addEventListener("click", ()=>{
  if(!token){
    alert("Faça login para denunciar este usuário.");
    return;
  }
  openPopup(popupDenuncia);
});
$$("[data-close]")?.forEach((b)=>b.addEventListener("click", closeAllPopups));
document.addEventListener("keydown",(e)=>{ if(e.key==="Escape"&&anyModalOpen()) closeAllPopups(); });

// ========= imagens padrão do perfil =========
const defaultFoto   = "../img/default-avatar.jpg";
const defaultBanner = "../img/default-banner.png";

// ========= carregar perfil + histórico =========
async function carregarPerfil(){
  console.log("📌 carregarPerfil() INICIADA");
  console.log("   viewedId=", viewedId, "token=", !!token, "userId=", userId);
  
  if(!viewedId || viewedId === 'undefined') { 
    console.log("   ⚠ viewedId inválido, carregando histórico apenas");
    await carregarHistoricoCandidaturas(); 
    return; 
  } // nada a exibir no perfil, mas tenta histórico

  try{
    const headers = { };
    if(token) headers.Authorization = `Bearer ${token}`;  // usa se existir

    const url = `/api/usuario/${encodeURIComponent(viewedId)}`;
    console.log("   🔄 Fazendo fetch para:", url);
    const res = await fetch(url, { headers });
    console.log("   ✓ Response status:", res.status);
    
    if(!res.ok) {
      console.warn("   ❌ Perfil não encontrado ou sem acesso - Status:", res.status);
      const errorData = await res.json().catch(() => ({}));
      console.warn("   Erro do servidor:", errorData);
      await carregarHistoricoCandidaturas();
      return;
    }
    const data = await res.json();
    console.log("   ✓ Dados do perfil recebidos:", data);

    $("#nomeUsuario") && ($("#nomeUsuario").textContent      = data.nome || "");
    $("#usuarioTag") && ($("#usuarioTag").textContent       = data.usuario ? `@${data.usuario}` : "");
    $("#descricaoUsuario") && ($("#descricaoUsuario").textContent = data.descricao || "Este usuário ainda não adicionou uma descrição.");
    $("#bannerUsuario") && ($("#bannerUsuario").src = data.bannerUrl || defaultBanner);
    $("#fotoUsuario")   && ($("#fotoUsuario").src   = data.fotoUrl   || defaultFoto);
    $("#bannerPreview") && ($("#bannerPreview").src = data.bannerUrl || defaultBanner);
    $("#fotoPreview")   && ($("#fotoPreview").src   = data.fotoUrl   || defaultFoto);

    const tagsEl = $("#listaCompetencias");
    if(tagsEl){
      tagsEl.innerHTML="";
      (data.competencias||[]).forEach(t=>{
        const span=document.createElement("span");
        span.className="tag";
        span.textContent=t;
        tagsEl.appendChild(span);
      });
      const progressRow = document.querySelector(".progress-row");
      if(progressRow && !isSelf) progressRow.style.display="none";
    }

    const horarios = Array.isArray(data.preferenciaHorario) ? data.preferenciaHorario
                    : (data.preferenciaHorario ? [data.preferenciaHorario] : []);
    $("#turnoUsuario") && ($("#turnoUsuario").textContent = horarios.length ? horarios.join(", ") : "—");
    $("#emailContato") && ($("#emailContato").textContent = data.emailcontato || "—");
    $("#telefoneContato") && ($("#telefoneContato").textContent = formatTelefoneBR(data.telefonecontato));

    $("#editNome") && ($("#editNome").value  = data.nome || "");
    $("#editUsuario") && ($("#editUsuario").value = data.usuario || "");
    $("#editDescricao") && ($("#editDescricao").value = data.descricao || "");
    $("#editEmailContato") && ($("#editEmailContato").value = data.emailcontato || "");
    $("#editTelefoneContato") && ($("#editTelefoneContato").value = formatTelefoneBR(data.telefonecontato || ""));
    $("#editCompetencias") && ($("#editCompetencias").value = (data.competencias||[]).join(", "));

    aplicarMascaraTelefone($("#editTelefoneContato"));
    initChipsCompetencias();

    $$('input[name="disp[]"]').forEach(ch=>ch.checked=false);
    horarios.forEach(h=>{
      const cb=document.querySelector(`input[name="disp[]"][value="${h}"]`);
      if(cb) cb.checked=true;
    });

    atualizarBarraProgresso(data.progresso);
    const barra = document.querySelector(".progress-container, #barraProgresso");
    if(barra && !isSelf) barra.style.display="none";

  }catch(err){
    console.error("Erro ao carregar perfil:", err);
  }

  // histórico só se logado (a função já trata caso não haja token)
  await carregarHistoricoCandidaturas();
}

function atualizarBarraProgresso(valor){
  const p = Math.max(0, Math.min(100, Number(valor||0)));
  const barra = $("#barraProgresso");
  const label = $("#labelProgresso");
  if(barra) barra.style.width = `${p}%`;
  if(label) label.textContent = `${p}% completo`;
}

// ========= denúncia ==========
// (aproveita os mesmos popupDenuncia / popupDenunciaOk e closeAllPopups/openPopup acima)
const formDenuncia = $("#formDenuncia");
const motivoDenunciaInput = $("#motivoDenuncia");

// Enviar denúncia
if (formDenuncia) {
  formDenuncia.addEventListener("submit", async (e) => {
    e.preventDefault();
    const motivo = (motivoDenunciaInput?.value || "").trim();
    if (!motivo) {
      alert("Por favor, escreva o motivo da denúncia.");
      return;
    }

    const body = { tipo: "usuario", alvoId: viewedId || "", mensagem: motivo };
    const tokenLocal = localStorage.getItem("token") || "";
    if (!tokenLocal) {
      alert("Você precisa estar logado para enviar uma denúncia.");
      closeAllPopups();
      return;
    }
    try {
      const resp = await fetch("/api/denuncias", {
        method: "POST",
        headers: Object.assign(
          { "Content-Type": "application/json" },
          tokenLocal ? { Authorization: `Bearer ${tokenLocal}` } : {}
        ),
        body: JSON.stringify(body)
      });
      if (!resp.ok) throw new Error("Falha ao enviar denúncia.");
      // sucesso
      if (motivoDenunciaInput) motivoDenunciaInput.value = "";
      closeAllPopups();
      openPopup(popupDenunciaOk);
    } catch (err) {
      console.error("Erro ao enviar denúncia:", err);
      alert("Falha ao enviar denúncia. Tente novamente mais tarde.");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM pronto, carregando perfil do usuário...");
  carregarPerfil();
});
