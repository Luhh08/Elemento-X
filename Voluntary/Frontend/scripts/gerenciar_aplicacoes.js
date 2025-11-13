(() => {
  const SAME_ORIGIN = location.origin.includes(':3000');
  const API_BASE = SAME_ORIGIN ? '/api' : 'http://localhost:3000/api';
  const ENDPOINTS = [`${API_BASE}/candidaturas`];
  const PAGE_SIZE = 6;
  const PLACEHOLDER = 'img/imagem_voluntario.png';

  const grid = document.getElementById('appsGrid');
  const pag = document.getElementById('appsPag');
  const qMain = document.getElementById('pesquisar_vagas');
  const qTags = document.getElementById('pesquisar_tags');
  const tagActiveBar = document.getElementById('tagActiveBar');
  const tagResults = document.getElementById('tagResults');

  const state = {
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    items: [],
    tagsActive: new Set(),
    allTags: [],
    q: '',
    turnos: new Set()
  };

  // === HELPERS ===
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
  const norm = s => String(s||'').toLowerCase();
  const asArr = v => Array.isArray(v) ? v.filter(Boolean) : v ? [v] : [];

  function fmtPhone(v){
    const d = String(v||'').replace(/\D/g,'').slice(0,11);
    if(!d) return '—';
    if(d.length<=10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3').replace(/-$/,'');
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3').replace(/-$/,'');
  }

  // função para pegar token de empresa OU padrão
  function getAuthToken() {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('empresaToken') ||
      localStorage.getItem('adminToken') ||
      ''
    );
  }

  function mapApp(a){
    const id = a.id || a._id || a.candidaturaId || a.aplicacaoId || '';
    const status = (a.status || '').toString().toUpperCase();
    const v = a.voluntario || a.usuario || {};
    const vaga = a.vaga || a.job || {};
    const nome = v.nome || 'Nome';
    const emailContato = v.emailcontato || v.email || '—';
    const tel = v.telefonecontato || v.telefone || '';
    const foto = v.fotoUrl || PLACEHOLDER;
    const skills = asArr(v.competencias || v.skills || v.tags);
    const turnos = asArr(v.preferenciaHorario || v.turnos);
    const vagaId = vaga.id || vaga._id || '';
    const vagaTitulo = vaga.titulo || vaga.nome || 'Vaga';
    const vagaStatus = (vaga.status || '').toString().toUpperCase();
    return { id, status, nome, emailContato, tel, foto, skills, turnos, vagaId, vagaTitulo, vagaStatus, raw:a };
  }

  function tag(t){ return `<span class="tag-vaga tag-skill">${esc(t)}</span>`; }

  function cardHTML(x){
    const linkVaga = x.vagaId ? `descricao_vagas.html?id=${encodeURIComponent(x.vagaId)}` : '#';
    return `
    <article class="job-card">
  <div class="job-card-image-wrapper">
    <img src="${esc(x.foto)}" alt="${esc(x.nome)}" class="job-card-image" onerror="this.src='${PLACEHOLDER}'">
  </div>
  <div class="vaga">
    <div class="badge-vaga">
      <a href="${linkVaga}">${esc(x.vagaTitulo)}</a>
      <span class="mini">${esc(x.status || '')}</span>
    </div>

    <p class="titulo_vaga">${esc(x.nome)}</p>
    <p class="resumo_vaga" style="margin:.25rem 0 0;color:#334155;font-size:14px;">
      ${fmtPhone(x.tel)}
    </p>
    <p class="descricao_vaga" style="
      font-weight:500;
      font-size:14px;
      line-height:1.3;
      color:#0f172a;
      margin:.25rem 0 0;
      max-width:100%;
      white-space:normal;
      overflow-wrap:anywhere;    
      word-break:break-word;     
    ">
      ${esc(x.emailContato)}
    </p>
    <div class="tags_vaga" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
      ${x.skills.map(tag).join('')}
    </div>

      <div class="card-actions">
      ${(['ANDAMENTO','FINALIZADA'].includes(x.vagaStatus) ?
        `<span class="note">Vaga ${esc(x.vagaStatus.toLowerCase())}. Ações desabilitadas.</span>` :
        `<button class="btn-accept" data-accept="${esc(x.id)}">Aceitar aplicação</button>
         <button class="btn-reject" data-reject="${esc(x.id)}">Recusar aplicação</button>`
      )}
      <a href="perfil-usuario.html?id=${encodeURIComponent(x.raw?.voluntario?.id || x.raw?.usuario?.id || '')}" class="btn btn-details">Ver Perfil Detalhado</a>
    </div>
  </div>
</article>
`;
  }

  // === RENDER ===
  function render(){
    const q = norm(state.q);
    const tags = [...state.tagsActive].map(norm);
    const turnos = [...state.turnos].map(norm);

    let list = state.items.filter(x=>{
      if(tags.length && !tags.every(t => x.skills.map(norm).includes(t))) return false;
      if(turnos.length && !turnos.some(t => x.turnos.map(norm).includes(t))) return false;
      if(!q) return true;
      const hay = norm([x.nome, x.emailContato, x.vagaTitulo, ...x.skills].join(' | '));
      return hay.includes(q);
    });

    state.total = list.length;
    const start = (state.page-1)*state.pageSize;
    list = list.slice(start, start+state.pageSize);
    grid.innerHTML = list.map(cardHTML).join('') || `<p style="color:#6b7280">Nenhuma aplicação encontrada.</p>`;
    wireActions();
    renderPagination();
  }

  function renderPagination(){
    const totalPages = Math.max(1, Math.ceil(state.total/state.pageSize));
    const btn = (n,a=false)=>`<a href="#" class="pagination-link page-number ${a?'active':''}" data-page="${n}">${n}</a>`;
    let pages=[];
    if(totalPages<=7){ for(let i=1;i<=totalPages;i++) pages.push(btn(i,i===state.page)); }
    else{ pages.push(btn(1,state.page===1),btn(2,state.page===2),btn(3,state.page===3)); pages.push(`<span class="pagination-ellipsis">…</span>`); pages.push(btn(totalPages-1,state.page===totalPages-1),btn(totalPages,state.page===totalPages)); }
    pag.innerHTML = `
      <a href="#" class="pagination-link prev-link ${state.page===1?'disabled':''}" data-prev><img src="img/arrowleft.png" alt=""> Previous</a>
      <div class="pagination-pages">${pages.join('')}</div>
      <a href="#" class="pagination-link next-link ${state.page===totalPages?'disabled':''}" data-next>Next <img src="img/arrowright.png" alt=""></a>`;
    pag.querySelectorAll('.page-number').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const n=Number(a.dataset.page);if(n&&n!==state.page){state.page=n;render();}}));
    pag.querySelector('[data-prev]')?.addEventListener('click',e=>{e.preventDefault();if(state.page>1){state.page--;render();}});
    pag.querySelector('[data-next]')?.addEventListener('click',e=>{e.preventDefault();const last=Math.max(1,Math.ceil(state.total/state.pageSize));if(state.page<last){state.page++;render();}});
  }

  function renderActiveChips(){
    tagActiveBar.innerHTML = '';
    state.tagsActive.forEach(t=>{
      const chip=document.createElement('span');
      chip.className='filter-chip';
      chip.innerHTML = `${esc(t)} <span class="chip-x"></span>`;
      chip.querySelector('.chip-x').addEventListener('click', ()=>{
        state.tagsActive.delete(t);
        renderActiveChips();
        renderTagResults();
        state.page=1;
        render();
      });
      tagActiveBar.appendChild(chip);
    });
  }

  function renderTagResults(){
    const q = norm(qTags.value||'');
    const matches = !q ? [] : state.allTags.filter(t => t.toLowerCase().includes(q) && !state.tagsActive.has(t));
    tagResults.innerHTML = '';
    tagResults.hidden = matches.length===0;
    matches.forEach(t=>{
      const lbl=document.createElement('label');
      lbl.className='tag-pill';
      lbl.innerHTML=`<input type="checkbox"><span>${esc(t)}</span>`;
      const cb=lbl.querySelector('input');
      cb.addEventListener('change',()=>{
        if(cb.checked){
          state.tagsActive.add(t);
          cb.checked=false;
          renderActiveChips();
          renderTagResults();
          state.page=1;
          render();
        }
      });
      tagResults.appendChild(lbl);
    });
  }

  function wireFilters(){
    qMain?.addEventListener('input', ()=>{
      state.q=qMain.value||'';
      state.page=1;
      render();
    });
    qTags?.addEventListener('input', renderTagResults);
    document.querySelectorAll('input[name="turno"]').forEach(cb=>{
      cb.addEventListener('change', ()=>{
        if(cb.checked) state.turnos.add(cb.value);
        else state.turnos.delete(cb.value);
        state.page=1;
        render();
      });
    });
  }

  function wireActions(){
    grid.querySelectorAll('[data-accept]').forEach(b=>{
      b.addEventListener('click', async ()=>{
        const id=b.getAttribute('data-accept');
        await updateStatus(id,'ACEITA');
      });
    });
    grid.querySelectorAll('[data-reject]').forEach(b=>{
      b.addEventListener('click', async ()=>{
        const id=b.getAttribute('data-reject');
        await updateStatus(id,'RECUSADA');
      });
    });
  }

  async function updateStatus(id,status){
    const token = getAuthToken();
    try{
      const res = await fetch(`${API_BASE}/candidaturas/${encodeURIComponent(id)}/status`,{
        method:'PATCH',
        headers:{
          'Content-Type':'application/json',
          ...(token?{'Authorization':`Bearer ${token}`}:{}),
        },
        body:JSON.stringify({status})
      });
      if(res.ok){
        const item=state.items.find(i=>i.id===id);
        if(item){ item.status=status; render(); }
        return;
      }
    }catch(_){}
    alert('Não foi possível atualizar o status.');
  }

  async function fetchApps(page = 1, pageSize = PAGE_SIZE) {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("empresaToken") ||
    localStorage.getItem("adminToken");

  if (!token) {
    console.warn("⚠️ Nenhum token encontrado. Faça login novamente como empresa.");
    alert("Você precisa estar logado como empresa para ver as candidaturas.");
    return { mapped: [], allTags: [] };
  }

  try {
    const url = new URL(`${API_BASE}/candidaturas`, location.origin);
    url.searchParams.set("page", page);
    url.searchParams.set("pageSize", pageSize);

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`, // 🔥 garante o envio do token
      },
    });

    if (res.status === 401) {
      alert("Sessão expirada ou token inválido. Faça login novamente.");
      return { mapped: [], allTags: [] };
    }

    if (!res.ok) throw new Error(`Erro ao carregar candidaturas (${res.status})`);

    const data = await res.json();
    const items = data.items || [];
    const mapped = items.map(mapApp);
    const allTags = [...new Set(mapped.flatMap((x) => x.skills).filter(Boolean))];

    return { mapped, allTags };
  } catch (err) {
    console.error("Erro ao buscar candidaturas:", err);
    return { mapped: [], allTags: [] };
  }
}

  async function init(){
    const { mapped, allTags } = await fetchApps(1, PAGE_SIZE);
    state.items = mapped;
    state.allTags = allTags.sort((a,b)=>a.localeCompare(b,'pt-BR',{sensitivity:'base'}));
    state.page = 1;
    state.pageSize = PAGE_SIZE;
    state.total = mapped.length;
    renderActiveChips();
    renderTagResults();
    wireFilters();
    render();
  }

  init();
})();
