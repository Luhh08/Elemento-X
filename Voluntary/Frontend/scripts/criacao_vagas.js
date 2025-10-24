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
const IS_EDIT = qs.get("modo") === "editar";
const VAGA_ID = qs.get("id");

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
  if (!IS_EDIT || !VAGA_ID) { renderThumbs(); postPreview(); return; }

  try{
    const resp = await fetch(`/api/vagas/${encodeURIComponent(VAGA_ID)}`);
    if (!resp.ok) throw new Error("Não foi possível carregar a vaga.");
    const v = await resp.json();

    // campos
    if (el.nome)  el.nome.value  = v.titulo || "";
    if (el.desc)  el.desc.value  = v.descricao || "";
    if (el.local) el.local.value = v.local || "";
    if (el.status) el.status.value = v.status || "ABERTA";

    // turnos (array ou string)
    const turnos = Array.isArray(v.turno) ? v.turno :
                   (v.turno ? String(v.turno).split(",").map(s=>s.trim()) : []);
    document.querySelectorAll('input[name="turno[]"]').forEach(cb => {
      cb.checked = turnos.includes(cb.value);
    });

    // datas
    if (el.dataInicio && v.dataInicio){
      el.dataInicio.value = new Date(v.dataInicio).toISOString().slice(0,10);
    }
    if (el.dataFim && v.dataFim){
      el.dataFim.value = new Date(v.dataFim).toISOString().slice(0,10);
    }

    // tags
    const tags = Array.isArray(v.tags) ? v.tags :
                 (v.tags ? String(v.tags).split(",").map(s=>s.trim()) : []);
    if (el.tags) el.tags.value = tags.join(", ");

    // imagens existentes normalizadas
    let imgs = [];
    if (Array.isArray(v.imagens)) imgs = v.imagens;
    else if (typeof v.imagens === "string") {
      try { const p = JSON.parse(v.imagens); imgs = Array.isArray(p) ? p : (p ? [p] : []); }
      catch { imgs = v.imagens ? [v.imagens] : []; }
    }
    if (v.capaUrl && !imgs.length) imgs = [v.capaUrl];

    imagensExistentes = imgs.filter(Boolean);

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

// ===== salvar (POST novo / PUT editar) =====
el.salvar?.addEventListener("click", async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token");
  const empresaId = localStorage.getItem("userId");

  const fd = new FormData();
  fd.append("titulo", el.nome?.value?.trim() || "");
  fd.append("descricao", el.desc?.value?.trim() || "");

  (el.tags?.value || "")
    .split(",").map(s=>s.trim()).filter(Boolean)
    .forEach(t => fd.append("tags", t));

  getTurnos().forEach(t => fd.append("turno", t));

  if (el.local?.value)      fd.append("local", el.local.value.trim());
  if (el.dataInicio?.value) fd.append("dataInicio", new Date(el.dataInicio.value).toISOString());
  if (el.dataFim?.value)    fd.append("dataFim", new Date(el.dataFim.value).toISOString());
  if (el.status?.value)     fd.append("status", el.status.value);

  // novas (Files)
  fotosSelecionadas.forEach(file => fd.append("imagens", file));

  // existentes mantidas (URLs)
  imagensExistentes.forEach(u => fd.append("imagens_existentes", u));

  try {
    const url = IS_EDIT && VAGA_ID
      ? `/api/vagas/${encodeURIComponent(VAGA_ID)}`
      : `/api/empresas/${empresaId}/vagas`;

    const method = IS_EDIT && VAGA_ID ? "PUT" : "POST";

    const resp = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` }, // não setar Content-Type com FormData
      body: fd,
    });

    const json = await resp.json().catch(()=> ({}));
    if (!resp.ok) {
      if (resp.status === 403 && json?.error) {
        alert(`❌ ${json.error}${typeof json.progressoAtual === "number" ? ` (progresso: ${json.progressoAtual}%)` : ""}`);
        return;
      }
      throw new Error(json?.error || `Erro ao ${IS_EDIT ? "atualizar" : "criar"} vaga.`);
    }

    alert(`✅ Vaga ${IS_EDIT ? "atualizada" : "criada"}!`);
    const idFinal = IS_EDIT ? VAGA_ID : (json?.id || json?._id);
    location.href = `descricao_vagas.html?id=${encodeURIComponent(idFinal)}`;
  } catch (err) {
    console.error(err);
    alert("❌ " + (err.message || "Falha ao salvar a vaga."));
  }
});
