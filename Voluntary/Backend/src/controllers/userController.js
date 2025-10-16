const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendVerificationEmail } = require("../utils/sendEmail");
const { generateToken } = require("../utils/generateToken");

const prisma = new PrismaClient();

// Cadastro de usuário
async function registrarUsuario(req, res, next) {
  try {
    const { nome, usuario, email, cpf, senha } = req.body;

    // 1. Verificação (Rápida)
    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente) return res.status(400).json({ error: "E-mail já cadastrado." });

    // 2. Hash da Senha (Intencionalmente Lento)
    // Se 12 rounds for demais, reduza para 10 ou 11.
    const senhaHash = await bcrypt.hash(senha, 12);
    const token = generateToken({ email }, "1h");

    // 3. Criação do Usuário no BD (Rápida se houver índices)
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

    // 4. RETORNA A RESPOSTA AO USUÁRIO IMEDIATAMENTE!
    res.status(201).json({ message: "Usuário criado! Verifique seu e-mail." });
    
    // 5. Envia o e-mail em segundo plano.
    // O .catch() é crucial para registrar erros sem afetar o usuário.
    sendVerificationEmail(email, token).catch(error => {
        console.error("Erro ao enviar email de verificação:", error);
        // Opcional: Aqui você pode tentar reenviar o email ou registrar um log no BD.
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

// Login
async function loginUsuario(req, res, next) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha)
      return res.status(400).json({ error: "Email e senha são obrigatórios." });

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(401).json({ error: "Email não encontrado." });

    const isPasswordValid = await bcrypt.compare(senha, usuario.senha);
    if (!isPasswordValid) return res.status(401).json({ error: "Senha incorreta." });

    if (!usuario.validacao)
      return res.status(401).json({ error: "E-mail não verificado." });

    const token = generateToken({ id: usuario.id, email: usuario.email });

    const { senha: _, ...usuarioSeguro } = usuario;
    res.status(200).json({ message: "Login realizado com sucesso!", token, usuario: usuarioSeguro });
  } catch (err) {
    next(err);
  }
}

// Listar usuários
async function listarUsuarios(req, res, next) {
  try {
    const usuarios = await prisma.usuario.findMany();
    res.status(200).json(usuarios);
  } catch (err) {
    next(err);
  }
}

module.exports = { registrarUsuario, verificarEmail, loginUsuario, listarUsuarios };
