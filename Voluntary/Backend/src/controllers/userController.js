const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const CryptoJS = require("crypto-js");
const { sendVerificationEmail } = require("../utils/sendEmail");
const { generateToken } = require("../utils/generateToken");

const prisma = new PrismaClient();
const SECRET_KEY = process.env.FLE_MASTER_KEY; 

// Cadastro de usuário
async function registrarUsuario(req, res, next) {
  try {
    const { nome, usuario, email, cpf, senha } = req.body;

    // 1️⃣ Verificação de e-mail duplicado
    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente)
      return res.status(400).json({ error: "E-mail já cadastrado." });

    // 2️⃣ Descriptografa a senha recebida do frontend (AES)
    const senhaDescriptografada = CryptoJS.AES.decrypt(senha, SECRET_KEY).toString(CryptoJS.enc.Utf8);

    if (!senhaDescriptografada)
      return res.status(400).json({ error: "Erro ao descriptografar a senha." });

    // 3️⃣ Gera o hash seguro da senha
    const senhaHash = await bcrypt.hash(senhaDescriptografada, 12);

    // 4️⃣ Cria token de validação
    const token = generateToken({ email }, "1h");

    // 5️⃣ Salva o usuário no banco
    await prisma.usuario.create({
      data: {
        nome,
        usuario,
        email,
        cpf,
        senha: senhaHash,
        validacaoToken: token,
        validacao: false,
      },
    });

    // 6️⃣ Responde imediatamente ao cliente
    res.status(201).json({ message: "Usuário criado! Verifique seu e-mail." });

    // 7️⃣ Envia o e-mail de verificação em segundo plano
    sendVerificationEmail(email, token).catch((error) => {
      console.error("Erro ao enviar email de verificação:", error);
    });

  } catch (err) {
    next(err);
  }
}

// Verificação de e-mail
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

// ------------------------------
// Login do usuário
// ------------------------------
async function loginUsuario(req, res, next) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha)
      return res.status(400).json({ error: "Email e senha são obrigatórios." });

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(401).json({ error: "Email não encontrado." });

    const senhaDescriptografada = CryptoJS.AES.decrypt(senha, SECRET_KEY).toString(CryptoJS.enc.Utf8);

    if (!senhaDescriptografada)
      return res.status(400).json({ error: "Erro ao descriptografar a senha." });

    const isPasswordValid = await bcrypt.compare(senhaDescriptografada, usuario.senha);
    if (!isPasswordValid) return res.status(401).json({ error: "Senha incorreta." });

    if (!usuario.validacao)
      return res.status(401).json({ error: "E-mail não verificado." });

    const token = generateToken({ id: usuario.id, email: usuario.email });

    const { senha: _, ...usuarioSeguro } = usuario;

    res.status(200).json({
      message: "Login realizado com sucesso!",
      token,
      usuario: usuarioSeguro,
    });

  } catch (err) {
    next(err);
  }
}

// ------------------------------
// Listar usuários (admin/teste)
// ------------------------------
async function listarUsuarios(req, res, next) {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        usuario: true,
        cpf: true,
        validacao: true,
      },
    });
    res.status(200).json(usuarios);
  } catch (err) {
    next(err);
  }
}


module.exports = {
  registrarUsuario,
  verificarEmail,
  loginUsuario,
  listarUsuarios,
};
