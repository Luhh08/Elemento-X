const API = location.origin.includes(":3000") ? "/api" : "http://localhost:3000/api";

async function resolveVagaEditEndpoints(vagaId, empresaId, token){
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const candidates = [
    `${API}/vagas/${encodeURIComponent(vagaId)}`,                                
    `${API}/empresas/${encodeURIComponent(empresaId)}/vagas/${encodeURIComponent(vagaId)}` 
  ];

  for (const url of candidates) {
    try {
      const r = await fetch(url, { method: "GET", headers });
      if (r.ok) return { get: url, put: url }; 
    } catch {}
  }
  return { get: candidates[0], put: candidates[0], fallback: candidates[1] };
}


// ===== helpers / refs =====
const $ = (s) => document.querySelector(s);

const el = {
  nome: $("#nomeProjeto"),
  desc: $("#descricao"),
  tags: $("#tags"),
  local: $("#localizacao"),
  dataInicio: $("#dataInicio"),
  dataFim: $("#dataFim"),
  status: $("#status"),
  fotoBtn: $("#fotoPlaceholder"),
  fotoInput: $("#fotoInput"),
  salvar: $("#salvarBtn"),
  previewFrame: document.getElementById("vagaPreviewFrame"),
  thumbs: document.getElementById("thumbs"),
};

const qs = new URLSearchParams(location.search);
const VAGA_ID = qs.get("id");
const IS_EDIT = Boolean(VAGA_ID);

const MAX_FOTOS = 8;

// ===== turnos =====
function getTurnos() {
  return [...document.querySelectorAll('input[name="turno[]"]:checked')].map(cb => cb.value);
}

// ===== textarea autosize =====
function autosizeTextArea(ta) {
  const resize = () => {
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  };
  ["input", "change"].forEach(ev => ta.addEventListener(ev, resize));
  resize();
}
if (el.desc) autosizeTextArea(el.desc);

// ===== imagens (estado) =====
let fotosSelecionadas = [];   // Files novos
let imagensExistentes = [];   // URLs que já estavam salvas

// file -> dataURL
function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// evita duplicadas + limite
function dedupePush(files) {
  const key = f => `${f.name}|${f.size}|${f.lastModified}`;
  const set = new Set(fotosSelecionadas.map(key));
  for (const f of files) {
    const k = key(f);
    if (!set.has(k)) { fotosSelecionadas.push(f); set.add(k); }
    if (fotosSelecionadas.length >= MAX_FOTOS) break;
  }
}

// miniaturas (mistura existentes + novas)
function renderThumbs() {
  if (!el.thumbs) return;

  fotosSelecionadas = fotosSelecionadas.filter(f => f && f instanceof File && /^image\//.test(f.type));
  el.thumbs.innerHTML = "";

  // existentes (URL)
  imagensExistentes.forEach((url, idx) => {
    const card = document.createElement("div");
    card.className = "thumb";
    card.innerHTML = `
      <img src="${url}" alt="imagem existente ${idx+1}">
      <button type="button" class="rm" data-type="remote" data-idx="${idx}" aria-label="Remover imagem existente">×</button>
    `;
    el.thumbs.appendChild(card);
  });

  // novas (File)
  fotosSelecionadas.forEach((file, idx) => {
    const blobUrl = URL.createObjectURL(file);
    const card = document.createElement("div");
    card.className = "thumb";
    card.innerHTML = `
      <img src="${blobUrl}" alt="imagem nova ${idx+1}">
      <button type="button" class="rm" data-type="local" data-idx="${idx}" aria-label="Remover imagem nova">×</button>
    `;
    card.querySelector("img").addEventListener("load", () => URL.revokeObjectURL(blobUrl));
    el.thumbs.appendChild(card);
  });

  // remover
  el.thumbs.querySelectorAll(".rm").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const type = e.currentTarget.dataset.type;
      const i = Number(e.currentTarget.dataset.idx);
      if (type === "remote") imagensExistentes.splice(i, 1);
      else fotosSelecionadas.splice(i, 1);
      renderThumbs();
      postPreview();
    });
  });
}

