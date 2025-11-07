// scripts/login_empresa.js
const $ = (s) => document.querySelector(s);

// MESMA CHAVE do backend (.env EMPRESA_AES_KEY)
const EMPRESA_AES_KEY = "chaveSeguraDe32Caracteres1234567890";

// Helpers
const isValidObjectId = (s) => typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s);

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

  const cnpjDigits = (cnpjInput.value || "").replace(/\D/g, "");
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

  // 🔐 Criptografa senha com AES (chave deve ser igual ao backend)
  const senhaCriptografada = CryptoJS.AES.encrypt(senha, EMPRESA_AES_KEY).toString();

  try {
    const resp = await fetch("/api/empresas/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj: cnpjDigits, senha: senhaCriptografada })
    });

    const ct = resp.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await resp.json() : { error: await resp.text() };

    if (!resp.ok) {
      if (resp.status === 403 && data?.error) {
        alert(data.error); 
        return;
      }
      throw new Error(data?.error || "Falha no login.");
    }

localStorage.setItem("empresaId", data.empresa.id);
localStorage.setItem("token", data.token);           
localStorage.setItem("empresaToken", data.token);    
localStorage.setItem("tipoConta", "empresa");

    let id = data?.empresa?.id || data?.empresa?._id || "";
    if ((!id || id === "null" || id === "undefined") && data?.token && data.token.split(".").length === 3) {
      try {
        const payload = JSON.parse(atob(data.token.split(".")[1]));
        if (payload?.sub) id = String(payload.sub);
      } catch {}
    }

    // Valida o ID
    if (!isValidObjectId(id)) {
      console.error("[LOGIN EMPRESA] id inválido recebido:", id, "payload:", data);
      alert("Falha ao obter o ID da empresa. Tente logar novamente.");
      localStorage.removeItem("empresaId");
      localStorage.removeItem("userId");
      return;
    }

    // Salva chaves esperadas pelo restante do front
    localStorage.setItem("empresaId", id);
    localStorage.setItem("userId", id); // compat com telas antigas
    localStorage.setItem("empresa_nome", data?.empresa?.razao_social || "");

    console.log("[LOGIN EMPRESA] ok • empresaId =", id);

    // Redireciona para o perfil da empresa
    location.href = `perfil-empresa.html?id=${encodeURIComponent(id)}`;
  } catch (err) {
    console.error("Erro no login:", err);
    alert(err.message || "Erro ao realizar login.");
  }
});
