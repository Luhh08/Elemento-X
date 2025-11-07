const express = require("express");
const router = express.Router();
const { autenticarToken } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/candidaturaController");

router.post("/candidaturas", autenticarToken, ctrl.criarCandidatura);
router.get("/candidaturas", autenticarToken, ctrl.listarCandidaturas);
router.get("/candidaturas/da-vaga/:vagaId", autenticarToken, ctrl.listarCandidaturasDaVaga);
router.patch("/candidaturas/:id", autenticarToken, ctrl.atualizarStatus);

module.exports = router;