// abrir seletor
el.fotoBtn?.addEventListener("click", ()=> el.fotoInput?.click());
el.fotoInput?.addEventListener("change", (e)=>{
  const novos = Array.from(e.target.files || []).filter(f => f && f.type.startsWith("image/"));
  if (!novos.length) return;
  const resto = MAX_FOTOS - fotosSelecionadas.length;
  dedupePush(novos.slice(0, resto));
  el.fotoInput.value = "";
  renderThumbs();
  postPreview();
});

// drag & drop
["dragenter","dragover","dragleave","drop"].forEach(ev=>{
  el.fotoBtn?.addEventListener(ev, (e)=>{ e.preventDefault(); e.stopPropagation(); });
});
el.fotoBtn?.addEventListener("drop", (e)=>{
  const files = Array.from(e.dataTransfer.files || []).filter(f=>f.type.startsWith("image/"));
  const resto = MAX_FOTOS - fotosSelecionadas.length;
  dedupePush(files.slice(0, resto));
  renderThumbs();
  postPreview();
});

// ===== preview (envia para descricao_vagas.html?live=1) =====
async function buildPreviewPayload(){
  const novas = await Promise.all(fotosSelecionadas.map(fileToDataURL));
  const imagens = [...imagensExistentes, ...novas];

  return {
    titulo: el.nome?.value?.trim() || "Nome do projeto",
    empresa: localStorage.getItem("empresa_nome") || "Minha empresa",
    descricao: el.desc?.value?.trim() || "",
    tags: (el.tags?.value||"").split(",").map(s=>s.trim()).filter(Boolean),
    local: el.local?.value?.trim() || "",
    turno: getTurnos().join(", "),
    dataInicio: el.dataInicio?.value || null,
    dataFim: el.dataFim?.value || null,
    status: el.status?.value || "ABERTA",
    imagens
  };
}

async function postPreview(){
  if (!el.previewFrame || !el.previewFrame.contentWindow) return;
  const payload = await buildPreviewPayload();
  el.previewFrame.contentWindow.postMessage({ type:"VAGA_PREVIEW", payload }, "*");
}

// listeners para atualizar preview
["input","change","keyup"].forEach(ev=>{
  [el.nome, el.desc, el.tags, el.local, el.dataInicio, el.dataFim, el.status]
    .forEach(cmp => cmp && cmp.addEventListener(ev, postPreview));
});
document.querySelectorAll('input[name="turno[]"]').forEach(cb => cb.addEventListener("change", postPreview));
el.previewFrame?.addEventListener("load", postPreview);

