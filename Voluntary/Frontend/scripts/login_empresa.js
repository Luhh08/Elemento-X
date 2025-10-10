app.post('/login-empresa', async (req, res) => {
  try {
    const { cnpj, senha } = req.body;

    const empresa = await prisma.empresa.findUnique({
      where: { cnpj }
    });

    if (!empresa) {
      return res.status(401).json({ error: 'CNPJ não encontrado' });
    }

    if (empresa.senha !== senha) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    res.status(200).json({ message: 'Login realizado com sucesso!', empresa });
  } catch (error) {
    console.error('Erro no login da empresa:', error);
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
});
