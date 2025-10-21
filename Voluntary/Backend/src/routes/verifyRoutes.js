const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

// =============================
// ROTA UNIFICADA: VERIFICAR E-MAIL
// =============================
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token)
      return res.redirect("/verify-email.html?status=error");

    // Verifica se o token é de um usuário ou empresa
    const usuario = await prisma.usuario.findFirst({ where: { validacaoToken: token } });
    const empresa = await prisma.empresa.findFirst({ where: { validacaoToken: token } });

    const conta = usuario || empresa;
    if (!conta)
      return res.redirect("/verify-email.html?status=user_not_found");

    if (conta.validacao)
      return res.redirect("/verify-email.html?status=already_verified");

    if (usuario) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { validacao: true, validacaoToken: null },
      });
    } else {
      await prisma.empresa.update({
        where: { id: empresa.id },
        data: { validacao: true, validacaoToken: null },
      });
    }

    return res.redirect("/verify-email.html?status=success");
  } catch (err) {
    console.error("Erro em verify-email:", err);
    res.redirect("/verify-email.html?status=error");
  }
});

module.exports = router;
