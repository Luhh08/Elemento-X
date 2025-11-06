const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /api/vagas?status=ABERTA&tag=Saude&empresaId=...
async function listarVagasPublicas(req, res, next) {
  try {
    const { status, tag, empresaId } = req.query;
    const where = {};
    if (status) where.status = String(status);
    if (empresaId) where.empresaId = String(empresaId);
    if (tag) where.tags = { has: String(tag) };

    const vagas = await prisma.vaga.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    res.json(vagas);
  } catch (e) {
    next(e);
  }
}

async function getVaga(req, res, next) {
  try {
    const { id } = req.params;
    const vaga = await prisma.vaga.findUnique({
      where: { id },
      include: { empresa: { select: { razao_social: true } } } // 👈
    });
    if (!vaga) return res.status(404).json({ error: "Vaga não encontrada" });
    res.json(vaga);
  } catch (e) { next(e); }
}

async function atualizarVaga(req, res, next) {
  try {
    const { id } = req.params;

    const {
      titulo = "",
      descricao = "",
      local = "",
      status = "ABERTA",
      dataInicio,
      dataFim,
    } = req.body;

    const toArray = (v) => []
      .concat(v || [])
      .flat()
      .map((x) => String(x).trim())
      .filter(Boolean);

    const tags   = toArray(req.body.tags);
    const turnos = toArray(req.body.turno);
    const dtInicio = dataInicio ? new Date(dataInicio) : null;
    const dtFim    = dataFim    ? new Date(dataFim)    : null;
    const imagensExistentes = toArray(req.body.imagens_existentes);
    const novasImagens = (req.files || []).map((f) => {
      return "/" + path.join("uploads", path.basename(f.path)).replace(/\\/g, "/");
    });

    const imagensFinal = [...imagensExistentes, ...novasImagens];

    const updated = await prisma.vaga.update({
      where: { id },
      data: {
        titulo,
        descricao,
        local,
        status,
        tags,
        turno: turnos,       
        dataInicio: dtInicio,
        dataFim: dtFim,
        imagens: imagensFinal,
      },
      select: { id: true },
    });

    res.json(updated);
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ error: "Vaga não encontrada" });
    }
    next(e);
  }
}

module.exports = {
  listarVagasPublicas,
  getVaga,
  atualizarVaga, 
};