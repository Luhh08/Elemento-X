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