(function () {
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const API_BASE = ""; // se precisar prefixo (ex: "/api"), ajuste aqui
  const MAX_FILES = 6;
  const MAX_MB_PER_FILE = 5;

  // -------- header voltar
  $("#btnVoltar")?.addEventListener("click", () => history.back());

  // -------- título dinâmico pelo ?vaga=:id
  (async function hydrateCompanyName() {
    try {
      const qs = new URLSearchParams(location.search);
      const vagaId = qs.get("vaga");
      if (!vagaId) return;
      const r = await fetch(`${API_BASE}/api/vagas/${encodeURIComponent(vagaId)}`);
      if (!r.ok) return;
      const v = await r.json();
      const nome = v?.empresa?.razao_social || v?.empresaNome || "XXXXX";
      $("#empresaNome") && ($("#empresaNome").textContent = nome);
    } catch (_) { /* silencioso */ }
  })();

  // -------- estrelas (default 3/5, como no seu Figma)
  const starsEl = $("#stars");
  let rating = 3;

  function refreshStars() {
    $$("#stars .star").forEach((b) => {
      const val = Number(b.dataset.value);
      const active = val <= rating;
      b.classList.toggle("active", active);
      b.classList.toggle("inactive", !active);
      b.innerHTML = active ? '<i class="ri-star-fill"></i>' : '<i class="ri-star-line"></i>';
      b.setAttribute("aria-pressed", String(active));
    });
    $("#currentRating") && ($("#currentRating").textContent = String(rating));
  }

  starsEl?.addEventListener("click", (e) => {
    const btn = e.target.closest(".star");
    if (!btn) return;
    rating = Number(btn.dataset.value || 0);
    refreshStars();
  });

  // acessibilidade via teclado
  starsEl?.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    rating = Math.min(5, Math.max(1, rating + (e.key === "ArrowRight" ? 1 : -1)));
    refreshStars();
  });

  refreshStars();

  // -------- upload + preview (com validações)
  const input = $("#fotosInput");
  const drop = $(".drop");
  const previews = $("#previews");
  const filesBucket = []; 
  

  function readableSize(bytes){
    const mb = bytes / (1024*1024);
    return `${mb.toFixed(1)} MB`;
  }

  function addPreview(file) {
    const url = URL.createObjectURL(file);
    const box = document.createElement("div");
    box.className = "preview";
    box.innerHTML = `<img src="${url}" alt="">
      <button class="remove" type="button" aria-label="Remover">×</button>`;
    box.querySelector(".remove").addEventListener("click", () => {
      const idx = filesBucket.indexOf(file);
      if (idx >= 0) filesBucket.splice(idx, 1);
      URL.revokeObjectURL(url);
      box.remove();
      toggleDropHint();
    });
    previews.appendChild(box);
    toggleDropHint();
  }

  function toggleDropHint(){
    const hint = $(".drop .hint");
    if (!hint) return;
    hint.hidden = filesBucket.length > 0;
  }

  function validateAndPush(file){
    if (!file.type?.startsWith("image/")) {
      alert(`Arquivo "${file.name}" não é imagem.`);
      return false;
    }
    const mb = file.size / (1024*1024);
    if (mb > MAX_MB_PER_FILE) {
      alert(`"${file.name}" tem ${readableSize(file.size)} (máx ${MAX_MB_PER_FILE} MB).`);
      return false;
    }
    if (filesBucket.length >= MAX_FILES) {
      alert(`Máximo de ${MAX_FILES} imagens por avaliação.`);
      return false;
    }
    filesBucket.push(file);
    addPreview(file);
    return true;
  }

  drop?.addEventListener("click", () => input?.click());
  input?.addEventListener("change", () => {
    for (const f of input.files || []) validateAndPush(f);
    input.value = ""; 
  });

  // suporte a arrastar-e-soltar
  ["dragenter","dragover"].forEach(ev => drop?.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation(); drop.classList.add("dragging");
  }));
  ["dragleave","drop"].forEach(ev => drop?.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation(); drop.classList.remove("dragging");
  }));
  drop?.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    if (!dt?.files) return;
    for (const f of dt.files) validateAndPush(f);
  });

  // -------- enviar
  let submitting = false;
  $("#btnEnviar")?.addEventListener("click", async () => {
    if (submitting) return;
    const textoEl = $("#opniao"); // (mantive seu id)
    const texto = (textoEl?.value || "").trim();
    const qs = new URLSearchParams(location.search);
    const vagaId = qs.get("vaga") || "";
    const token = localStorage.getItem("token");

    // validações simples
    if (!vagaId) return alert("Vaga não identificada.");
    if (rating <= 0) return alert("Escolha uma nota de 1 a 5.");
    if (!texto) return alert("Conte um pouco da sua experiência :)");

    const fd = new FormData();
    fd.append("vagaId", vagaId);
    fd.append("nota", String(rating));
    fd.append("comentario", texto);
    filesBucket.forEach((f, i) => fd.append("fotos", f, f.name || `foto_${i}.jpg`));

    submitting = true;
    const btn = $("#btnEnviar");
    if (btn) { btn.disabled = true; btn.dataset.originalText = btn.textContent; btn.textContent = "Enviando..."; }

    try {
      const r = await fetch(`${API_BASE}/api/avaliacoes`, {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (r.status === 401) {
        alert("Faça login para enviar sua avaliação.");
        return location.replace("login.html");
      }
      if (r.status === 409) {
        return alert("Você já avaliou esta vaga.");
      }
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        return alert(err?.error || "Falha ao enviar sua avaliação.");
      }

      // sucesso
      alert("Avaliação enviada! Obrigado pela ajuda ♥");
      // redireciona para a descrição da vaga (ajuste o caminho se necessário)
      location.replace(`descricao_vagas.html?id=${encodeURIComponent(vagaId)}`);
    } catch (e) {
      console.error(e);
      alert("Erro de rede ao enviar sua avaliação.");
    } finally {
      submitting = false;
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.originalText || "Enviar"; }
    }
  });
})();

