const express = require("express");
const router = express.Router();

// ✅ ambos exportando função/instância direta
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadFeedback");

const {
  criarAvaliacao,
  resumoEmpresa,
  listarAvaliacaoEmpresa,
  responderAvaliacao,
} = require("../controllers/avaliacaoController");

// Voluntário cria avaliação (com fotos)
router.post("/avaliacoes", authMiddleware, upload.array("fotos", 6), criarAvaliacao);

// Público: resumo e listagem por empresa
router.get("/empresas/:empresaId/avaliacoes/summary", resumoEmpresa);
router.get("/empresas/:empresaId/avaliacoes", listarAvaliacaoEmpresa);

// Empresa responde avaliação
router.post("/avaliacoes/:id/resposta", authMiddleware, responderAvaliacao);

module.exports = router;
