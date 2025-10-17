// src/controllers/verifyController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");

const verifyEmail = async (req, res) => {
  const { token } = req.query;
  const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000"; 

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await prisma.usuario.findUnique({ where: { email: decoded.email } });
    if (!usuario) {
      console.error("Usuário não encontrado para o email no token.");
      return res.redirect(`${frontendBaseUrl}/verify-email.html?status=user_not_found`);
    }

    if (usuario.validacao) {
      console.log("Usuário já estava validado.");
      return res.redirect(`${frontendBaseUrl}/verify-email.html?status=already_verified`);
    }

    await prisma.usuario.update({
      where: { email: decoded.email },
      data: { validacao: true, validacaoToken: null },
    });

    res.redirect(`${frontendBaseUrl}/verify-email.html?status=success`);
  } catch (error) {
    console.error("Erro ao verificar token:", error);
    res.redirect(`${frontendBaseUrl}/verify-email.html?status=error`);
  }
};

module.exports = { verifyEmail };
