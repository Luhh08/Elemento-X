// src/controllers/passwordController.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { enviarEmail, gerarCodigo } = require("../utils/emailUtils");

const prisma = new PrismaClient();

// Normaliza o email
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

// ===================
// Enviar código de redefinição
// ===================
exports.enviarCodigoReset = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email é obrigatório." });

  const emailNormalized = normalizeEmail(email);

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email: emailNormalized } });
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });

    const code = gerarCodigo(); // 6 dígitos
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.usuario.update({
      where: { email: emailNormalized },
      data: { resetToken: code, resetTokenExpires: expires },
    });

    await enviarEmail(
      emailNormalized,
      "Redefinição de Senha - Voluntary",
      `<h2>Seu código de redefinição:</h2><h3>${code}</h3><p>Expira em 10 minutos.</p>`
    );

    res.json({ message: "Código enviado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao enviar o código." });
  }
};

// ===================
// Verificar código
// ===================
exports.verificarCodigoReset = async (req, res) => {
  const { email, codigo } = req.body;
  if (!email || !codigo)
    return res.status(400).json({ error: "Email e código são obrigatórios." });

  const emailNormalized = normalizeEmail(email);

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email: emailNormalized } });
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });

    if (usuario.resetToken !== codigo)
      return res.status(400).json({ error: "Código incorreto." });

    if (usuario.resetTokenExpires < new Date())
      return res.status(400).json({ error: "Código expirado." });

    // Zera o token temporariamente para evitar reuso
    await prisma.usuario.update({
      where: { email: emailNormalized },
      data: { resetToken: null, resetTokenExpires: null },
    });

    res.json({ message: "Código verificado!", redirect: `/redefinir-senha.html?email=${encodeURIComponent(emailNormalized)}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao verificar o código." });
  }
};

// ===================
// Resetar senha
// ===================
exports.resetarSenha = async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha)
    return res.status(400).json({ error: "Email e senha são obrigatórios." });

  const emailNormalized = normalizeEmail(email);

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email: emailNormalized } });
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });

    const hashedSenha = await bcrypt.hash(senha, 12);

    await prisma.usuario.update({
      where: { email: emailNormalized },
      data: { senha: hashedSenha },
    });

    res.json({ message: "Senha redefinida com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao redefinir a senha." });
  }
};
