const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { enviarEmail, gerarCodigo } = require("../utils/emailUtils");
const bcrypt = require("bcrypt");

exports.enviarCodigoReset = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email é obrigatório." });

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario)
      return res.status(404).json({ error: "Usuário não encontrado." });

    const code = gerarCodigo();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.usuario.update({
      where: { email },
      data: { resetToken: code, resetTokenExpires: expires },
    });

    await enviarEmail(
    email,
    "Redefinição de Senha - Voluntary",
    `<h2>Seu código de redefinição:</h2><h3>${code}</h3><p>Expira em 10 minutos.</p>`
    );

    res.json({ message: "Código enviado com sucesso!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao enviar o código." });
  }
};

exports.verificarCodigoReset = async (req, res) => {
  const { email, codigo } = req.body;
  if (!email || !codigo)
    return res.status(400).json({ error: "Email e código são obrigatórios." });

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });

    if (usuario.resetToken !== codigo)
      return res.status(400).json({ error: "Código incorreto." });

    if (usuario.resetTokenExpires < new Date())
      return res.status(400).json({ error: "Código expirado." });

    await prisma.usuario.update({
      where: { email },
      data: { resetToken: null, resetTokenExpires: null },
    });

    res.json({ message: "Código verificado!", redirect: "/nova-senha.html" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao verificar o código." });
  }
};

exports.resetarSenha = async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: "Email e senha são obrigatórios." });
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });

    const hashedSenha = await bcrypt.hash(senha, 10);

    await prisma.usuario.update({
      where: { email },
      data: {
        senha: hashedSenha,
        resetToken: null,
        resetTokenExpires: null
      },
    });

    res.json({ message: "Senha redefinida com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao redefinir a senha." });
  }
};
