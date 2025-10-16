const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/generateToken");

const prisma = new PrismaClient();

async function loginEmpresa(req, res, next) {
  try {
    const { cnpj, senha } = req.body;
    const empresa = await prisma.empresa.findUnique({ where: { cnpj } });

    if (!empresa) return res.status(401).json({ error: "CNPJ não encontrado." });
    const isPasswordValid = await bcrypt.compare(senha, empresa.senha);
    if (!isPasswordValid) return res.status(401).json({ error: "Senha incorreta." });

    const token = generateToken({ id: empresa.id, cnpj: empresa.cnpj });
    res.status(200).json({ message: "Login realizado com sucesso!", token, empresa });
  } catch (err) {
    next(err);
  }
}

module.exports = { loginEmpresa };
