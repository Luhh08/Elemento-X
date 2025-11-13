const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
  listarNotificacoes,
  marcarNotificacaoLida,
  marcarTodasLidas,
} = require("../controllers/notificacaoController");

router.get("/notificacoes", authMiddleware, listarNotificacoes);
router.patch("/notificacoes/:id/lida", authMiddleware, marcarNotificacaoLida);
router.post("/notificacoes/marcar-todas", authMiddleware, marcarTodasLidas);

module.exports = router;
