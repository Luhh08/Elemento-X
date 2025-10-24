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

module.exports = { listarVagasPublicas, getVaga };
