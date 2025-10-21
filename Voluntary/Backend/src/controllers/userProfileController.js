const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * GET /api/usuario/:id
 * Retorna os dados do perfil + progresso (%)
 */
exports.getUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        usuario: true,
        descricao: true,
        competencias: true,
        preferenciaHorario: true,
        emailcontato: true,
        telefonecontato: true,
        validacao: true,
        bannerUrl: true,
        fotoUrl: true,
      },
    });

    if (!usuario)
      return res.status(404).json({ error: "Usuário não encontrado." });

    const progresso = calcularProgresso(usuario);
    res.json({ ...usuario, progresso });
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    next(error);
  }
};

/**
 * PUT /api/usuario/:id
 * Atualiza campos do perfil (exceto nome e usuário)
 */
exports.updateUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, usuario, descricao, competencias, preferenciaHorario, emailcontato, telefonecontato } = req.body;

    const competenciasArray = Array.isArray(competencias)
      ? competencias
      : typeof competencias === "string" && competencias.length
      ? competencias.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: {
        ...(nome && { nome }),                    // ✅ agora permite editar o nome
        ...(usuario && { usuario }),              // ✅ agora permite editar o @usuario
        ...(descricao && { descricao }),
        ...(competenciasArray && { competencias: competenciasArray }),
        ...(preferenciaHorario && { preferenciaHorario }),
        ...(emailcontato && { emailcontato }),
        ...(telefonecontato && { telefonecontato }),
      },
      select: {
        id: true,
        nome: true,
        usuario: true,
        descricao: true,
        competencias: true,
        preferenciaHorario: true,
        emailcontato: true,
        telefonecontato: true,
        validacao: true,
        bannerUrl: true,  // ✅ garante que o frontend veja a imagem
        fotoUrl: true,
      },
    });

    const progresso = calcularProgresso(usuarioAtualizado);
    res.json({
      message: "Perfil atualizado com sucesso!",
      usuario: { ...usuarioAtualizado, progresso },
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    next(error);
  }
};


/**
 * PUT /api/usuario/:id/banner
 * Atualiza a URL do banner
 */
exports.updateBannerUrl = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bannerUrl } = req.body;

    if (!bannerUrl)
      return res
        .status(400)
        .json({ error: "É necessário enviar a URL do banner." });

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: { bannerUrl },
      select: { id: true, bannerUrl: true },
    });

    res.json({
      message: "Banner atualizado com sucesso!",
      usuario: usuarioAtualizado,
    });
  } catch (error) {
    console.error("Erro ao atualizar banner:", error);
    next(error);
  }
};

/**
 * PUT /api/usuario/:id/foto
 * Atualiza a URL da foto do perfil
 */
exports.updateFotoUrl = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fotoUrl } = req.body;

    if (!fotoUrl)
      return res
        .status(400)
        .json({ error: "É necessário enviar a URL da foto." });

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: { fotoUrl },
      select: { id: true, fotoUrl: true },
    });

    res.json({
      message: "Foto atualizada com sucesso!",
      usuario: usuarioAtualizado,
    });
  } catch (error) {
    console.error("Erro ao atualizar foto:", error);
    next(error);
  }
};

/**
 * GET /api/usuario/:id/progresso
 * Retorna apenas a % de progresso
 */
exports.getProgressoPerfil = async (req, res, next) => {
  try {
    const { id } = req.params;
    const u = await prisma.usuario.findUnique({ where: { id } });
    if (!u)
      return res.status(404).json({ error: "Usuário não encontrado." });
    res.json({ progresso: calcularProgresso(u) });
  } catch (error) {
    console.error("Erro ao calcular progresso:", error);
    next(error);
  }
};

// --------------------
// Função auxiliar
// --------------------
function calcularProgresso(u) {
  let p = 0;
  if (u?.nome) p += 10;
  if (u?.usuario) p += 10;
  if (u?.descricao) p += 20;
  if (u?.competencias && u.competencias.length > 0) p += 20;
  if (u?.preferenciaHorario) p += 10;
  if (u?.emailcontato) p += 15;
  if (u?.telefonecontato) p += 15;
  return p;
}
