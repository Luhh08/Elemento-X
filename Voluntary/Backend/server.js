require('dotenv').config(); // Adicione esta linha no topo!

const express = require('express');
const mysql = require('mysql'); // Assumindo que você está usando mysql
const app = express();

// Acessando variáveis de ambiente do .env
const port = process.env.PORT || 3000; // Porta do servidor, padrão 3000

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.stack);
        return;
    }
    console.log("Conectado ao banco de dados com o ID " + db.threadId);
});

// Middleware para parsing do JSON
app.use(express.json());

// Rota para cadastrar o usuário
app.post("/cadastrar", (req, res) => {
    const { nome, usuario, email, cpf, senha } = req.body;

    // Validação simples para garantir que os campos não estão vazios
    if (!nome || !usuario || !email || !cpf || !senha) {
        return res.status(400).json({ success: false, message: "Todos os campos são obrigatórios!" });
    }

    // Query SQL para inserir os dados no banco
    const query = "INSERT INTO usuarios (nome, usuario, email, cpf, senha) VALUES (?, ?, ?, ?, ?)";
    db.query(query, [nome, usuario, email, cpf, senha], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Erro ao cadastrar o usuário." });
        }
        res.status(200).json({ success: true, message: "Usuário cadastrado com sucesso!" });
    });
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
