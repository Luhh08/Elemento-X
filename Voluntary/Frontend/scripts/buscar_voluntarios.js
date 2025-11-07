(() => {
  const SAME_ORIGIN = location.origin.includes(':3000');
  const API_BASE    = SAME_ORIGIN ? '/api' : 'http://localhost:3000/api';

  const PAGE_SIZE   = 6;
  const GRID        = document.getElementById('volGrid');
  const PAG         = document.getElementById('volPagination');

  const Q_MAIN      = document.getElementById('pesquisar_vagas');
  const Q_TAGS      = document.getElementById('pesquisar_tags');
  const TAG_RESULTS = document.getElementById('tagResults');
  const TAG_ACTIVE  = document.getElementById('tagActiveBar');

  const PLACEHOLDER = 'img/default-avatar.jpg';

  const state = {
    all: [],
    filtered: [],
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    q: '',
    activeTags: new Set(),
    allTags: []
  };

  const esc  = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm = (s) => String(s ?? '').toLowerCase();
  const asArray = (v) => Array.isArray(v) ? v.filter(Boolean) : v ? [v] : [];

  function formatTelefoneBR(v){
    const d = String(v||'').replace(/\D/g,'').slice(0,11);
    if(!d) return '—';
    if(d.length<=10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3').replace(/-$/,'');
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3').replace(/-$/,'');
  }

  function mapVol(u){
    const id     = u.id || u._id || u.usuarioId || u.uuid || '';
    const nome   = u.nome || 'Voluntário';
    const foto   = u.fotoUrl || u.avatarUrl || PLACEHOLDER;
    const email  = u.emailcontato || '—';
    const tel    = u.telefonecontato || '';
    const skills = asArray(u.competencias || u.skills || u.tags);
    const horarios = asArray(u.preferenciaHorario || u.horario || []);
    return { id, nome, foto, email, tel, skills, horarios };
  }

  function cardHTML(v){
    const href = `perfil-usuario.html?id=${encodeURIComponent(v.id)}`;
    return `
      <article class="job-card">
        <div class="job-card-image-wrapper">
          <img src="${esc(v.foto)}" alt="${esc(v.nome)}" class="job-card-image" loading="lazy"
               onerror="this.src='${PLACEHOLDER}'">
        </div>
        <div class="job-card-body">
          <p class="job-card-title">${esc(v.nome)}</p>
          <p class="job-card-type">${esc(v.email)}</p>
          <p class="job-card-type">Telefone: ${esc(formatTelefoneBR(v.tel))}</p>
          <div class="job-card-tags">
            ${v.skills.map(t => `<span class="tag-vaga">${esc(t)}</span>`).join('')}
          </div>
        </div>
        <a href="${href}" class="btn btn-details" target="_blank">Ver perfil detalhado</a>
      </article>
    `;
  }

  function renderGrid(list){
    GRID.innerHTML = list.length ? list.map(cardHTML).join('')
      : `<p style="color:#6b7280">Nenhum voluntário encontrado.</p>`;
  }

  function renderPagination(){
    const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    const btn = (n, active=false) =>
      `<a href="#" class="pagination-link page-number ${active?'active':''}" data-page="${n}">${n}</a>`;

    let pages = [];
    if (totalPages <= 7) {
      for (let i=1;i<=totalPages;i++) pages.push(btn(i, i===state.page));
    } else {
      pages.push(btn(1, state.page===1), btn(2, state.page===2), btn(3, state.page===3));
      pages.push(`<span class="pagination-ellipsis">…</span>`);
      pages.push(btn(totalPages-1, state.page===totalPages-1), btn(totalPages, state.page===totalPages));
    }

    PAG.innerHTML = `
      <a href="#" class="pagination-link prev-link ${state.page===1?'disabled':''}" data-prev>
        <img src="img/arrowleft.png" alt="Previous"> Previous
      </a>
      <div class="pagination-pages">${pages.join('')}</div>
      <a href="#" class="pagination-link next-link ${state.page===totalPages?'disabled':''}" data-next>
        Next <img src="img/arrowright.png" alt="Next">
      </a>
    `;

    PAG.querySelectorAll('.page-number').forEach(a=>{
      a.addEventListener('click', e=>{
        e.preventDefault();
        const n = Number(a.dataset.page);
        if (n && n!==state.page){ state.page=n; paginateAndRender(); }
      });
    });
    PAG.querySelector('[data-prev]')?.addEventListener('click', e=>{
      e.preventDefault(); if(state.page>1){ state.page--; paginateAndRender(); }
    });
    PAG.querySelector('[data-next]')?.addEventListener('click', e=>{
      e.preventDefault();
      const last = Math.max(1, Math.ceil(state.total/state.pageSize));
      if(state.page<last){ state.page++; paginateAndRender(); }
    });
  }

  function applyFilters(){
    const q = norm(state.q);
    const act = [...state.activeTags].map(norm);

    let list = state.all.filter(v=>{
      const skills = v.skills.map(norm);
      const passTags = act.every(t => skills.includes(t));
      if(!passTags) return false;

      if(!q) return true;
      const hay = norm([v.nome, v.email, v.tel, ...v.skills].join(' | '));
      return hay.includes(q);
    });

    state.filtered = list;
    state.total = list.length;
    state.page = 1;
    paginateAndRender();
  }

  function paginateAndRender(){
    const start = (state.page-1)*state.pageSize;
    const slice = state.filtered.slice(start, start + state.pageSize);
    renderGrid(slice);
    renderPagination();
  }

  function renderActiveChips(){
    TAG_ACTIVE.innerHTML = '';
    state.activeTags.forEach(tag=>{
      const chip = document.createElement('span');
      chip.className = 'filter-chip active';
      chip.innerHTML = `${esc(tag)} <span class="chip-x" aria-label="Remover ${esc(tag)}"></span>`;
      chip.querySelector('.chip-x').addEventListener('click', ()=>{
        state.activeTags.delete(tag);
        renderActiveChips();
        renderResultsBox();
        applyFilters();
      });
      TAG_ACTIVE.appendChild(chip);
    });
  }

  function renderResultsBox(){
    const q = norm(Q_TAGS.value || '');
    const matches = q ? state.allTags.filter(t => norm(t).includes(q) && !state.activeTags.has(t)) : [];

    TAG_RESULTS.innerHTML = '';
    TAG_RESULTS.hidden = matches.length === 0;

    matches.forEach(tag=>{
      const pill = document.createElement('label');
      pill.className = 'tag-pill';
      pill.innerHTML = `<input type="checkbox" aria-label="Filtrar por ${esc(tag)}"><span>${esc(tag)}</span>`;
      const cb = pill.querySelector('input');
      cb.addEventListener('change', ()=>{
        if(cb.checked){
          state.activeTags.add(tag);
          cb.checked = false;
          renderActiveChips();
          renderResultsBox();
          applyFilters();
        }
      });
      TAG_RESULTS.appendChild(pill);
    });
  }

  function wireEvents(){
    Q_MAIN?.addEventListener('input', ()=>{
      state.q = Q_MAIN.value || '';
      applyFilters();
    });
    Q_TAGS?.addEventListener('input', renderResultsBox);
  }

  async function fetchUsuarios(){
    const res = await fetch(`${API_BASE}/users`, { headers:{Accept:'application/json'} });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const arr = Array.isArray(data) ? data : (data.items || data.usuarios || data.users || []);
    return arr.map(mapVol);
  }

  async function init(){
    try{
      const items = await fetchUsuarios();
      // só voluntários que têm ao menos um campo relevante
      state.all = items;
      // compila nuvem de tags a partir das competências
      state.allTags = [...new Set(items.flatMap(v => v.skills).map(String).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR',{sensitivity:'base'}));

      // primeira filtragem (sem filtros ativos)
      state.filtered = items.slice();
      state.total = items.length;
      paginateAndRender();

      // render inicial da caixa de resultados de tags
      renderResultsBox();
      wireEvents();
    }catch(err){
      console.error(err);
      GRID.innerHTML = `<p style="color:#b91c1c">Não foi possível carregar os voluntários.</p>`;
      PAG.innerHTML  = '';
    }
  }

  init();
})();
