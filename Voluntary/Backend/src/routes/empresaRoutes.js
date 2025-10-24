const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const {
  registrarEmpresa,
  verificarEmail,
  solicitarRedefinicao,
  redefinirSenha,
  obterPerfilPorId,  
  getEmpresa,
  updateEmpresa,
  uploadImagem,
  listarVagasDaEmpresa,
  criarVagaParaEmpresa,
  loginEmpresa,
} = require("../controllers/empresaController");

const router = express.Router();

router.post("/empresas", registrarEmpresa);                  
router.post("/empresas/login", loginEmpresa);               
router.get("/empresas/verify", verificarEmail);             
router.post("/empresas/forgot-password", solicitarRedefinicao); 
router.post("/empresas/reset-password", redefinirSenha);    

router.get("/empresas/:id", getEmpresa);                    
router.put("/empresas/:id", updateEmpresa);                

router.get("/empresas/perfil/:id", obterPerfilPorId);       

// === Multer (já existe aqui) ===
const uploadsDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${name}${ext}`);
  },
});
const upload = multer({ storage });


router.post(
  "/empresas/:id/upload/:tipo",            
  upload.single("imagem"),
  uploadImagem
);


router.get("/empresas/:id/vagas", listarVagasDaEmpresa);

router.post(
  "/empresas/:id/vagas",
  upload.array("imagens", 8),             
  criarVagaParaEmpresa
);

module.exports = router;
