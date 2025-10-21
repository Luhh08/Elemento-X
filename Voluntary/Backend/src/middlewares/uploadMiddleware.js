const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Caminho para a pasta /uploads (cria automaticamente se não existir)
const uploadPath = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

// Filtro de tipos de arquivo (só imagens)
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Formato de imagem inválido. Use JPG, PNG ou WEBP."));
};

// Inicializa o multer
const upload = multer({ storage, fileFilter });

module.exports = { upload };
