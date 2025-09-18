// Seleciona o formulário
const form = document.querySelector(".registro-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault(); // Evita que a página recarregue

  // Pega os valores dos inputs
  const nome = document.getElementById("nome").value;
  const usuario = document.getElementById("usuario").value;
  const email = document.getElementById("email").value;
  const cpf = document.getElementById("cpf").value;
  const senha = document.getElementById("senha").value;

  // Monta o objeto com os dados
  const dadosUsuario = { nome, usuario, email, cpf, senha };

  try {
    // Envia para o backend
    const response = await fetch("http://localhost:3000/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dadosUsuario)
    });

    if (response.ok) {
      const usuarioCriado = await response.json();
      alert("Usuário criado com sucesso! ID: " + usuarioCriado.id);
      form.reset(); // limpa o formulário
    } else {
      const erro = await response.json();
      alert("Erro ao criar usuário: " + erro.error);
    }
  } catch (err) {
    console.error("Erro na requisição:", err);
    alert("Erro ao conectar com o servidor.");
  }
});