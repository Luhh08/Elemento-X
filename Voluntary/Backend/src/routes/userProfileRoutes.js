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

// --- Upload de imagem local (foto/banner) ---
router.post(
  "/usuario/:id/upload/:tipo",
  autenticarToken,
  upload.single("imagem"),
  async (req, res, next) => {
    try {
      if (!req.file)
        return res.status(400).json({ error: "Nenhum arquivo enviado." });

      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
      const { tipo } = req.params;
      const { id } = req.params;

      // --- Segurança: impede alterar imagem de outro usuário ---
      if (id !== req.userId) {
        return res
          .status(403)
          .json({ error: "Você não pode alterar imagens de outro perfil." });
      }

      const updateData =
        tipo === "foto"
          ? { fotoUrl: fileUrl }
          : tipo === "banner"
          ? { bannerUrl: fileUrl }
          : null;

      if (!updateData)
        return res.status(400).json({ error: "Tipo inválido (foto/banner)." });

      const usuario = await prisma.usuario.update({
        where: { id },
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
