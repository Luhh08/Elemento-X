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
    pending: null // { tipo, id, acao }
  };

  // --------- Utils ---------
  const headers = () => ({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' });

  function showToast(text, ok = true) {
    toast.textContent = text;
    toast.className = 'toast ' + (ok ? 'ok' : 'err') + ' show';
    setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // cria/recupera o campo de motivo no modal
  function ensureReasonField() {
    let fld = modal.querySelector('#ban-reason');
    if (!fld) {
      const wrap = document.createElement('div');
      wrap.style.marginTop = '10px';
      wrap.innerHTML = `
        <label for="ban-reason" style="display:block;font-size:13px;margin-bottom:6px;">Motivo do banimento (opcional)</label>
        <textarea id="ban-reason" rows="3" style="width:100%;resize:vertical;"></textarea>
      `;
      modalText.insertAdjacentElement('afterend', wrap);
      fld = wrap.querySelector('#ban-reason');
    }
    return fld;
  }

  function openModal(payload) {
    // payload: { tipo, id, acao }
    state.pending = payload;
    const isBan = ['usuario','empresa','vaga'].includes(payload?.tipo) && payload?.acao === 'banir';
    modalText.textContent = isBan
      ? 'Tem certeza que deseja BANIR este registro? O acesso será bloqueado, mas os identificadores serão preservados.'
      : (payload?.tipo === 'denuncia' || payload?.tipo === 'feedback')
        ? `Confirmar remoção definitiva deste ${payload.tipo}?`
        : 'Deseja DESBANIR este registro?';

    // motivo só aparece no ban
    const reasonField = ensureReasonField();
    reasonField.parentElement.style.display = isBan ? 'block' : 'none';
    if (isBan) reasonField.value = '';

    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
  }

  function closeModal() {
    state.pending = null;
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
  }

  // --------- Getters ---------
  const getId   = (x) => x.id || x._id || x.idUsuario || x.idEmpresa || x.idVaga;
  const getNome = (x) => x.nome || x.username || x.usuario || x.razaoSocial || x.fantasia || x.titulo || '—';
  const getEmail= (x) => x.email || x.contatoEmail || x.emailEmpresa || '—';
  const getStatusText = (x) => x.status || x.ativo || x.aprovado || x.situacao || '—';
  const getEmpresaNomeFromVaga = (v) =>
    (v.empresa && (v.empresa.nome || v.empresa.razaoSocial || v.empresa.fantasia)) || v.empresaNome || '—';
  const getTituloVaga = (v) => v.titulo || v.nome || v.nomeVaga || '—';
  const getCandidaturas = (v) => (Array.isArray(v.candidaturas) ? v.candidaturas.length : (v.qtdCandidaturas ?? v.aplicacoes ?? 0));
  const getMotivoDenuncia = (d) => d.motivo || d.reason || d.tipo || '—';
  const getComentario = (f) => f.comentario || f.texto || f.mensagem || '—';

  // --------- Status visual (badge) ----------
  function badge(label, cls) {
    return `<span class="badge ${cls}">${label}</span>`;
  }
function statusBadgeForAccount(item) {
  // 1) Banido sempre vence
  if (item.isBanned) return badge('BANIDO', 'status-banido');

  // 2) Usa 'validacao' (se veio) OU o campo 'status' enviado pelo backend
  const raw = (item.validacao === true)
    ? 'verificado'
    : String(item.status || '').toLowerCase();

  if (raw === 'ativo' || raw === 'verificado') {
    return badge('VERIFICADO', 'status-verificado');
  }
  return badge('PENDENTE', 'status-pendente');
}

  function actionButtonHTML(item, tipo) {
    // mostra Banir/Desbanir conforme isBanned (só para usuario/empresa/vaga)
    if (['usuarios','empresas','vagas'].includes(tipo)) {
      const banned = !!item.isBanned;
      const label  = banned ? 'Desbanir' : 'Banir';
      const acao   = banned ? 'desbanir' : 'banir';
      const btnCls = banned ? 'unban' : 'ban';
      return `<button class="${btnCls}" data-tipo="${tipo.slice(0,-1)}" data-acao="${acao}" data-id="${getId(item)}">${label}</button>`;
    }
    // denúncia/feedback => remoção
    const id = getId(item);
    if (tipo === 'denuncias') {
      return `<button class="ban" data-tipo="denuncia" data-acao="remover" data-id="${id}">Remover</button>`;
    }
    if (tipo === 'feedback') {
      return `<button class="ban" data-tipo="feedback" data-acao="remover" data-id="${id}">Remover</button>`;
    }
    return '';
  }

  // --------- Render ---------
  function renderRows(list, tipo) {
    return list.map(item => {
      const id = getId(item);
      let cols = '';

      if (tipo === 'usuarios') {
        cols = `
          <td><input type="checkbox" data-id="${id}"></td>
          <td>${id}</td>
          <td>${getNome(item)}</td>
          <td>${getEmail(item)}</td>
          <td>${statusBadgeForAccount(item)}</td>
          <td>${actionButtonHTML(item, 'usuarios')}</td>`;
      } else if (tipo === 'empresas') {
        cols = `
          <td><input type="checkbox" data-id="${id}"></td>
          <td>${id}</td>
          <td>${getNome(item)}</td>
          <td>${getEmail(item)}</td>
          <td>${item.vagasAtivas ?? item.qtdVagasAtivas ?? 0}</td>
          <td>${statusBadgeForAccount(item)}</td>
          <td>${actionButtonHTML(item, 'empresas')}</td>`;
      } else if (tipo === 'vagas') {
        const vagaStatus = (item.isBanned)
          ? badge('BANIDA', 'status-banido')
          : badge(getStatusText(item), 'status-vaga');
        cols = `
          <td><input type="checkbox" data-id="${id}"></td>
          <td>${id}</td>
          <td>${getTituloVaga(item)}</td>
          <td>${getEmpresaNomeFromVaga(item)}</td>
          <td>${getCandidaturas(item)}</td>
          <td>${vagaStatus}</td>
          <td>${actionButtonHTML(item, 'vagas')}</td>`;
      } else if (tipo === 'denuncias') {
        cols = `
          <td><input type="checkbox" data-id="${id}"></td>
          <td>${id}</td>
          <td>${getNome(item.usuario || item.autor || {})}</td>
          <td>${getMotivoDenuncia(item)}</td>
          <td>${getStatusText(item)}</td>
          <td>${actionButtonHTML(item, 'denuncias')}</td>`;
      } else if (tipo === 'feedback') {
        cols = `
          <td><input type="checkbox" data-id="${id}"></td>
          <td>${id}</td>
          <td>${getTituloVaga(item.vaga || {})}</td>
          <td>${getNome(item.usuario || {})}</td>
          <td>${getComentario(item)}</td>
          <td>${actionButtonHTML(item, 'feedback')}</td>`;
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
      getStatusText(x),
      String(x.status || ''),         // 👈 acrescentado
      (x.validacao ? 'verificado' : 'pendente'),
      (x.isBanned ? 'banido' : ''),
      (x.banReason || '')
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

    document.querySelectorAll(`#${section} .ban, #${section} .unban`).forEach(btn => {
      btn.addEventListener('click', () => {
        const tipo  = btn.dataset.tipo;      
        const acao  = btn.dataset.acao || (btn.classList.contains('unban') ? 'desbanir' : 'banir');
        const id    = btn.dataset.id;
        openModal({ tipo, id, acao });
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
    const p = state.pending; // { tipo, id, acao }
    if (!p) return closeModal();

    try {
      let url, opt;

      if (['usuario','empresa','vaga'].includes(p.tipo)) {
        if (p.acao === 'banir') {
          const reasonField = modal.querySelector('#ban-reason');
          const reason = reasonField ? reasonField.value.trim() : '';
          url = `${API_BASE}/banir/${p.tipo}/${p.id}`;
          opt = {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ reason: reason || 'Violação das regras' })
          };
        } else {
          url = `${API_BASE}/desbanir/${p.tipo}/${p.id}`;
          opt = { method: 'POST', headers: headers() };
        }
      } else {
        url = `${API_BASE}/banir/${p.tipo}/${p.id}`;
        opt = { method: 'DELETE', headers: headers() };
      }

      const resp = await fetch(url, opt);
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        showToast(data.error || 'Falha na operação.', false);
      } else {
        showToast(data.message || 'Operação concluída!');
        await loadAll();
        applySearch();
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de rede.', false);
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
