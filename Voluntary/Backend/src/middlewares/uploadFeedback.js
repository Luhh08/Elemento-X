const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, "../../uploads")),
  filename: (_req, file, cb) => {
    const ts  = Date.now();
    const rnd = Math.random().toString(36).slice(2, 10);
    const ext = path.extname(file.originalname || ".jpg");
    cb(null, `${ts}-${rnd}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!/^image\//.test(file.mimetype || "")) {
    return cb(new Error("Arquivo deve ser uma imagem"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload; // ✅ export direto (sem objeto)
