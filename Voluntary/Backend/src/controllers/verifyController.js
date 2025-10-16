// src/controllers/verifyController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");

const verifyEmail = async (req, res) => {
    const { token } = req.query;

    // Use a variável de ambiente para o Frontend, com um fallback local
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:3000"; 

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const usuario = await prisma.usuario.findUnique({ where: { email: decoded.email } });
        
        // Se o usuário não for encontrado (mesmo que a rota tenha sido hit)
        if (!usuario) {
            console.error("Usuário não encontrado para o email no token.");
            // Redireciona para o frontend com status de erro
            return res.redirect(`${frontendBaseUrl}/verify-email.html?status=user_not_found`);
        }
        
        // Verifica se o usuário já foi validado (para evitar reprocessamento)
        if (usuario.validacao) {
             console.log("Usuário já estava validado.");
             return res.redirect(`${frontendBaseUrl}/verify-email.html?status=already_verified`);
        }

        // 1. Atualiza o usuário no banco de dados
        await prisma.usuario.update({
            where: { email: decoded.email },
            data: { validacao: true, validacaoToken: null },
        });

        // 2. Ação de SUCESSO: Redireciona para a página de sucesso no Frontend
        // O frontend usará o JS para ler '?status=success' e mostrar a mensagem.
        res.redirect(`${frontendBaseUrl}/verify-email.html?status=success`);
        
    } catch (error) {
        console.error("Erro ao verificar token:", error);
        
        // Ação de ERRO: Redireciona para a página de erro no Frontend (token inválido/expirado)
        res.redirect(`${frontendBaseUrl}/verify-email.html?status=error`);
    }
};

module.exports = { verifyEmail };