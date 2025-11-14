const formLogin = document.querySelector(".login-form");

// A MESMA chave AES usada pelo backend (process.env.FLE_MASTER_KEY)
// Troque aqui se for diferente:
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

  const senhaCriptografada = CryptoJS.AES.encrypt(senha, SECRET_KEY).toString();

  try {
    const resp = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha: senhaCriptografada }),
    });

    const ct = resp.headers.get("content-type") || "";
    const payload = ct.includes("application/json")
      ? await resp.json()
      : { error: await resp.text() };

    if (!resp.ok) {
      throw new Error(payload.error || "Falha no login.");
    }

    localStorage.setItem("token", payload.token || "");
    localStorage.setItem("tipoConta", "usuario");
    localStorage.setItem("role", "usuario");
    localStorage.setItem("userId", payload.usuario?.id || "");
    localStorage.removeItem("empresaId");
    localStorage.removeItem("empresaLogoUrl");

    if (payload.usuario?.email) localStorage.setItem("email", payload.usuario.email);
    if (payload.usuario?.nome)  localStorage.setItem("nome", payload.usuario.nome);

    // Redireciona com o id do usuário
    const uid = payload.usuario?.id || "";
    window.location.href = `perfil-usuario.html?id=${encodeURIComponent(uid)}`;
  } catch (err) {
    console.error("Erro no login:", err);
    alert(err.message || "Erro ao conectar com o servidor.");
  }
});
