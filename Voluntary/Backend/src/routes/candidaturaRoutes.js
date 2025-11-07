const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  criarCandidatura,
  listarCandidaturas,
  listarCandidaturasDaVaga,
  atualizarStatus,
} = require("../controllers/candidaturaController");

router.post("/candidaturas", authMiddleware, criarCandidatura);
router.get("/candidaturas", authMiddleware, listarCandidaturas);
router.get("/candidaturas/vaga/:vagaId", authMiddleware, listarCandidaturasDaVaga);
router.patch("/candidaturas/:id/status", authMiddleware, atualizarStatus);

module.exports = router;
