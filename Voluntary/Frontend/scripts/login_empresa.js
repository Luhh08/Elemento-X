// scripts/login_empresa.js
const $ = (s) => document.querySelector(s);

// MESMA CHAVE do backend (.env EMPRESA_AES_KEY)
const EMPRESA_AES_KEY = "chaveSeguraDe32Caracteres1234567890";

function aplicarMascaraCNPJ(input) {
  if (!input) return;
  const format = (v) => {
    const d = String(v || "").replace(/\D/g, "").slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };
  const handler = () => { input.value = format(input.value); };
  ["input","blur","paste"].forEach(ev => input.addEventListener(ev, handler));
}

const cnpjInput = $("#cnpj");
const form = $("#loginEmpresaForm");
aplicarMascaraCNPJ(cnpjInput);

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const cnpjDigits = cnpjInput.value.replace(/\D/g, "");
  const senha = $("#senha").value;

  if (cnpjDigits.length !== 14) {
    alert("Informe um CNPJ válido (14 dígitos).");
    cnpjInput.focus();
    return;
  }
  if (!senha) {
    alert("Informe a senha.");
    return;
  }

  // 🔐 criptografa senha com AES (deve bater com EMPRESA_AES_KEY no backend)
  const senhaCriptografada = CryptoJS.AES.encrypt(senha, EMPRESA_AES_KEY).toString();

  try {
    const resp = await fetch("/api/empresas/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj: cnpjDigits, senha: senhaCriptografada })
    });

    const ct = resp.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await resp.json()
      : { error: await resp.text() };

    if (!resp.ok) {
      // resposta 403 específica do seu controller (conta não verificada)
      if (resp.status === 403 && data?.error) {
        alert(data.error);
        return;
      }
      throw new Error(data.error || "Falha no login.");
    }

    // ✅ Guarda sessão padronizada (o resto do front usa isso)
    localStorage.setItem("token", data.token || "");
    localStorage.setItem("tipoConta", "empresa");
    localStorage.setItem("role", "empresa");
    localStorage.setItem("empresaId", data.empresa?.id || "");
    localStorage.setItem("empresa_nome", data.empresa?.razao_social || "");

    // evita confusão com páginas que checam userId
    localStorage.removeItem("userId");

    // redireciona
    location.href = `perfil-empresa.html?id=${encodeURIComponent(data.empresa.id)}`;
  } catch (err) {
    console.error("Erro no login:", err);
    alert(err.message || "Erro ao realizar login.");
  }
});
