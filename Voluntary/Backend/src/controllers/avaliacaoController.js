const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const path = require("path");

// Verifica se voluntário realmente participou (candidatura aceita e vaga finalizada)
async function canUserReview(vagaId, voluntarioId){
  const vaga = await prisma.vaga.findUnique({ where: { id: vagaId }, select: { status: true, empresaId: true } });
  if(!vaga) return { ok:false };
  const cand = await prisma.candidatura.findUnique({
    where: { vagaId_voluntarioId: { vagaId, voluntarioId } },
    select: { status: true }
  });
  const elegivel = vaga.status === "FINALIZADA" || (cand?.status === "ACEITA");
  return { ok: !!elegivel, empresaId: vaga.empresaId };
}

// POST /api/avaliacoes  (voluntário)
async function criarAvaliacao(req, res, next){
  try{
    const voluntarioId = req.user?.id;
    const { vagaId, nota, comentario } = req.body;
    if(!voluntarioId) return res.status(401).json({ error: "Não autenticado." });
    if(!vagaId) return res.status(400).json({ error: "vagaId é obrigatório." });
    const n = Number(nota);
    if(!(n >=1 && n <=5)) return res.status(400).json({ error: "nota deve ser 1..5" });

    const gate = await canUserReview(vagaId, voluntarioId);
    if(!gate.ok) return res.status(400).json({ error: "Você ainda não pode avaliar esta vaga." });

    const fotos = (req.files || []).map(f => path.posix.join("uploads", path.basename(f.filename)));

    const created = await prisma.avaliacao.create({
      data:{
        vagaId, voluntarioId, nota: n, comentario: String(comentario || "").trim(), fotos
      },
      select:{ id:true }
    });

    res.status(201).json({ ok:true, id: created.id });
  }catch(e){ next(e); }
}

// GET /api/empresas/:empresaId/avaliacoes/summary (público)
async function resumoEmpresa(req, res, next){
  try{
    const { empresaId } = req.params;

    // pega todas as avaliações de vagas dessa empresa
    const agg = await prisma.avaliacao.groupBy({
      by: ['nota'],
      where: { vaga: { empresaId } },
      _count: { nota: true }
    });
    const total = agg.reduce((s,a)=>s + a._count.nota, 0);
    const porEstrela = { 1:0,2:0,3:0,4:0,5:0 };
    agg.forEach(a => { porEstrela[a.nota] = a._count.nota; });

    const media = total ? (
      (1*porEstrela[1] + 2*porEstrela[2] + 3*porEstrela[3] + 4*porEstrela[4] + 5*porEstrela[5]) / total
    ) : 0;

    // amostra recente (para preview)
    const recentes = await prisma.avaliacao.findMany({
      where: { vaga: { empresaId } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true, nota: true, comentario: true, createdAt: true,
        vaga: { select:{ id:true, titulo:true } },
        resposta:{ select:{ mensagem:true, createdAt:true } }
      }
    });

    res.json({ total, media: Number(media.toFixed(2)), porEstrela, recentes });
  }catch(e){ next(e); }
}

// GET /api/empresas/:empresaId/avaliacoes (público, paginado)
async function listarAvaliacaoEmpresa(req, res, next){
  try{
    const { empresaId } = req.params;
    const page = Math.max(1, parseInt(req.query.page||'1',10));
    const pageSize = Math.max(1, Math.min(50, parseInt(req.query.pageSize||'10',10)));
    const skip = (page-1)*pageSize;

    const [items, total] = await Promise.all([
      prisma.avaliacao.findMany({
        where: { vaga: { empresaId } },
        orderBy: { createdAt: 'desc' },
        skip, take: pageSize,
        select: {
          id:true, nota:true, comentario:true, fotos:true, createdAt:true,
          vaga: { select: { id:true, titulo:true } },
          voluntario: { select: { id:true, nome:true, usuario:true, fotoUrl:true } },
          resposta: { select: { id:true, mensagem:true, createdAt:true, updatedAt:true } }
        }
      }),
      prisma.avaliacao.count({ where: { vaga: { empresaId } } })
    ]);

    res.json({ items, total, page, pageSize });
  }catch(e){ next(e); }
}

// POST /api/avaliacoes/:id/resposta (empresa dona da vaga)
async function responderAvaliacao(req, res, next){
  try{
    const empresaIdAut = req.user?.empresaId || req.user?.id; // sua auth de empresa
    if(!empresaIdAut) return res.status(401).json({ error: "Empresa não autenticada." });
    const { id } = req.params;
    const { mensagem } = req.body;

    // checa se avaliação é de vaga dessa empresa
    const av = await prisma.avaliacao.findUnique({
      where: { id },
      select: { vaga: { select: { empresaId:true } } }
    });
    if(!av) return res.status(404).json({ error: "Avaliação não encontrada." });
    if(String(av.vaga.empresaId) !== String(empresaIdAut)) return res.status(403).json({ error: "Sem permissão." });

    // upsert da resposta
    const saved = await prisma.respostaAvaliacao.upsert({
      where: { avaliacaoId: id },
      update: { mensagem: String(mensagem||"").trim() },
      create: { avaliacaoId: id, empresaId: empresaIdAut, mensagem: String(mensagem||"").trim() }
    });

    res.json({ ok:true, resposta: saved });
  }catch(e){ next(e); }
}

module.exports = {
  criarAvaliacao,
  resumoEmpresa,
  listarAvaliacaoEmpresa,
  responderAvaliacao
};
