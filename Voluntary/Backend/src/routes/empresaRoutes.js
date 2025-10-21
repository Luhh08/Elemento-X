const express = require("express");
const {
  registrarEmpresa,
  verificarEmail,
  solicitarRedefinicao,
  redefinirSenha,
  obterPerfilPorId,
} = require("../controllers/empresaController");

const router = express.Router();

// Prefixo: /api/empresas
router.post("/empresas", registrarEmpresa); // agora cria empresa + representante
router.get("/empresas/verify", verificarEmail);
router.post("/empresas/forgot-password", solicitarRedefinicao);
router.post("/empresas/reset-password", redefinirSenha);
router.get("/empresas/perfil/:id", obterPerfilPorId);

module.exports = router;
