// src/controllers/userProfileController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* -------------------- Helpers -------------------- */
// Normaliza entrada em array (["Manhã","Noite"]) aceitando array ou string
function toArrayOrUndefined(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return [];
    // aceita "Manhã,Noite" ou "Manhã;Noite"
    return s.split(/[;,]/).map(v => v.trim()).filter(Boolean);
  }
  return undefined;
}

// Cálculo do progresso considerando preferenciaHorario como array
function calcularProgresso(u) {
  let p = 0;
  if (u?.nome) p += 10;
  if (u?.usuario) p += 10;
  if (u?.descricao) p += 20;
  if (u?.competencias && u.competencias.length > 0) p += 20;

  const temHorario = Array.isArray(u?.preferenciaHorario)
    ? u.preferenciaHorario.length > 0
    : Boolean(u?.preferenciaHorario);
  if (temHorario) p += 10;

  if (u?.emailcontato) p += 15;
  if (u?.telefonecontato) p += 15;
  return p;
}

exports.getUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log("[getUsuario] Buscando usuário com ID:", id);

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        usuario: true,
        descricao: true,
        competencias: true,
        preferenciaHorario: true, // agora é array no schema
        emailcontato: true,
        telefonecontato: true,
        validacao: true,
        bannerUrl: true,
        fotoUrl: true,
      },
    });

    console.log("[getUsuario] Usuário encontrado:", !!usuario);
    if (!usuario)
      return res.status(404).json({ error: "Usuário não encontrado." });

    const progresso = calcularProgresso(usuario);
    console.log("[getUsuario] Retornando dados do usuário com progresso:", progresso);
    res.json({ ...usuario, progresso });
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    next(error);
  }
};

exports.updateUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      nome,
      usuario,
      descricao,
      competencias,
      preferenciaHorario,
      emailcontato,
      telefonecontato,
    } = req.body;

    const competenciasArray = Array.isArray(competencias)
      ? competencias
      : typeof competencias === "string" && competencias.length
      ? competencias.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    const preferenciaHorarioArray = toArrayOrUndefined(preferenciaHorario);

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: {
        ...(nome && { nome }),
        ...(usuario && { usuario }),
        ...(descricao && { descricao }),
        ...(competenciasArray && { competencias: competenciasArray }),
        ...(preferenciaHorarioArray !== undefined && {
          preferenciaHorario: preferenciaHorarioArray,
        }),
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
        bannerUrl: true,
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
