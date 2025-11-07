const express = require("express");
const {
  registrarUsuario,
  verificarEmail,
  loginUsuario,
  listarUsuarios,
  listarCompetenciasUsuarios,
} = require("../controllers/userController");

const router = express.Router();

router.post("/users", registrarUsuario);       
router.post("/users/login", loginUsuario);      
router.get("/users", listarUsuarios);           
router.get("/users/verify", verificarEmail);    
router.get("/users/tags", listarCompetenciasUsuarios);

module.exports = router;
