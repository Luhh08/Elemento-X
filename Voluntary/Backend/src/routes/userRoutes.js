const express = require("express");
const {
  registrarUsuario,
  verificarEmail,
  loginUsuario,
  listarUsuarios,
} = require("../controllers/userController");

const router = express.Router();

router.post("/users", registrarUsuario);       
router.post("/users/login", loginUsuario);      
router.get("/users", listarUsuarios);           
router.get("/users/verify", verificarEmail);    

module.exports = router;
