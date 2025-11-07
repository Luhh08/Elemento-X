const express = require("express");
const router = express.Router();
const { criar, listar, atualizarStatus } = require("../controllers/candidaturaController");
const { autenticarToken } = require("../middlewares/authMiddleware");


router.get("/candidaturas", listar);
router.post("/candidaturas", autenticarToken, criar);
router.patch("/candidaturas/:id", autenticarToken, atualizarStatus);

module.exports = router;
