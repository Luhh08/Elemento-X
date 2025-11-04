(function () {
  const form = document.getElementById('formAdm');
  const usuarioInput = document.getElementById('usuario');
  const senhaInput = document.getElementById('senha');
  const btn = document.getElementById('btnEntrar');
  const msg = document.getElementById('msg');

  const API_URL = '/api/admin/login'; 
  
  function setLoading(state) {
    btn.disabled = state;
    btn.textContent = state ? 'Entrando...' : 'ENTRAR';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';

    const usuario = usuarioInput.value.trim();
    const senha = senhaInput.value;

    if (!usuario || !senha) {
      msg.textContent = 'Preencha usuário e senha.';
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha }),
        credentials: 'include' // opcional, caso use cookie httpOnly
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        msg.textContent = data.error || 'Usuário ou senha inválidos.';
        setLoading(false);
        return;
      }

      // Se retornar JWT no corpo:
      if (data.token) {
        localStorage.setItem('adminToken', data.token);
      }
      localStorage.setItem('lastLoginType', 'admin');

      // Redireciona sem manter histórico
      location.replace('admin.html');
    } catch (err) {
      console.error(err);
      msg.textContent = 'Erro ao conectar. Tente novamente.';
      setLoading(false);
    }
  });
})();
