const express = require("express");
const { listarVagasPublicas, getVaga } = require("../controllers/vagaController");

const router = express.Router();

// públicas
router.get("/vagas", listarVagasPublicas);
router.get("/vagas/:id", getVaga);

module.exports = router;
