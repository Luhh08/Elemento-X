const fotoInput = document.getElementById("fotoInput");
const fotoContainer = document.getElementById("fotoContainer");
const fotoPlaceholder = document.getElementById("fotoPlaceholder");
const previewImages = document.getElementById("previewImages");

let fotosSelecionadas = [];

// 📸 Clique em qualquer parte da área de fotos -> abre explorador
fotoContainer.addEventListener("click", () => fotoInput.click());

// 📸 Upload e preview
fotoInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  fotosSelecionadas = files.map((file) => URL.createObjectURL(file));
  atualizarPreviewFotos();
});

// 🪄 Atualização em tempo real dos textos
document.querySelectorAll("#vagaForm input, #vagaForm textarea").forEach((campo) => {
  campo.addEventListener("input", atualizarPreview);
});

function atualizarPreviewFotos() {
  // Limpa fotos antigas
  fotoContainer.querySelectorAll("img").forEach((img) => img.remove());
  previewImages.innerHTML = "";

  // Adiciona novas
  fotosSelecionadas.forEach((src) => {
    const imgForm = document.createElement("img");
    imgForm.src = src;
    fotoContainer.insertBefore(imgForm, fotoPlaceholder);

    const imgPreview = document.createElement("img");
    imgPreview.src = src;
    previewImages.appendChild(imgPreview);
  });
}

function atualizarPreview() {
  const nome = document.getElementById("nomeProjeto").value || "Nome do projeto...";
  const descricao = document.getElementById("descricao").value || "Descrição do projeto aparecerá aqui.";
  const localizacao = document.getElementById("localizacao").value || "—";
  const turno = document.getElementById("turno").value || "—";
  const data = document.getElementById("data").value || "—";
  const tags = document
    .getElementById("tags")
    .value.split(",")
    .map((t) => t.trim())
    .filter((t) => t !== "");

  document.getElementById("previewTitulo").textContent = nome;
  document.getElementById("previewDescricao").textContent = descricao;
  document.getElementById("previewLocalizacao").innerHTML = `<strong>Localização:</strong> ${localizacao}`;
  document.getElementById("previewTurnoData").innerHTML = `<strong>Turno:</strong> ${turno} | <strong>Data:</strong> ${data}`;
  document.getElementById("previewTags").innerHTML = tags.map((tag) => `<span class="tag">${tag}</span>`).join("");
}

// 🔘 Botão de salvar (simula ação)
document.getElementById("salvarBtn").addEventListener("click", () => {
  alert("Vaga salva com sucesso!");
});
