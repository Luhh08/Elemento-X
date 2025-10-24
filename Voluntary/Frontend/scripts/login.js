
const formLogin = document.querySelector(".login-form");

const SECRET_KEY = "chaveSeguraDe32Caracteres1234567890";

const LOGIN_URL = "/api/users/login"; 

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  if (!email || !senha) {
    alert("Informe e-mail e senha.");
    return;
  }

  // Criptografa a senha (AES) — o backend descriptografa com a mesma SECRET_KEY
  const senhaCriptografada = CryptoJS.AES.encrypt(senha, SECRET_KEY).toString();

  try {
    const resp = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha: senhaCriptografada }),
    });

    // Evita "Unexpected token '<' ..." se o backend devolver HTML por engano
    const ct = resp.headers.get("content-type") || "";
    const payload = ct.includes("application/json") ? await resp.json() : { error: await resp.text() };

    if (!resp.ok) {
      throw new Error(payload.error || "Falha no login.");
    }

    // Guarda sessão
    localStorage.setItem("token", payload.token || "");
    localStorage.setItem("userId", payload.usuario?.id || "");
    localStorage.setItem("tipoUsuario", "usuario");

    // Redireciona para o perfil do usuário
    window.location.href = "perfil-usuario.html";
  } catch (err) {
    console.error("Erro no login:", err);
    alert(err.message || "Erro ao conectar com o servidor.");
  }
});
