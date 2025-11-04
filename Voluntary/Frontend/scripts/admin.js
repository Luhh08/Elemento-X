(function () {
  // --------- Config ---------
  const SAME_ORIGIN = location.origin.includes(':3000'); // backend
  const API_BASE = SAME_ORIGIN ? '/api/admin' : 'http://localhost:3000/api/admin';

  const token = localStorage.getItem('adminToken');
  if (!token) return location.replace('login_adm.html');

  // --------- DOM refs ---------
  const sectionTitle = document.getElementById('sectionTitle');
  const searchInput  = document.getElementById('searchInput');

  const tbUsuarios   = document.getElementById('usuariosTableBody');
  const tbEmpresas   = document.getElementById('empresasTableBody');
  const tbVagas      = document.getElementById('vagasTableBody');
  const tbDenuncias  = document.getElementById('denunciasTableBody');
  const tbFeedback   = document.getElementById('feedbackTableBody');

  const modal        = document.getElementById('modalConfirm');
  const modalText    = document.getElementById('modalText');
  const btnYes       = document.getElementById('confirmYes');
  const btnNo        = document.getElementById('confirmNo');
  const toast        = document.getElementById('toast');

  const sections     = document.querySelectorAll('.table-section');
  const menuLinks    = document.querySelectorAll('.menu .pill');

  // --------- Estado ---------
  const state = {
    raw:      { usuarios: [], empresas: [], vagas: [], denuncias: [], feedback: [] },
    filtered: { usuarios: [], empresas: [], vagas: [], denuncias: [], feedback: [] },
    current: 'usuarios',
    pendingBan: null // { tipo, id }
  };

  // --------- Utils ---------
  const headers = () => ({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' });

  function showToast(text, ok = true) {
    toast.textContent = text;
    toast.className = 'toast ' + (ok ? 'ok' : 'err') + ' show';
    setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function openModal(text, payload) {
    state.pendingBan = payload;
    modalText.textContent = text;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
  }
  function closeModal() {
    state.pendingBan = null;
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
  }

  // --------- Getters tolerantes ---------
  const getId   = (x) => x.id || x._id || x.idUsuario || x.idEmpresa || x.idVaga;
  const getNome = (x) => x.nome || x.username || x.usuario || x.razaoSocial || x.fantasia || x.titulo || '—';
  const getEmail= (x) => x.email || x.contatoEmail || x.emailEmpresa || '—';
  const getStatus = (x) => x.status || x.ativo || x.aprovado || x.situacao || '—';
  const getEmpresaNomeFromVaga = (v) =>
    (v.empresa && (v.empresa.nome || v.empresa.razaoSocial || v.empresa.fantasia)) || v.empresaNome || '—';
  const getTituloVaga = (v) => v.titulo || v.nome || v.nomeVaga || '—';
  const getCandidaturas = (v) => (Array.isArray(v.candidaturas) ? v.candidaturas.length : (v.qtdCandidaturas ?? v.aplicacoes ?? 0));
  const getMotivoDenuncia = (d) => d.motivo || d.reason || d.tipo || '—';
  const getComentario = (f) => f.comentario || f.texto || f.mensagem || '—';

  // Verificação específica para usuário (sem números)
  const getVerificacaoUser = (x) => {
    const s = (x.status || '').toString().toLowerCase();
    const verificado = s === 'ativo' || s === 'verificado' || x.validacao === true;
    return verificado ? 'Verificado' : 'Pendente';
  };

  // --------- Render ---------
  function renderRows(list, tipo) {
    return list.map(item => {
      const id = getId(item);
      let cols = '';

      if (tipo === 'usuarios') {
        // 6 colunas: checkbox | ID | Usuário | E-mail | Verificação | Ações
        cols = `
          <td><input type="checkbox" data-id="${id}"></td>
          <td>${id}</td>
          <td>${getNome(item)}</td>
          <td>${getEmail(item)}</td>
          <td>${getVerificacaoUser(item)}</td>
          <td><button class="ban" data-tipo="usuario" data-id="${id}">Banir</button></td>`;
      } else if (tipo === 'empresas') {
        // 7 colunas: checkbox | ID | Empresa | E-mail | Vagas Ativas | Status | Ações
        cols = `
          <td><input type="checkbox" data-id="${id}"></td>
          <td>${id}</td>
          <td>${getNome(item)}</td>
          <td>${getEmail(item)}</td>
          <td>${item.vagasAtivas ?? item.qtdVagasAtivas ?? 0}</td>
          <td>${getStatus(item)}</td>
          <td><button class="ban" data-tipo="empresa" data-id="${id}">Banir</button></td>`;
      } else if (tipo === 'vagas') {
        // 7 colunas: checkbox | ID | Título | Empresa | Candidaturas | Status | Ações
        cols = `
          <td><input type="checkbox" data-id="${id}"></td>
          <td>${id}</td>
          <td>${getTituloVaga(item)}</td>
          <td>${getEmpresaNomeFromVaga(item)}</td>
          <td>${getCandidaturas(item)}</td>
          <td>${getStatus(item)}</td>
          <td><button class="ban" data-tipo="vaga" data-id="${id}">Banir</button></td>`;
      } else if (tipo === 'denuncias') {
        // 6 colunas: checkbox | ID | Usuário | Motivo | Status | Ações
        cols = `
          <td><input type="checkbox" data-id="${id}"></td>
          <td>${id}</td>
          <td>${getNome(item.usuario || item.autor || {})}</td>
          <td>${getMotivoDenuncia(item)}</td>
          <td>${getStatus(item)}</td>
          <td><button class="ban" data-tipo="denuncia" data-id="${id}">Remover</button></td>`;
      } else if (tipo === 'feedback') {
        // 6 colunas: checkbox | ID | Vaga | Usuário | Comentário | Ações
        cols = `
          <td><input type="checkbox" data-id="${id}"></td>
          <td>${id}</td>
          <td>${getTituloVaga(item.vaga || {})}</td>
          <td>${getNome(item.usuario || {})}</td>
          <td>${getComentario(item)}</td>
          <td><button class="ban" data-tipo="feedback" data-id="${id}">Remover</button></td>`;
      }

      return `<tr>${cols}</tr>`;
    }).join('');
  }

  function applySearch() {
    const q = (searchInput.value || '').toLowerCase().trim();
    const cur = state.current;
    const base = state.raw[cur] || [];
    state.filtered[cur] = !q ? base : base.filter(x => {
      const blob = [
        getId(x), getNome(x), getEmail(x),
        getTituloVaga(x), getEmpresaNomeFromVaga(x),
        getMotivoDenuncia(x), getComentario(x),
        getStatus(x), (x.validacao ? 'verificado' : 'pendente')
      ].join(' ').toLowerCase();
      return blob.includes(q);
    });
    paint(cur);
  }

  function paint(section) {
    if (section === 'usuarios')   tbUsuarios.innerHTML  = renderRows(state.filtered.usuarios, 'usuarios');
    if (section === 'empresas')   tbEmpresas.innerHTML  = renderRows(state.filtered.empresas, 'empresas');
    if (section === 'vagas')      tbVagas.innerHTML     = renderRows(state.filtered.vagas, 'vagas');
    if (section === 'denuncias')  tbDenuncias.innerHTML = renderRows(state.filtered.denuncias, 'denuncias');
    if (section === 'feedback')   tbFeedback.innerHTML  = renderRows(state.filtered.feedback, 'feedback');

    // bind botões Banir da seção atual
    document.querySelectorAll(`#${section} .ban`).forEach(btn => {
      btn.addEventListener('click', () => {
        const tipo = btn.dataset.tipo;
        const id = btn.dataset.id;
        openModal(`Tem certeza que deseja banir/remover este ${tipo}?`, { tipo, id });
      });
    });
  }

  // --------- Navegação lateral ---------
  menuLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      menuLinks.forEach(x => x.classList.remove('active'));
      a.classList.add('active');

      const section = a.dataset.section;
      state.current = section;
      sectionTitle.textContent = `Gerenciar ${section[0].toUpperCase() + section.slice(1)}`;

      sections.forEach(s => s.classList.remove('active'));
      document.getElementById(section).classList.add('active');

      applySearch();
    });
  });

  // --------- Modal ---------
  btnNo.addEventListener('click', closeModal);
  btnYes.addEventListener('click', async () => {
    const p = state.pendingBan;
    if (!p) return closeModal();
    try {
      const resp = await fetch(`${API_BASE}/banir/${p.tipo}/${p.id}`, {
        method: 'DELETE',
        headers: headers()
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        showToast(data.error || 'Falha ao banir.', false);
      } else {
        showToast('Item banido/removido com sucesso!');
        await loadAll();
        applySearch();
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de rede ao banir.', false);
    } finally {
      closeModal();
    }
  });

  // --------- Busca ---------
  searchInput.addEventListener('input', applySearch);

  // --------- Load inicial ---------
  async function loadAll() {
    try {
      const r = await fetch(`${API_BASE}/dados`, { headers: headers() });
      if (r.status === 401 || r.status === 403) {
        localStorage.removeItem('adminToken');
        return location.replace('login_adm.html');
      }
      const data = await r.json();

      state.raw.usuarios   = data.usuarios   || [];
      state.raw.empresas   = data.empresas   || [];
      state.raw.vagas      = data.vagas      || [];
      state.raw.denuncias  = data.denuncias  || [];
      state.raw.feedback   = data.feedback   || [];

      state.filtered.usuarios  = state.raw.usuarios.slice();
      state.filtered.empresas  = state.raw.empresas.slice();
      state.filtered.vagas     = state.raw.vagas.slice();
      state.filtered.denuncias = state.raw.denuncias.slice();
      state.filtered.feedback  = state.raw.feedback.slice();

      paint(state.current);
    } catch (e) {
      console.error(e);
      showToast('Erro ao carregar dados do painel.', false);
    }
  }

  loadAll();
})();
