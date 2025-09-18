const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../Frontend")));

app.post("/users", async (req, res) => {
  try {
    const { nome, usuario, email, cpf, senha } = req.body;
    const novoUsuario = await prisma.usuario.create({
      data: { nome, usuario, email, cpf, senha },
    });
    res.status(201).json(novoUsuario);
  } catch (error) {
    console.error("Erro Prisma:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/users", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany();
    res.status(200).json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
