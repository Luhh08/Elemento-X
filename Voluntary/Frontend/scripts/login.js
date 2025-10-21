// scripts/login.js

// Seleciona o formulário de login
const formLogin = document.querySelector(".login-form");

// 🧩 Chave secreta — deve ser a mesma usada no backend (.env)
const SECRET_KEY = "chaveSeguraDe32Caracteres1234567890";

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault(); // Evita recarregar a página

  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  // 🔒 Criptografa a senha antes de enviar ao servidor
  const senhaCriptografada = CryptoJS.AES.encrypt(senha, SECRET_KEY).toString();

  try {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha: senhaCriptografada }),
    });

    const data = await response.json();

    if (response.ok) {
      // ✅ Salva o token e o ID do usuário no navegador
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.usuario.id); // <— importante!

      alert(data.message);
      window.location.href = "perfil-usuario.html";
    } else {
      alert(data.error || "Falha no login.");
    }
  } catch (err) {
    console.error("Erro na requisição:", err);
    alert("Erro ao conectar com o servidor.");
  }
});
