const { PrismaClient } = require('@prisma/client');
const { sendAdminNotice, tplBanimento, tplDesbanimento } = require('../utils/mailBan');
const prisma = new PrismaClient();

function parseTipo(tipo) {
  if (['usuario','usuarios'].includes(tipo)) return 'usuario';
  if (['empresa','empresas'].includes(tipo)) return 'empresa';
  if (['vaga','vagas'].includes(tipo)) return 'vaga';
  if (['denuncia','denuncias'].includes(tipo)) return 'denuncia';
  if (['feedback','feedbacks'].includes(tipo)) return 'feedback';
  return null;
}

async function getPainelDados(req, res) {
  try {
    const [usuarios, empresas, vagas, denuncias, avaliacaos] = await Promise.all([
      prisma.usuario.findMany({
        select: { id:true, nome:true, email:true, usuario:true, validacao:true, isBanned:true, banReason:true }
      }),
      prisma.empresa.findMany({
        select: { id:true, razao_social:true, email:true, usuario:true, isBanned:true, banReason:true }
      }),
      prisma.vaga.findMany({
        select: { id:true, titulo:true, empresaId:true, status:true, isBanned:true,
                  empresa:{ select:{ razao_social:true, usuario:true, email:true } } }
      }),
      prisma.denuncia.findMany({
        orderBy: { criadoEm: 'desc' },
        take: 200,
        include: { quemDenunciou: { select: { id: true, nome: true, usuario: true, email: true } } }
      }),
      prisma.avaliacao.findMany({
        orderBy: { criadoEm: 'desc' },
        take: 200,
        include: { 
          vaga: { select: { id: true, titulo: true } },
          voluntario: { select: { id: true, nome: true, usuario: true, email: true } }
        }
      })
    ]);
    res.json({ usuarios, empresas, vagas, denuncias, feedback: avaliacaos });
  } catch (e) {
    console.error('getPainelDados', e);
    res.status(500).json({ error: 'Falha ao obter dados' });
  }
}

async function banirRecurso(req, res) {
  try {
    const tipo = parseTipo(req.params.tipo);
    const id   = String(req.params.id || '');
    if (!tipo || !id) return res.status(400).json({ error: 'Parâmetros inválidos' });

    const { reason } = req.body || {};
    const data = { isBanned: true, banReason: reason || 'Violação das regras'};

    if (tipo === 'usuario') {
      const u = await prisma.usuario.update({ where: { id }, data });
      // e-mail pro usuário
      await sendAdminNotice(u.email, 'Sua conta foi banida', tplBanimento({ nome: u.nome || u.usuario, motivo: data.banReason }));
    } else if (tipo === 'empresa') {
      const e = await prisma.empresa.update({ where: { id }, data });
      await sendAdminNotice(e.email, 'Sua conta foi banida', tplBanimento({ nome: e.razao_social || e.usuario, motivo: data.banReason }));
    } else if (tipo === 'vaga') {
      await prisma.vaga.update({ where: { id }, data });
    } else {
      return res.status(400).json({ error: 'Tipo não suportado para ban' });
    }

    return res.json({ message: 'Registro banido com sucesso.' });
  } catch (e) {
    console.error('banirRecurso', e);
    return res.status(500).json({ error: 'Falha ao banir' });
  }
}

async function desbanir(req, res) {
  try {
    const tipo = parseTipo(req.params.tipo);
    const id   = String(req.params.id || '');
    if (!tipo || !id) return res.status(400).json({ error: 'Parâmetros inválidos' });

    const clear = { isBanned:false, banReason:null};

    if (tipo === 'usuario') {
      const u = await prisma.usuario.update({ where: { id }, data: clear });
      await sendAdminNotice(u.email, 'Sua conta foi reativada', tplDesbanimento({ nome: u.nome || u.usuario }));
    } else if (tipo === 'empresa') {
      const e = await prisma.empresa.update({ where: { id }, data: clear });
      await sendAdminNotice(e.email, 'Sua conta foi reativada', tplDesbanimento({ nome: e.razao_social || e.usuario }));
    } else if (tipo === 'vaga') {
      await prisma.vaga.update({ where: { id }, data: clear });
    } else {
      return res.status(400).json({ error: 'Tipo não suportado para desbanir' });
    }

    return res.json({ message: 'Registro desbanido.' });
  } catch (e) {
    console.error('desbanir', e);
    return res.status(500).json({ error: 'Falha ao desbanir' });
  }
}

async function removerItem(req, res) {
  try {
    const tipo = parseTipo(req.params.tipo);
    const id   = String(req.params.id || '');
    if (!tipo || !id) return res.status(400).json({ error: 'Parâmetros inválidos' });

    if (tipo === 'denuncia') {
      // await prisma.denuncia.delete({ where: { id } });
      return res.json({ message: 'Denúncia removida (placeholder)' });
    }
    if (tipo === 'feedback') {
      // await prisma.feedback.delete({ where: { id } });
      return res.json({ message: 'Feedback removido (placeholder)' });
    }
    return res.status(400).json({ error: 'Tipo não suportado para remover' });
  } catch (e) {
    console.error('removerItem', e);
    return res.status(500).json({ error: 'Falha ao remover' });
  }
}

module.exports = { getPainelDados, banirRecurso, removerItem, desbanir };
