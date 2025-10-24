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
};

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

// fotos (preview local)
let fotosSelecionadas = [];

// helper: lê arquivos como DataURL (base64)
function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

el.fotoBtn.addEventListener("click", ()=> el.fotoInput.click());
el.fotoInput.addEventListener("change", postPreview);

// --- monta payload e envia ao iframe (descricao_vaga.html?live=1)
async function buildPreviewPayload(){
  const files = [...(el.fotoInput.files || [])];
  const imagens = await Promise.all(files.map(fileToDataURL));

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
  el.previewFrame.contentWindow.postMessage({
    type: "VAGA_PREVIEW",
    payload
  }, "*");
}

["input","change","keyup"].forEach(ev=>{
  [el.nome, el.desc, el.tags, el.local, el.dataInicio, el.dataFim, el.status]
    .forEach(cmp => cmp && cmp.addEventListener(ev, postPreview));
});
document.querySelectorAll('input[name="turno[]"]').forEach(cb => {
  cb.addEventListener("change", postPreview);
});

el.previewFrame?.addEventListener("load", postPreview);
postPreview();

/* ---------- salvar no backend ---------- */
el.salvar.addEventListener("click", async (e)=>{
  e.preventDefault();

  const token = localStorage.getItem("token");
  const empresaId = localStorage.getItem("userId");

  const body = {
    titulo: el.nome.value.trim(),
    descricao: el.desc.value.trim(),
    tags: (el.tags.value||"").split(",").map(s=>s.trim()).filter(Boolean),
    local: el.local.value.trim(),
    turno: getTurnos(),
    dataInicio: el.dataInicio.value ? new Date(el.dataInicio.value).toISOString() : null,
    dataFim: el.dataFim.value ? new Date(el.dataFim.value).toISOString() : null,
    status: el.status.value
  };

  try{
    const resp = await fetch(`/api/empresas/${empresaId}/vagas`,{   // << PLURAL AQUI
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
      body: JSON.stringify(body)
    });

    const json = await resp.json();

    if(!resp.ok){
      if (resp.status === 403 && json?.error) {
        alert(`❌ ${json.error}${typeof json.progressoAtual === "number" ? ` (progresso: ${json.progressoAtual}%)` : ""}`);
        return;
      }
      throw new Error(json.error || "Erro ao criar vaga.");
    }

    alert("✅ Vaga criada!");
    // redirecione para a página de perfil da empresa (ajuste se o seu arquivo tiver outro nome)
    location.href = `perfil_empresa.html?id=${empresaId}`;
  }catch(err){
    console.error(err);
    alert("❌ Falha ao salvar a vaga.");
  }
});
