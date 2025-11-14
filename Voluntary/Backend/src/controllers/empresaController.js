const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const CryptoJS = require("crypto-js");
const { sendVerificationEmail } = require("../utils/sendEmail");
const path = require("path");
const fs = require("fs/promises");
const sharp = require("sharp");


const BASE = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;

const prisma = new PrismaClient();
const MIN_PROFILE_PROGRESS_TO_PUBLISH = Math.min(
  100,
  Math.max(0, Number(process.env.MIN_PROFILE_PROGRESS_TO_PUBLISH || 30))
);
const VAGA_STATUS_SET = new Set([
  "ABERTA",
  "INSCRICOES_FINALIZADAS",
  "ANDAMENTO",
  "FINALIZADA",
]);

// use a MESMA chave que o frontend (ideal: vir do .env)
const EMPRESA_AES_KEY =
  process.env.EMPRESA_AES_KEY || "chaveSeguraDe32Caracteres1234567890";

// ================================
// Helpers
// ================================
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
const formatCNPJMask = (d14) => {
  const d = onlyDigits(d14).padEnd(14, "0").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

// escapa regex para pesquisas seguras
function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// calcula % de perfil preenchido
function calcProgresso(e = {}) {
  let pontos = 0;
  const total = 8;

  if (e.razao_social) pontos++;
  if (e.usuario) pontos++;
  if (e.descricao) pontos++;
  if (Array.isArray(e.tags) && e.tags.length) pontos++;
  if (e.logoUrl) pontos++;
  if (e.bannerUrl) pontos++;
  if (e.telefonecontato || e.telefone_empresa) pontos++;
  if (e.endereco && e.cep) pontos++;

  return Math.round((pontos / total) * 100);
}

// remove arquivo salvo caso inválido
async function safeUnlink(absPath) {
  try { await fs.unlink(absPath); } catch { /* ignore */ }
}

// ================================
// Registrar empresa + representante
// ================================
async function registrarEmpresa(req, res) {
  try {
    const { empresa, representante } = req.body;

    if (!empresa || !representante) {
      return res
        .status(400)
        .json({ error: "Dados de empresa e representante são obrigatórios." });
    }

    // ================================
    // NORMALIZAÇÃO
    // ================================
    const razao_social = String(empresa.razao_social || "").trim();
    const email        = String(empresa.email || "").trim().toLowerCase();
    const senha        = String(empresa.senha || "");

    const cnpj              = String(empresa.cnpj || "").replace(/\D/g, "");
    const telefone_empresa  = String(empresa.telefone_empresa || "").replace(/\D/g, "");
    const cep               = String(empresa.cep || "").replace(/\D/g, "");
    const endereco          = String(empresa.endereco || "").trim();

    const nome              = String(representante.nome || "").trim();
    const cpf               = String(representante.cpf || "").replace(/\D/g, "");
    const cargo             = String(representante.cargo || "").trim();
    const email_representante   = String(representante.email_representante || "").trim().toLowerCase();
    const telefone_representante= String(representante.telefone_representante || "").replace(/\D/g, "");

    // ================================
    // Validações básicas
    // ================================
    if (!razao_social || !email || !senha || !cnpj || !telefone_empresa || !cep || !endereco) {
      return res.status(400).json({ error: "Preencha todos os campos da empresa." });
    }

    if (!nome || !cpf || !cargo || !email_representante || !telefone_representante) {
      return res.status(400).json({ error: "Preencha todos os campos do representante." });
    }

    const empresaOr = [];
    if (email) empresaOr.push({ email });
    if (cnpj) empresaOr.push({ cnpj });
    if (telefone_empresa) empresaOr.push({ telefone_empresa });

    if (empresaOr.length) {
      const empresaExistente = await prisma.empresa.findFirst({
        where: { OR: empresaOr },
        select: {
          email: true,
          cnpj: true,
          telefone_empresa: true,
          isBanned: true,
          banReason: true,
        },
      });

      if (empresaExistente) {
        if (empresaExistente.isBanned) {
          return res.status(403).json({
            error: `Cadastro bloqueado. Motivo: ${empresaExistente.banReason || "Este e-mail, CNPJ ou telefone está banido do sistema."}`,
          });
        }
        let campo = "dados fornecidos";
        if (email && empresaExistente.email === email) campo = "e-mail";
        else if (cnpj && empresaExistente.cnpj === cnpj) campo = "CNPJ";
        else if (telefone_empresa && empresaExistente.telefone_empresa === telefone_empresa) campo = "telefone";

        return res.status(409).json({
          error: `Já existe uma empresa cadastrada com este ${campo}.`,
        });
      }
    }
    const repOr = [];
    if (email_representante) repOr.push({ email_representante });
    if (cpf) repOr.push({ cpf });
    if (telefone_representante) repOr.push({ telefone_representante });

    if (repOr.length) {
      const representanteDuplicado = await prisma.representanteLegal.findFirst({
        where: { OR: repOr },
      });

      if (representanteDuplicado) {
        return res.status(409).json({
          error: "Já existe um representante cadastrado com estes dados (e-mail, CPF ou telefone).",
        });
      }
    }
    const hashed = await bcrypt.hash(senha, 10);
    const token  = crypto.randomBytes(24).toString("hex");

    const novaEmpresa = await prisma.empresa.create({
      data: {
        razao_social,
        email,
        senha: hashed,
        cnpj,
        telefone_empresa,
        endereco,
        cep,
        validacaoToken: token,
      },
    });

    await prisma.representanteLegal.create({
      data: {
        nome,
        cpf,
        cargo,
        email_representante,
        telefone_representante,
        empresaId: novaEmpresa.id,
      },
    });

    await sendVerificationEmail(email, token);

    return res.status(201).json({
      message: "Empresa e representante cadastrados. Verifique seu e-mail.",
    });

  } catch (err) {
    console.error("registrarEmpresa error (detalhe):", {
      code: err.code,
      meta: err.meta,
      message: err.message,
    });

    if (err.code === "P2002") {
      const target = String(err.meta?.target || "");
      // CORREÇÃO: Usar os nomes dos campos que são @unique no seu schema
      let campo = "dados fornecidos";
      if (target.includes("email")) campo = "e-mail da empresa";
      else if (target.includes("cnpj")) campo = "CNPJ";
      else if (target.includes("telefone_empresa")) campo = "telefone da empresa";
      else if (target.includes("email_representante")) campo = "e-mail do representante";
      else if (target.includes("cpf")) campo = "CPF do representante";
      else if (target.includes("telefone_representante")) campo = "telefone do representante";
      
      return res.status(409).json({ error: `Valor duplicado no campo único: ${campo}.` });
    }
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}


// ================================
// Verificar e-mail via token
// ================================
async function verificarEmail(req, res) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token ausente");

    const empresa = await prisma.empresa.findFirst({
      where: { validacaoToken: token },
    });
    if (!empresa)
      return res.status(404).send("Token inválido ou empresa não encontrada");

    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { validacao: true, validacaoToken: null },
    });

    return res.redirect(`${process.env.FRONTEND_URL}/verify-empresa-success`);
  } catch (err) {
    console.error("verificarEmail error:", err);
    return res.status(500).send("Erro ao verificar e-mail");
  }
}

