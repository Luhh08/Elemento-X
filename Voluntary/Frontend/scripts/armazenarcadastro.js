// Seleciona o formulário
const form = document.querySelector(".registro-form");

// Confirmação de senha
const senhaInput = document.getElementById('senha');
const confirmarInput = document.getElementById('confirmarSenha');
const erro = document.getElementById('erroSenha');

// 🧩 Chave secreta — deve ser a mesma usada no backend (.env)
const SECRET_KEY = "chaveSeguraDe32Caracteres1234567890"; 

// Validação de senha
form.addEventListener('submit', function(e) {
  if (senhaInput.value !== confirmarInput.value) {
    e.preventDefault(); // impede o envio
    erro.style.display = 'block';
    confirmarInput.style.borderColor = 'red';
    return; // sai da função, não envia para o backend
  } else {
    erro.style.display = 'none';
    confirmarInput.style.borderColor = 'green';
  }
});

// Feedback em tempo real enquanto o usuário digita
confirmarInput.addEventListener('input', function() {
  if (confirmarInput.value !== senhaInput.value) {
    confirmarInput.style.borderColor = 'red';
    erro.style.display = 'block';
  } else {
    confirmarInput.style.borderColor = 'green';
    erro.style.display = 'none';
  }
});

// Envio para o backend (apenas se as senhas coincidirem)
form.addEventListener("submit", async (e) => {
  e.preventDefault(); // Evita recarregar a página

  if (senhaInput.value !== confirmarInput.value) return; // segurança extra

  const nome = document.getElementById("nome").value;
  const usuario = document.getElementById("usuario").value;
  const email = document.getElementById("email").value;
  const cpf = document.getElementById("cpf").value;
  const senha = senhaInput.value;

  // 🔒 Criptografa a senha ANTES de enviar
  const senhaCriptografada = CryptoJS.AES.encrypt(senha, SECRET_KEY).toString();

const dadosUsuario = { nome, usuario, email, cpf, senha: senhaCriptografada };
  const SAME_ORIGIN = location.origin.includes(":3000");
  const API_URL = SAME_ORIGIN ? "/api" : "http://localhost:3000/api";

  try {
const response = await fetch(`${API_URL}/users`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(dadosUsuario)
});

    if (response.ok) {
      const usuarioCriado = await response.json();
      alert("Usuario cadastrado com sucesso!");
      form.reset();
      window.location.href = "login.html";
    } else {
      const erro = await response.json();
      alert("Erro ao cadastrar");
    }
  } catch (err) {
    console.error("Erro na requisição:", err);
    alert("Erro ao conectar com o servidor.");
  }
});
