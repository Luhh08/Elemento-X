const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { sendVerificationEmail } = require("../utils/sendEmail");

const prisma = new PrismaClient();

// ================================
// Registrar empresa + representante no mesmo endpoint
// ================================
async function registrarEmpresa(req, res) {
  try {
    const { empresa, representante } = req.body;

    if (!empresa || !representante) {
      return res.status(400).json({ error: "Dados de empresa e representante são obrigatórios." });
    }

    const { razao_social, email, senha, cnpj, telefone_empresa, endereco, cep } = empresa;
    const { nome, cpf, cargo, email_representante, telefone_representante } = representante;

    // --- validações ---
    if (!razao_social || !email || !senha || !cnpj || !telefone_empresa || !endereco || !cep) {
      return res.status(400).json({ error: "Preencha todos os campos da empresa." });
    }
    if (!nome || !cpf || !cargo || !email_representante || !telefone_representante) {
      return res.status(400).json({ error: "Preencha todos os campos do representante." });
    }

    // --- criação da empresa ---
    const hashed = await bcrypt.hash(senha, 10);
    const token = crypto.randomBytes(24).toString("hex");

    const novaEmpresa = await prisma.empresa.create({
      data: {
        razao_social,
        email,
        senha: hashed,
        cnpj,
        telefone_empresa,
        endereco,
        cep,
        validacaoToken: token,
      },
    });

    // --- cria representante vinculado ---
    await prisma.representanteLegal.create({
      data: {
        nome,
        cpf,
        cargo,
        email_representante,
        telefone_representante,
        empresaId: novaEmpresa.id,
      },
    });

    // --- envia e-mail de verificação ---
    await sendVerificationEmail(email, token);

    return res.status(201).json({ message: "Empresa e representante cadastrados. Verifique seu e-mail." });
  } catch (err) {
    console.error("registrarEmpresa error:", err);
    if (err.code === "P2002") {
      return res.status(409).json({ error: "E-mail, CPF ou CNPJ já cadastrado." });
    }
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}

// ================================
// Verificar e-mail via token
// ================================
async function verificarEmail(req, res) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token ausente");

    const empresa = await prisma.empresa.findFirst({ where: { validacaoToken: token } });
    if (!empresa) return res.status(404).send("Token inválido ou empresa não encontrada");

    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { validacao: true, validacaoToken: null },
    });

    return res.redirect(`${process.env.FRONTEND_URL}/verify-empresa-success`);
  } catch (err) {
    console.error("verificarEmail error:", err);
    return res.status(500).send("Erro ao verificar e-mail");
  }
}

// ================================
// Solicitar redefinição de senha
// ================================
async function solicitarRedefinicao(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Informe o e-mail" });

    const empresa = await prisma.empresa.findUnique({ where: { email } });
    if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

    const token = crypto.randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { resetToken: token, resetTokenExpires: expires },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-empresa?token=${token}`;

    const transporter = require("nodemailer").createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Equipe Voluntary 👋" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Redefinição de senha",
      html: `
        <h2>Redefinir senha</h2>
        <p>Olá ${empresa.razao_social || ""}, clique abaixo para redefinir sua senha:</p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 15px;background:#ff6b6b;color:white;border-radius:5px;text-decoration:none;">Redefinir senha</a>
        <p>Ou copie este link:</p>
        <p>${resetUrl}</p>
      `,
    });

    return res.json({ message: "E-mail de redefinição enviado" });
  } catch (err) {
    console.error("solicitarRedefinicao error:", err);
    return res.status(500).json({ error: "Erro ao enviar e-mail de redefinição" });
  }
}

// ================================
// Redefinir senha com token
// ================================
async function redefinirSenha(req, res) {
  try {
    const { token, senha } = req.body;
    if (!token || !senha) return res.status(400).json({ error: "Token e nova senha são obrigatórios" });

    const empresa = await prisma.empresa.findFirst({
      where: { resetToken: token, resetTokenExpires: { gt: new Date() } },
    });
    if (!empresa) return res.status(400).json({ error: "Token inválido ou expirado" });

    const hashed = await bcrypt.hash(senha, 10);
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { senha: hashed, resetToken: null, resetTokenExpires: null },
    });
    return res.json({ message: "Senha redefinida com sucesso" });
  } catch (err) {
    console.error("redefinirSenha error:", err);
    return res.status(500).json({ error: "Erro ao redefinir senha" });
  }
}

// ================================
// Obter perfil público por ID
// ================================
async function obterPerfilPorId(req, res) {
  try {
    const { id } = req.params;
    const empresa = await prisma.empresa.findUnique({
      where: { id },
      select: {
        id: true,
        razao_social: true,
        email: true,
        telefone_empresa: true,
        endereco: true,
        cep: true,
        validacao: true,
        criadoEm: true,
        representantes: true,
      },
    });
    if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });
    return res.json(empresa);
  } catch (err) {
    console.error("obterPerfilPorId error:", err);
    return res.status(500).json({ error: "Erro ao buscar perfil" });
  }
}

module.exports = {
  registrarEmpresa,
  verificarEmail,
  solicitarRedefinicao,
  redefinirSenha,
  obterPerfilPorId,
};