// ================================
// Solicitar redefinição de senha
// ================================
async function solicitarRedefinicao(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Informe o e-mail" });

    const empresa = await prisma.empresa.findUnique({ where: { email } });
    if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

    const token = crypto.randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { resetToken: token, resetTokenExpires: expires },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-empresa?token=${token}`;

    // A parte do Nodemailer geralmente fica em um util, mas mantendo o original
    const transporter = require("nodemailer").createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Equipe Voluntary 👋" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Redefinição de senha",
      html: `
        <h2>Redefinir senha</h2>
        <p>Olá ${empresa.razao_social || ""}, clique abaixo para redefinir sua senha:</p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 15px;background:#ff6b6b;color:white;border-radius:5px;text-decoration:none;">Redefinir senha</a>
        <p>Ou copie este link:</p>
        <p>${resetUrl}</p>
      `,
    });

    return res.json({ message: "E-mail de redefinição enviado" });
  } catch (err) {
    console.error("solicitarRedefinicao error:", err);
    return res.status(500).json({ error: "Erro ao enviar e-mail de redefinição" });
  }
}

// ================================
// Login da empresa
// ================================
async function loginEmpresa(req, res) {
  try {
    const cnpjDigits = String(req.body.cnpj || "").replace(/\D/g, "");
    const senhaCriptografada = String(req.body.senha || "");

    if (!cnpjDigits || !senhaCriptografada) {
      return res.status(400).json({ error: "CNPJ e senha são obrigatórios." });
    }

    // 🔓 descriptografar senha (AES)
    let senhaDescriptografada = "";
    try {
      const bytes = CryptoJS.AES.decrypt(senhaCriptografada, EMPRESA_AES_KEY);
      senhaDescriptografada = bytes.toString(CryptoJS.enc.Utf8);
    } catch (_e) { /* cai no check abaixo */ }

    if (!senhaDescriptografada) {
      return res.status(400).json({ error: "Falha ao descriptografar a senha." });
    }

    // procura empresa por CNPJ com/sem máscara
    const formatCNPJ = (d14) => d14
      .replace(/\D/g,"").slice(0,14)
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");

    let empresa = await prisma.empresa.findUnique({ where: { cnpj: cnpjDigits } });
    if (!empresa) empresa = await prisma.empresa.findUnique({ where: { cnpj: formatCNPJ(cnpjDigits) } });
    if (!empresa) return res.status(401).json({ error: "CNPJ não encontrado." });

  if (empresa.isBanned) {
    return res.status(403).json({
      error: `Conta banida. Motivo: ${empresa.banReason || "Violação das regras."}`,
    });
  }

    const ok = await bcrypt.compare(senhaDescriptografada, empresa.senha);
    if (!ok) return res.status(401).json({ error: "Senha incorreta." });

    if (!empresa.validacao) {
      return res.status(403).json({ error: "Conta não verificada. Verifique seu e-mail." });
    }

    const token = jwt.sign(
      { sub: empresa.id, typ: "empresa" },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "7d" }
    );

    const progresso = calcProgresso(empresa);
    return res.json({
      message: "Login realizado com sucesso!",
      token,
      empresa: {
        id: empresa.id,
        razao_social: empresa.razao_social,
        email: empresa.email,
        cnpj: empresa.cnpj,
        usuario: empresa.usuario || null,
        logoUrl: empresa.logoUrl || null,
        bannerUrl: empresa.bannerUrl || null,
        progresso,
      },
    });
  } catch (error) {
    console.error("loginEmpresa error:", error);
    return res.status(500).json({ error: "Erro ao realizar login." });
  }
}

// ================================
// Redefinir senha com token
// ================================
async function redefinirSenha(req, res) {
  try {
    const { token, senha } = req.body;
    if (!token || !senha)
      return res
        .status(400)
        .json({ error: "Token e nova senha são obrigatórios" });

    const empresa = await prisma.empresa.findFirst({
      where: { resetToken: token, resetTokenExpires: { gt: new Date() } },
    });
    if (!empresa)
      return res.status(400).json({ error: "Token inválido ou expirado" });

    const hashed = await bcrypt.hash(senha, 10);
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { senha: hashed, resetToken: null, resetTokenExpires: null },
    });
    return res.json({ message: "Senha redefinida com sucesso" });
  } catch (err) {
    console.error("redefinirSenha error:", err);
    return res.status(500).json({ error: "Erro ao redefinir senha" });
  }
}

// ================================
// Obter perfil público por ID
// ================================
async function obterPerfilPorId(req, res) {
  try {
    const { id } = req.params;
    const empresa = await prisma.empresa.findUnique({
      where: { id },
      select: {
        id: true,
        razao_social: true,
        usuario: true,
        email: true,
        telefone_empresa: true,
        emailcontato: true,
        telefonecontato: true,
        endereco: true,
        cep: true,
        validacao: true,
        criadoEm: true,
        // REPRESENTANTES: É um campo interno, deve ser removido de endpoints públicos
        // representantes: true, // Removido
        descricao: true,
        tags: true,
        logoUrl: true,
        bannerUrl: true,
      },
    });

    if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

    const progresso = calcProgresso(empresa);
    return res.json({ ...empresa, progresso });
  } catch (err) {
    console.error("obterPerfilPorId error:", err);
    return res.status(500).json({ error: "Erro ao buscar perfil" });
  }
}

// ================================
// Perfil + progresso (completo)
// ================================
async function getEmpresa(req, res, next) {
  try {
    const { id } = req.params;
    const empresa = await prisma.empresa.findUnique({ where: { id } });
    if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });
    const progresso = calcProgresso(empresa);
    res.json({ ...empresa, progresso });
  } catch (e) { next(e); }
}

// ================================
// Atualiza perfil
// ================================
async function updateEmpresa(req, res, next) {
  try {
    const { id } = req.params;
    const {
      razao_social, descricao, tags,
      telefone_empresa,
      emailcontato,
      telefonecontato,
      cep, endereco, bannerUrl, logoUrl,
      usuario,
    } = req.body;

    // normalização robusta do usuario
    let usuarioNorm = undefined;
    if (typeof usuario === "string") {
      const raw = usuario.trim();
      const cleaned = raw.replace(/^@+/, "")
                         .toLowerCase()
                         .replace(/\s+/g, "")
                         .replace(/[^a-z0-9._-]/g, "");
      if (cleaned) usuarioNorm = cleaned;
    }

    const empresa = await prisma.empresa.update({
      where: { id },
      data: {
        razao_social,
        descricao,
        tags: Array.isArray(tags)
          ? tags
          : (tags ? String(tags).split(",").map(s => s.trim()).filter(Boolean) : []),
        telefone_empresa,
        emailcontato:     emailcontato ?? undefined,
        telefonecontato: (telefonecontato ? String(telefonecontato).replace(/\D/g, "") : undefined),
        cep,
        endereco,
        bannerUrl,
        logoUrl,
        usuario: usuarioNorm, // se undefined, Prisma ignora; se string válida, atualiza
      }
    });

    const progresso = calcProgresso(empresa);
    res.json({ ...empresa, progresso });
  } catch (e) {
    if (e?.code === "P2002") {
      const t = Array.isArray(e.meta?.target) ? e.meta.target.join(",") : String(e.meta?.target || "");
      if (t.includes("usuario")) {
        return res.status(409).json({ error: "Este usuário já está em uso." });
      }
      return res.status(409).json({ error: "Valor duplicado em campo único." });
    }
    console.error("updateEmpresa error:", e);
    return res.status(500).json({ error: "Erro ao atualizar perfil." });
  }
}

// ================================
// Upload de logo/banner  (com validação de banner 3:2)
// ================================
async function uploadImagem(req, res, next) {
  try {
    const { id, tipo } = req.params; // logo | banner
    if (!req.file) return res.status(400).json({ error: "Arquivo ausente" });

    // caminho absoluto do arquivo salvo pelo Multer
    const absPath = path.join(__dirname, "..", "..", "uploads", req.file.filename);

    // validação específica para banner: proporção mínima 3:2 e tamanho recomendado 1200x800
    if (tipo === "banner") {
      try {
        const meta = await sharp(absPath).metadata();
        const { width, height } = meta || {};
        if (!width || !height) {
          await safeUnlink(absPath);
          return res.status(400).json({ error: "Não foi possível ler as dimensões do banner." });
        }
        const ratio = width / height;
        const MIN_W = 1200, MIN_H = 800; // recomendado
        const sizeOk = width >= MIN_W && height >= MIN_H;

        if (ratio < 1.5 || !sizeOk) {
          await safeUnlink(absPath);
          return res.status(400).json({
            error: "O banner deve ter proporção mínima 3:2 (ex.: 1200×800) ou maior (mais horizontal)."
          });
        }
      } catch (e) {
        await safeUnlink(absPath);
        return res.status(400).json({ error: "Falha ao validar o banner enviado." });
      }
    }

    // mantém padrão atual do seu código: salvar URL RELATIVA
    const url = `/uploads/${req.file.filename}`;
    const data = {};
    if (tipo === "logo") data.logoUrl = url;
    else if (tipo === "banner") data.bannerUrl = url;
    else {
      await safeUnlink(absPath);
      return res.status(400).json({ error: "tipo inválido" });
    }

    const empresa = await prisma.empresa.update({ where: { id }, data });
    const progresso = calcProgresso(empresa);
    res.json({ empresa: { ...empresa, progresso } });
  } catch (e) {
    next(e);
  }
}

// ================================
// Vagas
// ================================
async function listarVagasDaEmpresa(req, res, next) {
  try {
    const { id } = req.params;
    const vagas = await prisma.vaga.findMany({
      where: { empresaId: id },
      orderBy: { id: 'desc' }
    });
    res.json(vagas);
  } catch (e) { next(e); }
}

const isValidObjectId = (s) => typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s);

function normalizeList(value) {
  // aceita: array ["a","b"], "a,b", " a , b ", undefined
  if (Array.isArray(value)) {
    return value
      .flatMap(v => String(v).split(","))
      .map(s => s.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
}

async function criarVagaParaEmpresa(req, res, next) {
  try {
    const { id } = req.params; // empresaId

    // 1) valida empresaId antes do Prisma (evita P2023)
    if (!id || id === "null" || !isValidObjectId(id)) {
      return res.status(400).json({ error: "empresaId inválido" });
    }

    // 2) empresa existe?
    const empresa = await prisma.empresa.findUnique({ where: { id } });
    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    // 3) bloqueio de perfil < mínimo configurado
    const progresso = calcProgresso(empresa);
    if (progresso < MIN_PROFILE_PROGRESS_TO_PUBLISH) {
      return res.status(403).json({
        error: `Complete pelo menos ${MIN_PROFILE_PROGRESS_TO_PUBLISH}% do perfil da empresa para publicar uma vaga.`,
        progressoAtual: progresso,
        minimoNecessario: MIN_PROFILE_PROGRESS_TO_PUBLISH
        // (opcional) envie também "faltando": camposFaltando(empresa)
      });
    }

    // 4) coleta e normalização de campos
    const {
      titulo = "",
      descricao = "",
      local = "",
      status = "ABERTA",
      dataInicio,
      dataFim,
      tags,            // pode vir array ou string (FormData)
      turno,           // idem
      imagens,         // URLs no body (opcional)
      imagens_existentes,    // URLs de imagens já salvas (manter)
    } = req.body;

    if (!String(titulo).trim()) {
      return res.status(400).json({ error: "Título é obrigatório." });
    }

    const tagsNorm  = normalizeList(tags);
    const turnos    = normalizeList(turno);
    const antigas   = normalizeList(imagens_existentes);
    const bodyUrls  = normalizeList(imagens);

    // 5) arquivos enviados (coerente com upload da empresa: URL RELATIVA)
    const fileUrls = (req.files || []).map(f => `/uploads/${f.filename}`);

    // 6) dedupe das imagens finais
    const imagensFinais = Array.from(new Set([...antigas, ...bodyUrls, ...fileUrls]));

    // 7) cria a vaga
    const vaga = await prisma.vaga.create({
      data: {
        empresaId: id,
        titulo: String(titulo).trim(),
        descricao: String(descricao).trim(),
        tags: tagsNorm,
        local: String(local).trim(),
        turno: turnos,
        status: String(status || "ABERTA").toUpperCase(),
        dataInicio: dataInicio ? new Date(dataInicio) : null,
        dataFim:    dataFim    ? new Date(dataFim)    : null,
        imagens: imagensFinais, // campo String[]
      },
    });

    return res.status(201).json(vaga);
  } catch (e) {
    return next(e);
  }
}

function isHex24(s) {
  return typeof s === "string" && /^[a-f0-9]{24}$/i.test(s);
}

// CORREÇÃO: Removemos a duplicação da função resolveEmpresaId
async function resolveEmpresaId(idOrHandle){
  // 1) tenta por id de Empresa (ObjectId)
  if (isHex24(idOrHandle)) {
    const e = await prisma.empresa.findUnique({
      where: { id: String(idOrHandle) },
      select: { id: true },
    });
    if (e) return e.id;
  }

  // 2) tenta por handle (@usuario)
  const handle = String(idOrHandle||"").replace(/^@+/, "").trim().toLowerCase();
  if (handle) {
    const e = await prisma.empresa.findFirst({
      where: { usuario: handle },
      select: { id: true },
    });
    if (e) return e.id;
  }

  // 3) tenta como id de Vaga (pega empresaId)
  if (isHex24(idOrHandle)) {
    const v = await prisma.vaga.findUnique({
      where: { id: String(idOrHandle) },
      select: { empresaId: true },
    });
    if (v?.empresaId) return v.empresaId;
  }

  return null;
}

async function getEmpresaPublic(req, res){
  try{
    const empresaId = await resolveEmpresaId(req.params.idOrHandle);
    if (!empresaId) return res.status(404).json({ error: "Empresa não encontrada" });

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true, razao_social: true, usuario: true, descricao: true, tags: true,
        bannerUrl: true, logoUrl: true, emailcontato: true, telefonecontato: true,
        endereco: true, cep: true
      }
    });
    if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });
    res.json(empresa);
  }catch(e){
    console.error(e);
    res.status(500).json({ error: "Erro ao carregar empresa pública" });
  }
}

async function listarVagasPublicasPorEmpresa(req, res){
  try{
    const empresaId = await resolveEmpresaId(req.params.idOrHandle);
    if (!empresaId) return res.status(404).json({ error: "Empresa não encontrada" });

    const where = { empresaId };
    const statusFiltro = normalizeList(req.query?.status)
      .map((s) => s.toUpperCase())
      .filter((s) => VAGA_STATUS_SET.has(s));

    if (statusFiltro.length === 1) {
      where.status = statusFiltro[0];
    } else if (statusFiltro.length > 1) {
      where.status = { in: statusFiltro };
    }

    const vagas = await prisma.vaga.findMany({
      where,
      orderBy: { id: "desc" },
      select: {
        id: true, titulo: true, descricao: true, tags: true, turno: true,
        local: true, status: true, dataInicio: true, dataFim: true, imagens: true
      }
    });
    res.json(vagas);
  }catch(e){
    console.error(e);
    res.status(500).json({ error: "Erro ao listar vagas públicas" });
  }
}

// CORREÇÃO: O campo 'email' na empresa é 'email' (do schema)
function gerarTokenEmpresa(empresa) {
  // Certifique-se de que a constante SECRET está definida no escopo onde esta função é usada
  // (assumindo que seja no arquivo de rotas ou em outro local).
  const SECRET = process.env.JWT_SECRET || "dev-secret"; 
  
  return jwt.sign(
    {
      id: empresa.id,
      empresaId: empresa.id, // 🔥 importante para o middleware reconhecer
      tipo: "empresa",
      email: empresa.email // CORREÇÃO: Usar 'email' conforme o schema
    },
    SECRET,
    { expiresIn: "7d" }
  );
}

module.exports = {
  registrarEmpresa,
  verificarEmail,
  solicitarRedefinicao,
  redefinirSenha,
  obterPerfilPorId,
  getEmpresa,
  updateEmpresa,
  uploadImagem,
  listarVagasDaEmpresa,
  criarVagaParaEmpresa,
  loginEmpresa,
  getEmpresaPublic,
  listarVagasPublicasPorEmpresa,
  gerarTokenEmpresa,
};
