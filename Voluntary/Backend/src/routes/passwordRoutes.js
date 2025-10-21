const express = require("express");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

// =============================
// ROTA UNIFICADA: ESQUECI A SENHA (envia código)
// =============================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "E-mail é obrigatório." });

    // Procura tanto em Usuario quanto em Empresa
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    const empresa = await prisma.empresa.findUnique({ where: { email } });

    const conta = usuario || empresa;
    if (!conta) return res.status(404).json({ error: "Conta não encontrada." });

    // Gera código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Atualiza o código e validade no banco
    if (usuario) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { resetToken: codigo, resetTokenExpires: expires },
      });
    } else {
      await prisma.empresa.update({
        where: { id: empresa.id },
        data: { resetToken: codigo, resetTokenExpires: expires },
      });
    }

    // Configura o transporte de e-mail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    // Envia o e-mail com o código
    await transporter.sendMail({
      from: `"Equipe Voluntary 👋" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Código para redefinir sua senha",
      html: `
        <h2>Redefinição de senha</h2>
        <p>Olá <b>${conta.nome || conta.razao_social || ""}</b>,</p>
        <p>Use o código abaixo para redefinir sua senha. Ele é válido por 15 minutos:</p>
        <div style="font-size: 28px; font-weight: bold; color: #4CAF50; margin: 10px 0;">
          ${codigo}
        </div>
        <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
      `,
    });

    return res.json({ message: "Código de redefinição enviado com sucesso!" });
  } catch (err) {
    console.error("Erro em forgot-password:", err);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// =============================
// ROTA UNIFICADA: REDEFINIR SENHA (valida código)
// =============================
router.post("/reset-password", async (req, res) => {
  try {
    const { codigo, senha } = req.body;
    if (!codigo || !senha)
      return res.status(400).json({ error: "Código e senha são obrigatórios." });

    // Verifica se o código pertence a usuário ou empresa
    const usuario = await prisma.usuario.findFirst({
      where: { resetToken: codigo, resetTokenExpires: { gt: new Date() } },
    });
    const empresa = await prisma.empresa.findFirst({
      where: { resetToken: codigo, resetTokenExpires: { gt: new Date() } },
    });

    const conta = usuario || empresa;
    if (!conta) return res.status(400).json({ error: "Código inválido ou expirado." });

    const hashed = await bcrypt.hash(senha, 10);

    if (usuario) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { senha: hashed, resetToken: null, resetTokenExpires: null },
      });
    } else {
      await prisma.empresa.update({
        where: { id: empresa.id },
        data: { senha: hashed, resetToken: null, resetTokenExpires: null },
      });
    }

    return res.json({ message: "Senha redefinida com sucesso!" });
  } catch (err) {
    console.error("Erro em reset-password:", err);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
});

module.exports = router;
