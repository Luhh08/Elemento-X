const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const path = require("path"); // ✅ correto para CommonJS
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Inicializações principais
const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

// Configurações do servidor
app.use(cors({ origin: "*" })); // habilita acesso de qualquer origem
app.use(express.json());        // permite receber JSON no corpo das requisições
app.use(express.static(path.join(__dirname, "../Frontend"))); // serve arquivos estáticos

// ...mas como você usa require(), então mantenha só isso 👇
app.get("/", (_req, res) => {
  const filePath = path.resolve(__dirname, "../Frontend/inicial.html");
  console.log("🧭 Servindo arquivo:", filePath); // log de depuração
  res.sendFile(filePath);
});

// ===============================
// Função de envio de e-mail
// ===============================
async function sendVerificationEmail(email, token) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // senha de app do Gmail
    },
  });

  // Verifica se a conexão com Gmail está OK
  try {
    await transporter.verify();
    console.log("📡 Conexão com Gmail verificada!");
  } catch (err) {
    console.error("❌ Falha na conexão com Gmail:", err);
    return;
  }

  const verificationUrl = `http://localhost:${process.env.PORT}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"Equipe Voluntary 👋" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verifique seu e-mail",
    html: `
      <h2>Verificação de e-mail</h2>
      <p>Olá! Clique no botão abaixo para confirmar sua conta:</p>
      <a href="${verificationUrl}" style="display:inline-block;padding:10px 15px;background:#4CAF50;color:white;border-radius:5px;text-decoration:none;">Verificar e-mail</a>
      <p>Ou copie e cole este link no seu navegador:</p>
      <p>${verificationUrl}</p>
    `,
  };

  console.log("🔹 Tentando enviar e-mail para:", email);

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ E-mail enviado com sucesso:", info.response);
  } catch (error) {
    console.error("❌ Erro ao enviar o e-mail de verificação:", error);
  }
}

// ===============================
// Rota de cadastro de usuário
// ===============================
app.post("/users", async (req, res) => {
  try {
    const { nome, usuario, email, cpf, senha } = req.body;

    console.log("🔹 Dados recebidos do usuário:", { nome, usuario, email, cpf });

    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente) return res.status(400).json({ error: "E-mail já cadastrado." });

    const senhaHash = await bcrypt.hash(senha, 10);

    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const novoUsuario = await prisma.usuario.create({
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

    console.log("🔹 Usuário criado no banco:", novoUsuario);

    await sendVerificationEmail(email, token);

    res.status(201).json({ message: "Usuário criado! Verifique seu e-mail para ativar a conta." });
  } catch (error) {
    console.error("❌ Erro ao criar usuário:", error);
    res.status(500).json({ error: "Erro interno ao criar usuário." });
  }
});

// ===============================
// Rota de verificação de e-mail
// ===============================
app.get("/verify-email", async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await prisma.usuario.findUnique({ where: { email: decoded.email } });
    if (!usuario) return res.status(404).send("Usuário não encontrado.");

    await prisma.usuario.update({
      where: { email: decoded.email },
      data: { validacao: true, validacaoToken: null },
    });

    res.send("✅ E-mail verificado com sucesso! Você já pode fazer login.");
  } catch (error) {
    console.error("❌ Erro ao verificar token:", error);
    res.status(400).send("Token inválido ou expirado.");
  }
});

// ================= Login Usuário =================
app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    const usuarioEncontrado = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuarioEncontrado) {
      return res.status(401).json({ error: "Email não encontrado" });
    }

    const isPasswordValid = await bcrypt.compare(senha, usuarioEncontrado.senha);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    if (!usuarioEncontrado.validacao) {
      return res.status(401).json({ error: "E-mail não foi verificado" });
    }

    res.status(200).json({
      message: "Login realizado com sucesso!",
      usuario: usuarioEncontrado,
    });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).json({ error: "Erro ao realizar login" });
  }
});

// ================= Login Empresa =================
app.post('/login-empresa', async (req, res) => {
  try {
    const { cnpj, senha } = req.body;
    const empresa = await prisma.empresa.findUnique({ where: { cnpj } });

    if (!empresa) return res.status(401).json({ error: 'CNPJ não encontrado' });

    const isPasswordValid = await bcrypt.compare(senha, empresa.senha);

    if (!isPasswordValid) return res.status(401).json({ error: 'Senha incorreta' });

    res.status(200).json({ message: 'Login realizado com sucesso!', empresa });
  } catch (error) {
    console.error('Erro no login da empresa:', error);
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
});

// ================= Lista de Usuários =================
app.get("/users", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany();
    res.status(200).json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

// ================= Inicia Servidor =================
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
