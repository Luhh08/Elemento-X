(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // -------- header voltar
  $("#btnVoltar")?.addEventListener("click", () => history.back());

  // -------- título dinâmico pelo ?vaga=:id
  (async function hydrateCompanyName() {
    try {
      const qs = new URLSearchParams(location.search);
      const vagaId = qs.get("vaga");
      if (!vagaId) return;
      const r = await fetch(`/api/vagas/${encodeURIComponent(vagaId)}`);
      if (!r.ok) return;
      const v = await r.json();
      const nome = v?.empresa?.razao_social || v?.empresaNome || "XXXXX";
      $("#empresaNome").textContent = nome;
    } catch (_) { /* silencioso */ }
  })();

  // -------- estrelas (default 3/5 como no Figma da sua captura)
  const starsEl = $("#stars");
  let rating = 3;

  function refreshStars() {
    $$("#stars .star").forEach((b) => {
      const val = Number(b.dataset.value);
      if (val <= rating) {
        b.classList.add("active"); b.classList.remove("inactive");
        b.innerHTML = '<i class="ri-star-fill"></i>';
      } else {
        b.classList.add("inactive"); b.classList.remove("active");
        b.innerHTML = '<i class="ri-star-line"></i>';
      }
    });
  }
  starsEl?.addEventListener("click", (e) => {
    const btn = e.target.closest(".star");
    if (!btn) return;
    rating = Number(btn.dataset.value || 0);
    refreshStars();
  });
  refreshStars();

  // -------- upload + preview
  const input = $("#fotosInput");
  const previews = $("#previews");
  const filesBucket = []; // mantemos aqui para enviar depois

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
    });
    previews.appendChild(box);
  }

  $(".drop")?.addEventListener("click", () => input.click());
  input?.addEventListener("change", () => {
    for (const f of input.files || []) {
      if (!f.type.startsWith("image/")) continue;
      filesBucket.push(f);
      addPreview(f);
    }
    input.value = ""; // permite escolher as mesmas fotos de novo se quiser
  });

  // -------- enviar (prepara formdata; o endpoint a gente implementa no back)
  $("#btnEnviar")?.addEventListener("click", async () => {
    const texto = $("#opniao").value.trim();
    const qs = new URLSearchParams(location.search);
    const vagaId = qs.get("vaga") || "";
    const token = localStorage.getItem("token");

    // validações simples
    if (rating <= 0) return alert("Escolha uma nota de 1 a 5.");
    if (!texto) return alert("Conte um pouco da sua experiência :)");

    const fd = new FormData();
    fd.append("vagaId", vagaId);
    fd.append("nota", String(rating));
    fd.append("comentario", texto);
    filesBucket.forEach((f, i) => fd.append("fotos", f, f.name || `foto_${i}.jpg`));

    // TODO: trocar a rota quando definirmos. Exemplo:
    // const r = await fetch("/api/avaliacoes", { method:"POST", body: fd, headers: { Authorization: `Bearer ${token}` }});
    // if (!r.ok) return alert("Falha ao enviar sua avaliação.");
    // alert("Avaliação enviada! Obrigado pela ajuda ♥");
    // location.replace(`descricao_vagas.html?id=${encodeURIComponent(vagaId)}`);

    // Por enquanto só mostra os dados montados:
    console.log("FormData pronto:", { vagaId, rating, texto, files: filesBucket.length });
    alert("Interface pronta! Podemos plugar agora no endpoint do backend.");
  });
})();
