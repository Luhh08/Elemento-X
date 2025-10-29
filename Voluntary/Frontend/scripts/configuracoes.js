// scripts/configuracoes.js

document.addEventListener("DOMContentLoaded", () => {
  const btnSave = document.getElementById("btnSave");
  const btnCancel = document.getElementById("btnCancel");

  // Botão Cancelar
  btnCancel.addEventListener("click", () => {
    window.location.reload();
  });

  // Botão Salvar (feedback simples)
  btnSave.addEventListener("click", () => {
    alert("Alterações salvas com sucesso!");
  });
});
