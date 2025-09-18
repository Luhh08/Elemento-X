<<<<<<< HEAD
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

// ✅ Primeiro inicializa o app
const app = express(); // Framework de backend
const prisma = new PrismaClient(); // Instância do Prisma para manipular o banco
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permite requisições do frontend
app.use(express.json()); // Garante que as requisições serão em JSON

// ✅ Serve arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, "../Frontend")));

// Rotas
app.post("/users", async (req, res) => {
  try {
    const { nome, usuario, email, cpf, senha } = req.body;
    const novoUsuario = await prisma.usuario.create({
      data: { nome, usuario, email, cpf, senha },
    });
    res.status(201).json(novoUsuario);
  } catch (error) {
  console.error("Erro Prisma:", error); // mostra tudo no terminal
  res.status(500).json({ error: error.message }); // envia a mensagem real para o frontend
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

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor está rodando na porta ${port}`);
});
=======
import express from "express"
import cors from "cors"
import {PrismaClient} from "@prisma/client"


const app = express() // Framework de backend
const prisma = new PrismaClient() // Instancia do Prisma para manipular o banco
const PORT = 3000

app.use(cors()) // CORS coloca um endereço no frontend, para que não seja barrado
app.use(express.json()) // Garante que as requisições serão em JSON

app.post("/users", async (req, res) => { // Rota com método POST de exemplo em como enviar dados via PRISMA
    await prisma.usuario.create({
        data: {
            email: "mandar email",
            senha: "mandar senha"
        }
    })
})

app.get("/users", async (req, res) => { // Rota com método GET que busca todos os usuários
    const response = await prisma.usuario.findMany();

    return res.status(200).send(response)
})

app.listen(PORT, () => { // Iniciando o servidor
    console.log("Servidor está rodando")
})
>>>>>>> a07e1d56e6e678da717f19b22bb5b87e44dcd359