// ===== carregar dados da vaga (modo edição) =====
async function loadVagaParaEdicao(){
  if (!VAGA_ID) { renderThumbs(); postPreview(); return; }

  try{
    const token = localStorage.getItem("token");
    const empresaId = localStorage.getItem("userId");

    const ep = await resolveVagaEditEndpoints(VAGA_ID, empresaId, token);
    const res = await fetch(ep.get, { headers: { "Content-Type":"application/json", Authorization: `Bearer ${token}` }});
    if (!res.ok) throw new Error(`Não foi possível carregar a vaga (HTTP ${res.status})`);
    const v = await res.json();

    // ... (preenchimento igual você já faz)
    // campos básicos:
    if (el.nome)  el.nome.value  = v.titulo || v.nome || "";
    if (el.desc)  el.desc.value  = v.descricao || "";
    if (el.local) el.local.value = v.local || v.localizacao || "";
    if (el.status) el.status.value = v.status || "ABERTA";

    // turnos
    const turnos = Array.isArray(v.turno) ? v.turno : (v.turno ? String(v.turno).split(",").map(s=>s.trim()) : []);
    document.querySelectorAll('input[name="turno[]"]').forEach(cb => cb.checked = turnos.includes(cb.value));

    // datas
    if (el.dataInicio && v.dataInicio) el.dataInicio.value = new Date(v.dataInicio).toISOString().slice(0,10);
    if (el.dataFim && v.dataFim)       el.dataFim.value    = new Date(v.dataFim).toISOString().slice(0,10);

    // tags
    const tags = Array.isArray(v.tags) ? v.tags : (v.tags ? String(v.tags).split(",").map(s=>s.trim()) : []);
    if (el.tags) el.tags.value = tags.join(", ");

    // imagens
    let imgs = [];
    if (Array.isArray(v.imagens)) imgs = v.imagens;
    else if (typeof v.imagens === "string") {
      try { const p = JSON.parse(v.imagens); imgs = Array.isArray(p) ? p : (p ? [p] : []); } catch { imgs = v.imagens ? [v.imagens] : []; }
    }
    if (v.capaUrl && !imgs.length) imgs = [v.capaUrl];
    imagensExistentes = imgs.filter(Boolean);

    // marca UI de edição
    document.title = "Editar Vaga • Voluntary";
    if (el.salvar) el.salvar.textContent = "Salvar alterações";

    // guarda endpoint de PUT escolhido
    el._PUT_ENDPOINT = ep.put;
    el._PUT_FALLBACK = ep.fallback;

    renderThumbs();
    postPreview();
  }catch(err){
    console.error(err);
    alert(err.message || "Erro ao carregar dados da vaga.");
    renderThumbs();
    postPreview();
  }
}

renderThumbs();
postPreview();
loadVagaParaEdicao();

el.salvar?.addEventListener("click", async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token");
  const empresaId = localStorage.getItem("userId");

  const fd = new FormData();
  fd.append("titulo", el.nome?.value?.trim() || "");
  fd.append("descricao", el.desc?.value?.trim() || "");
  (el.tags?.value || "").split(",").map(s=>s.trim()).filter(Boolean).forEach(t => fd.append("tags", t));
  getTurnos().forEach(t => fd.append("turno", t));
  if (el.local?.value)      fd.append("local", el.local.value.trim());
  if (el.dataInicio?.value) fd.append("dataInicio", new Date(el.dataInicio.value).toISOString());
  if (el.dataFim?.value)    fd.append("dataFim", new Date(el.dataFim.value).toISOString());
  if (el.status?.value)     fd.append("status", el.status.value);
  fotosSelecionadas.forEach(file => fd.append("imagens", file));
  imagensExistentes.forEach(u => fd.append("imagens_existentes", u));

  try {
    let url, method;

    if (VAGA_ID) {
      // edição
      url = el._PUT_ENDPOINT || `${API}/vagas/${encodeURIComponent(VAGA_ID)}`;
      method = "PUT";

      let resp = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (resp.status === 404 && el._PUT_FALLBACK) {
        // tenta o outro padrão
        url = el._PUT_FALLBACK;
        resp = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
      }

      const json = await resp.json().catch(()=> ({}));
      if (!resp.ok) throw new Error(json?.error || `Erro ao atualizar vaga (HTTP ${resp.status})`);

      alert("✅ Vaga atualizada!");
      location.href = `/descricao_vagas.html?id=${encodeURIComponent(VAGA_ID)}`;

    } else {
      // criação
      url = `${API}/empresas/${encodeURIComponent(empresaId)}/vagas`;
      method = "POST";
      const resp = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
      const json = await resp.json().catch(()=> ({}));
      if (!resp.ok) throw new Error(json?.error || `Erro ao criar vaga (HTTP ${resp.status})`);
      const novoId = json.id || json._id;
      alert("✅ Vaga criada!");
      location.href = `/descricao_vagas.html?id=${encodeURIComponent(novoId)}`; // já abre em edição
    }
  } catch (err) {
    console.error(err);
    alert("❌ " + (err.message || "Falha ao salvar a vaga."));
  }
});

