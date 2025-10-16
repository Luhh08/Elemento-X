const express = require("express");
const router = express.Router();
const {
  registrarUsuario,
  verificarEmail,
  loginUsuario,
  listarUsuarios,
} = require("../controllers/userController");

router.post("/users", registrarUsuario);
router.get("/verify-email", verificarEmail);
router.post("/login", loginUsuario);
router.get("/users", listarUsuarios);

module.exports = router;
