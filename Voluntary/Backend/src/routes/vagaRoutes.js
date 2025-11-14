const express = require("express");
const { listarVagasPublicas, getVaga, atualizarVaga, listarTagsDoSistema, deletarVaga } = require("../controllers/vagaController");
const authMiddleware = require("../middlewares/authMiddleware");

const multer = require("multer");
const upload = multer({ dest: "uploads/" }); 

const router = express.Router();

router.get("/vagas", listarVagasPublicas);
router.get("/vagas/:id", getVaga);
router.put("/vagas/:id", authMiddleware, upload.array("imagens", 8), atualizarVaga);
router.delete("/vagas/:id", authMiddleware, deletarVaga);

router.get('/tags', listarTagsDoSistema);

module.exports = router;
