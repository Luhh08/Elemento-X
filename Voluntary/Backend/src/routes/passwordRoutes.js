const express = require("express");
const router = express.Router();
const {
  enviarCodigoReset,
  verificarCodigoReset,
  resetarSenha
} = require("../controllers/passwordController");

router.post("/forgot-password", enviarCodigoReset);
router.post("/verify-reset-code", verificarCodigoReset);
router.post("/reset-password", resetarSenha); // nova rota

module.exports = router;
