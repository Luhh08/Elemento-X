const express = require("express");
const { listarVagasPublicas, getVaga, atualizarVaga, listarTagsDoSistema } = require("../controllers/vagaController");

const multer = require("multer");
const upload = multer({ dest: "uploads/" }); 

const router = express.Router();

router.get("/vagas", listarVagasPublicas);
router.get("/vagas/:id", getVaga);
router.put("/vagas/:id", upload.array("imagens", 8), atualizarVaga);

router.get('/tags', listarTagsDoSistema);

module.exports = router;
