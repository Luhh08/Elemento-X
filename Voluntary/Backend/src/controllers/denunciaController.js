const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");
const { enviarEmail } = require("../utils/emailUtils");
const { registrarNotificacao } = require("../utils/notificacaoService");
const { sendAdminNotice } = require("../utils/mailBan");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

async function descreverAlvo(tipo, alvoId) {
  if (!tipo || !alvoId) return null;
  const t = String(tipo).toLowerCase();
  try {
    if (t === "usuario") {
      const u = await prisma.usuario.findUnique({
        where: { id: alvoId },
        select: { nome: true, usuario: true }
      });
      if (u) return u.nome || (u.usuario ? `@${u.usuario}` : null);
    } else if (t === "empresa") {
      const e = await prisma.empresa.findUnique({
        where: { id: alvoId },
        select: { razao_social: true, usuario: true }
      });
      if (e) return e.razao_social || (e.usuario ? `@${e.usuario}` : null);
    } else if (t === "vaga") {
      const v = await prisma.vaga.findUnique({
        where: { id: alvoId },
        select: {
          titulo: true,
          empresa: { select: { razao_social: true } }
        }
      });
      if (v) {
        return v.empresa?.razao_social
          ? `${v.titulo || "Vaga"} • ${v.empresa.razao_social}`
          : v.titulo || null;
      }
    }
  } catch (err) {
    console.error("descreverAlvo error:", err);
  }
  return null;
}

async function identificarDenunciante(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const tipo = (payload.typ || payload.tipo || "").toLowerCase();
    if (tipo === "empresa") {
      const id = payload.empresaId || payload.sub || payload.id;
      if (!id) return null;
      const empresa = await prisma.empresa.findUnique({
        where: { id },
        select: { id: true, razao_social: true, email: true, usuario: true }
      });
      if (!empresa) return null;
      return {
        tipo: "empresa",
        id: empresa.id,
        nome: empresa.razao_social || empresa.usuario || "Empresa",
        email: empresa.email
      };
    }
    const id = payload.usuarioId || payload.sub || payload.id;
    if (!id) return null;
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nome: true, usuario: true, email: true }
    });
    if (!usuario) return null;
    return {
      tipo: "usuario",
      id: usuario.id,
      nome: usuario.nome || usuario.usuario || "Voluntário",
      email: usuario.email
    };
  } catch (e) {
    return null;
  }
}

