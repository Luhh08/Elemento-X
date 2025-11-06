(() => {
  const SAME_ORIGIN = location.origin.includes(':3000');
  const API_BASE    = SAME_ORIGIN ? '/api' : 'http://localhost:3000/api';
  const VAGAS_URL   = `${API_BASE}/vagas`;
  const PAGE_SIZE   = 9;

  const gridEl = document.querySelector('#jobsGrid');
  const pagEl  = document.querySelector('.pagination');

  const PLACEHOLDER = 'img/placeholdervaga.png';
  const DEFAULT_AVATAR = 'img/default-avatar.jpg';
  const BASE = SAME_ORIGIN ? 'http://localhost:3000' : '';

  const state = { page: 1, pageSize: PAGE_SIZE, total: 0, items: [] };

  const clamp = (txt, n = 160) => (txt || '').length > n ? txt.slice(0, n).trim() + '…' : (txt || '');
  const asArray = (v) => Array.isArray(v) ? v.filter(Boolean) : v ? [v] : [];

  const absolutize = (url) => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return url.startsWith('/') ? BASE + url : `${BASE}/${url}`;
  };

  function mapVaga(raw) {
    const titulo    = raw.titulo || raw.nome || raw.title || 'Vaga';
    const descricao = raw.descricao || raw.description || '';
    const resumo    = raw.resumo || clamp(descricao, 160);

    const imgRel = (asArray(raw.imagens)[0]) || raw.imageUrl || raw.bannerUrl;
    const img    = absolutize(imgRel) || PLACEHOLDER;

    const empresaId    = raw.empresa?.id || raw.empresaId || null;
    const empresaNome  = raw.empresa?.razao_social || raw.empresa?.usuario || '';
    const empresaLogo  = absolutize(raw.empresa?.logoUrl) || DEFAULT_AVATAR;

    const tags = [...asArray(raw.tags)];

    return {
      id: raw.id || raw._id || '',
      titulo,
      resumo,
      descricao,
      img,
      tags,
      empresaId,
      empresaNome,
      empresaLogo
    };
  }

  const tagSpan = (t) => `<span class="tag-vaga">${String(t)}</span>`;

  function cardHTML(v) {
    const linkEmpresa = v.empresaUsuario
  ? `perfil-empresa.html?id=@${encodeURIComponent(v.empresaUsuario)}&public=true`
  : `perfil-empresa.html?id=${encodeURIComponent(v.empresaId)}&public=true`;

    return `
      <article class="job-card">
        <div class="job-card-image-wrapper">
          <img src="${v.img}" alt="${v.titulo}" class="job-card-image" loading="lazy"
               onerror="this.src='${PLACEHOLDER}'">
        </div>

        <div class="vaga">
          <h3 class="descricao_vaga">${v.titulo}</h3>

          <a class="empresa-mini" href="${linkEmpresa}" title="${v.empresaNome}">
            <img class="empresa-avatar" src="${v.empresaLogo}" alt="${v.empresaNome}"
                 onerror="this.src='${DEFAULT_AVATAR}'">
            <span class="empresa-nome">${v.empresaNome || ''}</span>
          </a>

          <p class="resumo_vaga" style="margin:.25rem 0 0;color:#334155;font-size:14px;line-height:1.35">
            ${v.resumo}
          </p>

          <div class="tags_vaga" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
            ${v.tags.map(tagSpan).join('')}
          </div>
        </div>

        <a href="descricao_vagas.html?id=${encodeURIComponent(v.id)}" class="btn btn-details">Ver Detalhes</a>
      </article>
    `;
  }

  function renderGrid(items) {
    gridEl.innerHTML = items.map(cardHTML).join('');
    if (typeof window.applyFilters === 'function') {
      try { window.applyFilters(); } catch (_) {}
    }
  }

  function renderPagination() {
    if (!pagEl) return;
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

    pagEl.innerHTML = `
      <a href="#" class="pagination-link prev-link ${state.page===1?'disabled':''}" data-prev>
        <img src="img/arrowleft.png" alt="Previous"> Previous
      </a>
      <div class="pagination-pages">${pages.join('')}</div>
      <a href="#" class="pagination-link next-link ${state.page===totalPages?'disabled':''}" data-next>
        Next <img src="img/arrowright.png" alt="Next">
      </a>
    `;

    pagEl.querySelectorAll('.page-number').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const n = Number(a.dataset.page);
        if (n && n !== state.page) loadPage(n);
      });
    });
    pagEl.querySelector('[data-prev]')?.addEventListener('click', e => {
      e.preventDefault();
      if (state.page > 1) loadPage(state.page - 1);
    });
    pagEl.querySelector('[data-next]')?.addEventListener('click', e => {
      e.preventDefault();
      const last = Math.max(1, Math.ceil(state.total / state.pageSize));
      if (state.page < last) loadPage(state.page + 1);
    });
  }

  async function fetchVagas(page=1, pageSize=PAGE_SIZE) {
    const url = new URL(VAGAS_URL, location.origin);
    url.searchParams.set('page', page);
    url.searchParams.set('pageSize', pageSize);

    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const items = data.items ?? data.vagas ?? [];
    const total = data.total ?? items.length;
    return { items, total, page: data.page ?? page, pageSize: data.pageSize ?? pageSize };
  }

  async function loadPage(page=1) {
    try {
      const { items, total, pageSize } = await fetchVagas(page, state.pageSize);
      state.page = page;
      state.total = total;
      state.pageSize = pageSize;
      state.items = items.map(mapVaga);
      renderGrid(state.items);
      renderPagination();
      document.querySelector('.main-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('Falha ao carregar vagas:', err);
      gridEl.innerHTML = `<p style="color:#b91c1c">Não foi possível carregar as vagas.</p>`;
      pagEl.innerHTML = '';
    }
  }

  loadPage(1);
})();
