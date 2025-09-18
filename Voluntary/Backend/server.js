const path = require('path');
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); 

app.use(express.urlencoded({ extended: true })); 

app.use(express.static(path.join(__dirname, '..', 'Frontend')));

const uri = "mongodb+srv://ElementoX:NQCspjDQtBiaX80C@cluster0.blaw2us.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Conectado ao MongoDB Atlas!");
  } catch (err) {
    console.error("❌ Erro ao conectar no MongoDB:", err);
    process.exit(1); // Encerra a aplicação se não conseguir conectar ao DB
  }
}
run().catch(console.dir);


// --- ROTAS DA API ---

// Rota GET de teste
app.get("/teste", (req, res) => {
  res.status(200).json({ success: true, message: "O método GET está funcionando!" });
});

// Rota GET para buscar todos os usuários
app.get("/usuarios", async (req, res) => {
  try {
    const db = client.db("ElementoX");
    const collection = db.collection("usuarios");
    const usuarios = await collection.find({}, { projection: { senha: 0 } }).toArray();
    res.status(200).json({ success: true, data: usuarios });
  } catch (err) {
    console.error("❌ Erro ao buscar usuários:", err);
    res.status(500).json({ success: false, message: "Erro ao buscar usuários." });
  }
});

// Rota POST para cadastrar usuário
app.post("/cadastrar", async (req, res) => {
  const { nome, usuario, email, cpf, senha } = req.body;

  if (!nome || !usuario || !email || !cpf || !senha) {
    return res.status(400).json({ success: false, message: "Todos os campos são obrigatórios!" });
  }

  try {
    const db = client.db("ElementoX");
    const collection = db.collection("usuarios");
    await collection.insertOne({ nome, usuario, email, cpf, senha }); // Idealmente, a senha deve ser criptografada aqui

    res.status(201).json({ success: true, message: "Usuário cadastrado com sucesso!" }); // 201 Created é mais apropriado aqui
  } catch (err) {
    console.error("❌ Erro ao cadastrar:", err);
    res.status(500).json({ success: false, message: "Erro ao cadastrar o usuário." });
  }
});


// Inicia o servidor
app.listen(port, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}` );
});