async function criarDenuncia(req, res, next) {
  try {
    const denunciante = await identificarDenunciante(req);
    const { tipo, alvoId, mensagem } = req.body || {};
    if (!tipo || !alvoId || !mensagem) {
      return res.status(400).json({ error: 'Parâmetros inválidos para denúncia.' });
    }

    const alvoDescricao = await descreverAlvo(tipo, alvoId);

    const data = {
      tipo: String(tipo),
      alvoId: String(alvoId),
      mensagem: String(mensagem),
      reporterNome: denunciante?.nome || null,
      reporterEmail: denunciante?.email || null,
      reporterTipo: denunciante?.tipo || null
    };
    if (denunciante?.tipo === "empresa") {
      data.quemDenunciouEmpresaId = denunciante.id;
    } else if (denunciante?.tipo === "usuario") {
      data.quemDenunciouId = denunciante.id;
    }

    const d = await prisma.denuncia.create({ data });

    if (denunciante?.email) {
      const assunto = "Recebemos sua denúncia";
      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
          <p>Olá ${denunciante.nome || "voluntário(a)"}!</p>
          <p>Registramos sua denúncia sobre <strong>${alvoDescricao || d.tipo}</strong> e nossa equipe irá analisá-la.</p>
          <p>Assim que houver uma decisão, você receberá outro e-mail com o status atualizado.</p>
          <p style="font-size:13px;color:#6b7280">Protocolo: ${d.id}</p>
          <p>Obrigado por nos ajudar a manter a comunidade segura.</p>
        </div>`;
      enviarEmail(denunciante.email, assunto, html).catch(err => {
        console.error("Falha ao enviar confirmação da denúncia:", err);
      });
    }

    // Notificar administradores por e-mail (variável ADMIN_EMAILS separada por vírgula ou ADMIN_EMAIL)
    try {
      const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '';
      const list = (raw || '').split(',').map(s => s.trim()).filter(Boolean);
      const assunto = `Nova denúncia (${d.tipo})`;
      const html = `
        <h3>Nova denúncia recebida</h3>
        <p><b>Tipo:</b> ${d.tipo}</p>
        <p><b>Alvo:</b> ${alvoDescricao || d.alvoId}</p>
        <p><b>Mensagem:</b></p>
        <p>${String(d.mensagem).replace(/\n/g,'<br/>')}</p>
      `;
      for (const to of list) {
        try { await sendAdminNotice(to, assunto, html); } catch (e) { console.error('Falha ao notificar admin', to, e); }
      }
    } catch (e) {
      console.error('Erro ao notificar administradores:', e);
    }

    if (denunciante?.id) {
      try {
        const destino = {
          titulo: "Denúncia registrada",
          mensagem: `Recebemos sua denúncia sobre ${alvoDescricao || d.tipo}.`,
          categoria: "DENUNCIA",
          link: denunciante.tipo === "empresa"
            ? `/perfil-empresa.html?id=${denunciante.id}`
            : `/perfil-usuario.html?id=${denunciante.id}`
        };
        if (denunciante.tipo === "empresa") destino.empresaId = denunciante.id;
        else destino.usuarioId = denunciante.id;
        await registrarNotificacao(destino);
      } catch (err) {
        console.error("Erro ao registrar notificação da denúncia:", err);
      }
    }

    res.status(201).json({ message: 'Denúncia registrada.', denuncia: d });
  } catch (e) {
    next(e);
  }
}

async function listarDenuncias(req, res, next) {
  try {
    const items = await prisma.denuncia.findMany({ orderBy: { criadoEm: 'desc' }, take: 200 });
    res.json({ items });
  } catch (e) { next(e); }
}

async function removerDenuncia(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id obrigatório' });
    await prisma.denuncia.delete({ where: { id } });
    res.json({ message: 'Denúncia removida.' });
  } catch (e) { next(e); }
}

async function resolverDenuncia(req, res, next) {
  try {
    const { id } = req.params;
    const { resolvida = true, adminNota, resultado } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id obrigatório' });

    const denunciaAtual = await prisma.denuncia.findUnique({
      where: { id },
      select: { tipo: true, alvoId: true }
    });
    if (!denunciaAtual) {
      return res.status(404).json({ error: 'Denúncia não encontrada.' });
    }

    let resultadoValue = null;
    if (resolvida) {
      const allowed = ['procedente', 'improcedente'];
      if (!allowed.includes(String(resultado || '').toLowerCase())) {
        return res.status(400).json({ error: 'Selecione se a denúncia é procedente ou improcedente.' });
      }
      resultadoValue = String(resultado).toLowerCase();
    }

    const alvoDescricao = await descreverAlvo(denunciaAtual.tipo, denunciaAtual.alvoId);

    const atualizada = await prisma.denuncia.update({
      where: { id },
      data: {
        resolvida: !!resolvida,
        adminNota: adminNota ? String(adminNota).trim() : null,
        resultado: resultadoValue
      },
      include: {
        quemDenunciou: { select: { id: true, nome: true, email: true } },
        quemDenunciouEmpresa: { select: { id: true, razao_social: true, email: true } }
      }
    });

    const reporterEmail =
      atualizada?.quemDenunciou?.email ||
      atualizada?.quemDenunciouEmpresa?.email ||
      atualizada?.reporterEmail ||
      null;
    if (reporterEmail) {
      const nomeReporter =
        atualizada?.quemDenunciou?.nome ||
        atualizada?.quemDenunciouEmpresa?.razao_social ||
        atualizada?.reporterNome ||
        "voluntário(a)";
      let assunto;
      let corpoStatus;
      if (atualizada.resolvida) {
        if (atualizada.resultado === 'improcedente') {
          assunto = "Denúncia encerrada";
          corpoStatus = "Após análise verificamos que a denúncia era improcedente e não aplicamos banimento.";
        } else {
          assunto = "Sua denúncia foi procedente";
          corpoStatus = "Confirmamos a denúncia e aplicamos as medidas necessárias ao responsável.";
        }
      } else {
        assunto = "Sua denúncia foi reaberta";
        corpoStatus = "A denúncia foi reaberta para nova avaliação pela equipe.";
      }
      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
          <p>Olá ${nomeReporter}!</p>
          <p>${corpoStatus}</p>
          ${alvoDescricao ? `<p>Denunciado: <strong>${alvoDescricao}</strong></p>` : ""}
          ${atualizada.adminNota ? `<p><strong>Nota da equipe:</strong> ${atualizada.adminNota}</p>` : ""}
          ${atualizada.resultado ? `<p><strong>Conclusão:</strong> ${atualizada.resultado === 'improcedente' ? 'Denúncia improcedente / falsa' : 'Denúncia procedente'}</p>` : ""}
          <p style="font-size:13px;color:#6b7280">Protocolo: ${atualizada.id}</p>
        </div>`;
      enviarEmail(reporterEmail, assunto, html).catch(err => {
        console.error("Falha ao enviar e-mail de resolução da denúncia:", err);
      });

      try {
        const destino = {
          titulo: assunto,
          mensagem: `${corpoStatus}${alvoDescricao ? ` Denunciado: ${alvoDescricao}.` : ""}`,
          categoria: "DENUNCIA",
          link: atualizada.quemDenunciou?.id
            ? `/perfil-usuario.html?id=${atualizada.quemDenunciou.id}`
            : atualizada.quemDenunciouEmpresa?.id
              ? `/perfil-empresa.html?id=${atualizada.quemDenunciouEmpresa.id}`
              : null
        };
        if (atualizada.quemDenunciou?.id) {
          destino.usuarioId = atualizada.quemDenunciou.id;
        } else if (atualizada.quemDenunciouEmpresa?.id) {
          destino.empresaId = atualizada.quemDenunciouEmpresa.id;
        }
        if (destino.usuarioId || destino.empresaId) {
          await registrarNotificacao(destino);
        }
      } catch (err) {
        console.error("Erro ao registrar notificação da denúncia resolvida:", err);
      }
    }

    res.json({
      message: atualizada.resolvida ? 'Denúncia marcada como resolvida.' : 'Denúncia atualizada.',
      denuncia: atualizada
    });
  } catch (e) { next(e); }
}

module.exports = { criarDenuncia, listarDenuncias, removerDenuncia, resolverDenuncia };
