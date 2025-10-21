const express = require("express");
const router = express.Router();
const { autenticarToken } = require("../middlewares/authMiddleware");
const {
  getUsuario,
  updateUsuario,
  updateBannerUrl,
  updateFotoUrl,
} = require("../controllers/userProfileController");
const { upload } = require("../middlewares/uploadMiddleware");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// --- Rotas do perfil do usuário ---
router.get("/usuario/:id", autenticarToken, getUsuario);
router.put("/usuario/:id", autenticarToken, updateUsuario);
router.put("/usuario/:id/banner", autenticarToken, updateBannerUrl);
router.put("/usuario/:id/foto", autenticarToken, updateFotoUrl);

// --- Upload local de imagem do dispositivo ---
router.post(
  "/usuario/:id/upload/:tipo",
  autenticarToken,
  upload.single("imagem"),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });

      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
      const { tipo } = req.params;

      let updateData = {};
      if (tipo === "foto") updateData = { fotoUrl: fileUrl };
      else if (tipo === "banner") updateData = { bannerUrl: fileUrl };
      else return res.status(400).json({ error: "Tipo inválido (use 'foto' ou 'banner')." });

      const usuario = await prisma.usuario.update({
        where: { id: req.params.id },
        data: updateData,
        select: { id: true, fotoUrl: true, bannerUrl: true },
      });

      res.json({
        message: "Imagem enviada e salva com sucesso!",
        usuario,
      });
    } catch (error) {
      console.error("Erro no upload:", error);
      next(error);
    }
  }
);

module.exports = router;
