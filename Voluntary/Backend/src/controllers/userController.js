// src/controllers/userController.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendVerificationEmail } = require("../utils/sendEmail");
const { generateToken } = require("../utils/generateToken");

const prisma = new PrismaClient();
const SECRET_KEY = process.env.FLE_MASTER_KEY; // AES key base64

// ----------------- Criptografia CPF -----------------
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(SECRET_KEY, "base64"),
    iv
  );
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return iv.toString("base64") + ":" + encrypted;
}

function decrypt(data) {
  const [iv64, encrypted] = data.split(":");
  const iv = Buffer.from(iv64, "base64");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(SECRET_KEY, "base64"),
    iv
  );
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ----------------- Controller -----------------

// Registrar usuário
async function registrarUsuario(req, res, next) {
  try {
    const { nome, usuario, email, cpf, senha } = req.body;

    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente) return res.status(400).json({ error: "E-mail já cadastrado." });

    const senhaHash = await bcrypt.hash(senha, 12);
    const token = generateToken({ email }, "1h");
    const encryptedCpf = encrypt(cpf);

    await prisma.usuario.create({
      data: {
        nome,
        usuario,
        cpf: encryptedCpf,
        email,
        senha: senhaHash,
        validacao: false,
        validacaoToken: token,
      },
    });

    sendVerificationEmail(email, token).catch(console.error);

    res.status(201).json({ message: "Usuário criado! Verifique seu e-mail." });
  } catch (err) {
    next(err);
  }
}

// Verificar email
async function verificarEmail(req, res, next) {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await prisma.usuario.findUnique({ where: { email: decoded.email } });
    if (!usuario) return res.status(404).send("Usuário não encontrado.");

    await prisma.usuario.update({
      where: { email: decoded.email },
      data: { validacao: true, validacaoToken: null },
    });

    res.redirect(`${process.env.FRONTEND_URL}/email-verificado.html`);
  } catch (err) {
    next(err);
  }
}

// Login
async function loginUsuario(req, res, next) {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: "Email e senha são obrigatórios." });

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(401).json({ error: "Email não encontrado." });
    if (!usuario.validacao) return res.status(401).json({ error: "E-mail não verificado." });

    const isPasswordValid = await bcrypt.compare(senha, usuario.senha);
    if (!isPasswordValid) return res.status(401).json({ error: "Senha incorreta." });

    const token = generateToken({ id: usuario.id, email });

    const { senha: _, cpf: __, ...usuarioSeguro } = usuario;

    res.status(200).json({ message: "Login realizado com sucesso!", token, usuario: usuarioSeguro });
  } catch (err) {
    next(err);
  }
}

// Listar usuários (sem dados sensíveis)
async function listarUsuarios(req, res, next) {
  try {
    const usuarios = await prisma.usuario.findMany();
    const usuariosSeguros = usuarios.map(u => ({
      ...u,
      senha: undefined,
      cpf: undefined,
    }));
    res.status(200).json(usuariosSeguros);
  } catch (err) {
    next(err);
  }
}

// Redefinir senha (envio de código)
async function enviarCodigoReset(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email é obrigatório." });

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.usuario.update({
      where: { email },
      data: { resetToken: code, resetTokenExpires: expires },
    });

    await sendVerificationEmail(email, `Código de redefinição: ${code} (expira em 10 minutos)`);

    res.json({ message: "Código enviado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao enviar o código." });
  }
}

// Verificar código de redefinição
async function verificarCodigoReset(req, res) {
  const { email, codigo } = req.body;
  if (!email || !codigo) return res.status(400).json({ error: "Email e código são obrigatórios." });

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });

    if (usuario.resetToken !== codigo) return res.status(400).json({ error: "Código incorreto." });
    if (usuario.resetTokenExpires < new Date()) return res.status(400).json({ error: "Código expirado." });

    await prisma.usuario.update({
      where: { email },
      data: { resetToken: null, resetTokenExpires: null },
    });

    res.json({ message: "Código verificado!", redirect: "/nova-senha.html" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao verificar o código." });
  }
}

// Resetar senha
async function resetarSenha(req, res) {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: "Email e senha são obrigatórios." });

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });

    const hashedSenha = await bcrypt.hash(senha, 12);
    await prisma.usuario.update({
      where: { email },
      data: { senha: hashedSenha, resetToken: null, resetTokenExpires: null },
    });

    res.json({ message: "Senha redefinida com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao redefinir a senha." });
  }
}

module.exports = {
  registrarUsuario,
  verificarEmail,
  loginUsuario,
  listarUsuarios,
  enviarCodigoReset,
  verificarCodigoReset,
  resetarSenha,
};
