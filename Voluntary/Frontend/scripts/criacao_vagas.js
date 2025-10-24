const $ = (s)=>document.querySelector(s);

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

  // 👇 NOVO: contêiner de miniaturas
  thumbs: document.getElementById("thumbs"),
};

const MAX_FOTOS = 8; // 👈 NOVO

// --- TURNOS (checkboxes) ---
function getTurnos(){
  return [...document.querySelectorAll('input[name="turno[]"]:checked')]
    .map(cb => cb.value);
}

/* ---------- TEXTAREA AUTOSIZE ---------- */
function autosizeTextArea(ta){
  const resize = () => {
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  };
  ["input","change"].forEach(ev => ta.addEventListener(ev, resize));
  resize();
}
if (el.desc) autosizeTextArea(el.desc);

// ======== FOTOS (preview local + miniaturas removíveis) ========
let fotosSelecionadas = []; // estado fonte-da-verdade

// helper: lê arquivos como DataURL (base64)
function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// 👇 NOVO: evita duplicadas e respeita limite
function dedupePush(files) {
  const set = new Set(fotosSelecionadas.map(f => `${f.name}|${f.size}|${f.lastModified}`));
  for (const f of files) {
    const k = `${f.name}|${f.size}|${f.lastModified}`;
    if (!set.has(k)) { fotosSelecionadas.push(f); set.add(k); }
    if (fotosSelecionadas.length >= MAX_FOTOS) break;
  }
}

// 👇 NOVO: renderiza miniaturas com botão X
function renderThumbs() {
  if (!el.thumbs) return;

  // remove qualquer item inválido
  fotosSelecionadas = fotosSelecionadas.filter(
    f => f && f instanceof File && /^image\//.test(f.type)
  );

  el.thumbs.innerHTML = "";
  if (!fotosSelecionadas.length) return;     // ⬅️ não cria nada se o array estiver vazio

  fotosSelecionadas.forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    const card = document.createElement("div");
    card.className = "thumb";
    card.innerHTML = `
      <img src="${url}" alt="foto ${idx+1}">
      <button type="button" class="rm" aria-label="Remover imagem" data-idx="${idx}">×</button>
    `;
    card.querySelector("img").addEventListener("load", () => URL.revokeObjectURL(url));
    el.thumbs.appendChild(card);
  });

  el.thumbs.querySelectorAll(".rm").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      const i = Number(e.currentTarget.dataset.idx);
      fotosSelecionadas.splice(i, 1);
      renderThumbs();
      postPreview();
    });
  });
}

// abrir seletor
el.fotoBtn.addEventListener("click", ()=> el.fotoInput.click());
el.fotoInput.addEventListener("change", (e)=>{
  const novos = Array.from(e.target.files || []).filter(f => f && f.type.startsWith("image/"));
  if (!novos.length) return;                 // ⬅️ evita criar thumb “vazia” se cancelar o diálogo
  const resto = MAX_FOTOS - fotosSelecionadas.length;
  dedupePush(novos.slice(0, resto));
  el.fotoInput.value = "";                   // permite escolher o mesmo arquivo depois
  renderThumbs();
  postPreview();
});


// (opcional) drag & drop no botão “+”
["dragenter","dragover"].forEach(ev=>{
  el.fotoBtn.addEventListener(ev, (e)=>{ e.preventDefault(); e.stopPropagation(); });
});
["dragleave","drop"].forEach(ev=>{
  el.fotoBtn.addEventListener(ev, (e)=>{ e.preventDefault(); e.stopPropagation(); });
});
el.fotoBtn.addEventListener("drop", (e)=>{
  const files = Array.from(e.dataTransfer.files || []).filter(f=>f.type.startsWith("image/"));
  const resto = MAX_FOTOS - fotosSelecionadas.length;
  dedupePush(files.slice(0, resto));
  renderThumbs();
  postPreview();
});

// --- monta payload e envia ao iframe (descricao_vaga.html?live=1)
async function buildPreviewPayload(){
  // 👇 usa o estado fotosSelecionadas (e não el.fotoInput.files)
  const imagens = await Promise.all(fotosSelecionadas.map(fileToDataURL));

  return {
    titulo: el.nome.value.trim() || "Nome do projeto",
    empresa: localStorage.getItem("empresa_nome") || "Minha empresa",
    descricao: el.desc.value.trim(),
    tags: (el.tags.value||"").split(",").map(s=>s.trim()).filter(Boolean),
    local: el.local.value.trim(),
    turno: getTurnos().join(", "),
    dataInicio: el.dataInicio.value || null,
    dataFim: el.dataFim.value || null,
    status: el.status.value,
    imagens
  };
}

async function postPreview(){
  if (!el.previewFrame || !el.previewFrame.contentWindow) return;
  const payload = await buildPreviewPayload();
  el.previewFrame.contentWindow.postMessage({ type:"VAGA_PREVIEW", payload }, "*");
}

["input","change","keyup"].forEach(ev=>{
  [el.nome, el.desc, el.tags, el.local, el.dataInicio, el.dataFim, el.status]
    .forEach(cmp => cmp && cmp.addEventListener(ev, postPreview));
});
document.querySelectorAll('input[name="turno[]"]').forEach(cb => {
  cb.addEventListener("change", postPreview);
});

el.previewFrame?.addEventListener("load", postPreview);
renderThumbs(); // 👈 inicial
postPreview();

/* ---------- salvar no backend ---------- */
el.salvar.addEventListener("click", async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token");
  const empresaId = localStorage.getItem("userId");

  // monta FormData para suportar texto + arquivos
  const fd = new FormData();
  fd.append("titulo", el.nome.value.trim());
  fd.append("descricao", el.desc.value.trim());

  // tags/turnos como array (chave repetida)
  const tagsArr = (el.tags.value || "")
      .split(",").map(s => s.trim()).filter(Boolean);
  tagsArr.forEach(t => fd.append("tags", t));
  getTurnos().forEach(t => fd.append("turno", t));

  if (el.local.value)      fd.append("local", el.local.value.trim());
  if (el.dataInicio.value) fd.append("dataInicio", new Date(el.dataInicio.value).toISOString());
  if (el.dataFim.value)    fd.append("dataFim", new Date(el.dataFim.value).toISOString());
  if (el.status.value)     fd.append("status", el.status.value);

  // 👇 usa o mesmo estado (respeita remoções feitas no X)
  fotosSelecionadas.forEach(file => fd.append("imagens", file)); // nome da chave: "imagens"

  try {
    const resp = await fetch(`/api/empresas/${empresaId}/vagas`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }, // não setar Content-Type
      body: fd,
    });

    const json = await resp.json();

    if (!resp.ok) {
      if (resp.status === 403 && json?.error) {
        alert(`❌ ${json.error}${typeof json.progressoAtual === "number" ? ` (progresso: ${json.progressoAtual}%)` : ""}`);
        return;
      }
      throw new Error(json.error || "Erro ao criar vaga.");
    }

    alert("✅ Vaga criada!");
    location.href = `perfil-empresa.html?id=${empresaId}`;
  } catch (err) {
    console.error(err);
    alert("❌ Falha ao salvar a vaga.");
  }
});
