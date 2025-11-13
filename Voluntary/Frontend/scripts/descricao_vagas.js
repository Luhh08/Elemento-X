const carouselTrack = document.getElementById('carouselTrack');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const reportBtn = document.getElementById('reportBtn');
const reportModal = document.getElementById('reportModal');
const cancelReport = document.getElementById('cancelReport');
const sendReport = document.getElementById('sendReport');
const applyBtn = document.getElementById('applyBtn');
const applyMessage = document.getElementById('applyMessage');
const applicationsCount = document.getElementById('applicationsCount');
const applicationsPanel = document.getElementById('applicationsPanel');
const applicationsList = document.getElementById('applicationsList');
const closeApps = document.getElementById('closeApps');
const tagsEls = document.querySelectorAll('.tag');
const tagFilterState = new Set();
const pageParams = new URLSearchParams(location.search);
const pageVagaId = pageParams.get('id') || '';

function resolveVagaId() {
  if (applyBtn?.dataset?.vagaId) return applyBtn.dataset.vagaId;
  if (reportBtn?.dataset?.vagaId) return reportBtn.dataset.vagaId;
  const dataEl = document.querySelector('[data-vaga-id]');
  if (dataEl?.dataset?.vagaId) return dataEl.dataset.vagaId;
  return pageVagaId;
}

let currentSlide = 0;
const slides = carouselTrack.querySelectorAll('img');
const totalSlides = slides.length;

function showSlide(idx) {
  if (idx < 0) idx = totalSlides - 1;
  if (idx >= totalSlides) idx = 0;
  currentSlide = idx;
  carouselTrack.style.transform = `translateX(-${idx * 100}%)`;
}

prevBtn.addEventListener('click', () => showSlide(currentSlide - 1));
nextBtn.addEventListener('click', () => showSlide(currentSlide + 1));

let autoplay = setInterval(() => showSlide(currentSlide + 1), 5000);
[prevBtn, nextBtn, carouselTrack].forEach(el => el.addEventListener('mouseenter', () => clearInterval(autoplay)));
carouselTrack.addEventListener('mouseleave', () => autoplay = setInterval(() => showSlide(currentSlide + 1), 5000));

reportBtn?.addEventListener('click', () => {
  if (!localStorage.getItem('token')) {
    alert('Faça login para denunciar uma vaga.');
    return;
  }
  reportModal?.setAttribute('aria-hidden', 'false');
});

cancelReport?.addEventListener('click', () => {
  reportModal?.setAttribute('aria-hidden', 'true');
});

sendReport?.addEventListener('click', async () => {
  const reportField = document.getElementById('reportText');
  if (!reportField) return;
  const text = reportField.value.trim();
  if (!text) { alert('Por favor, descreva o motivo da denúncia.'); return; }
  const token = localStorage.getItem('token');
  if (!token) { alert('Faça login para enviar uma denúncia.'); reportModal?.setAttribute('aria-hidden','true'); return; }
  const targetId = resolveVagaId();
  if (!targetId) { alert('Não foi possível identificar a vaga.'); return; }
  try {
    const resp = await fetch('/api/denuncias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tipo: 'vaga', alvoId: targetId, mensagem: text })
    });
    if (!resp.ok) throw new Error('Falha ao enviar denúncia');
    alert('Denúncia enviada. Obrigado por reportar.');
    reportModal?.setAttribute('aria-hidden', 'true');
    reportField.value = '';
  } catch (err) {
    console.error('Erro ao enviar denúncia:', err);
    alert('Falha ao enviar denúncia. Tente novamente mais tarde.');
  }
});

const JOB_ID = 'job-001';
const STORAGE_KEY = `applications:${JOB_ID}`;

function loadApplications() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveApplications(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function renderApplications() {
  const list = loadApplications();
  applicationsList.innerHTML = '';
  list.forEach((app, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${app.name || 'Anônimo'}</strong> <br>
                    <small>${new Date(app.date).toLocaleString()}</small>
                    <div style="margin-top:6px;">${escapeHtml(app.message)}</div>
                    <div style="margin-top:8px"><button data-i="${i}" class="small-btn remove-app">Remover</button></div>`;
    applicationsList.appendChild(li);
  });
  applicationsCount.textContent = `Aplicações: ${list.length}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

applicationsCount.addEventListener('click', () => {
  const isVisible = applicationsPanel.style.display === 'block';
  applicationsPanel.style.display = isVisible ? 'none' : 'block';
  applicationsPanel.setAttribute('aria-hidden', isVisible ? 'true' : 'false');
});

applyBtn.addEventListener('click', async () => {
  const message = applyMessage.value.trim();
  if (message.length < 10) {
    alert('Escreva pelo menos 10 caracteres na motivação para aplicar.');
    applyMessage.focus();
    return;
  }

  const vagaId = applyBtn.dataset.vagaId;
  if (!vagaId) {
    alert('ID da vaga não encontrado.');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    alert('Você precisa estar logado para se candidatar.');
    return;
  }

  try {
    const resp = await fetch('/api/candidaturas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ vagaId })
    });

    const data = await resp.json();

    if (!resp.ok) {
      alert(data.error || 'Erro ao enviar candidatura.');
      return;
    }

    alert('✅ Candidatura enviada com sucesso!');
    applyMessage.value = '';
  } catch (err) {
    console.error('Erro ao enviar candidatura:', err);
    alert('❌ Erro ao conectar com o servidor.');
  }
});


applicationsList.addEventListener('click', (e) => {
  if (e.target.matches('.remove-app')) {
    const idx = Number(e.target.dataset.i);
    const arr = loadApplications();
    arr.splice(idx, 1);
    saveApplications(arr);
    renderApplications();
  }
});

tagsEls.forEach(btn => {
  btn.addEventListener('click', () => {
    const tag = btn.textContent.trim();
    if (tagFilterState.has(tag)) {
      tagFilterState.delete(tag);
      btn.style.opacity = '1';
      btn.style.transform = 'none';
    } else {
      tagFilterState.add(tag);
      btn.style.opacity = '0.65';
      btn.style.transform = 'translateY(-3px)';
    }
    console.log('Tags ativas:', Array.from(tagFilterState));
  });
});

function getVagaStatus() {
  const elData = document.querySelector('[data-vaga-status]');
  if (elData && elData.dataset.vagaStatus) return elData.dataset.vagaStatus;
  const badge = document.querySelector('.status-badge, .status, .badge-status');
  if (badge && badge.getAttribute('data-status')) return badge.getAttribute('data-status');
  if (badge && badge.textContent) return badge.textContent;
  return '';
}

function isAberta(valor) {
  const s = String(valor || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return s.includes('ABERTA') || s.includes('ABERTO');
}

function _norm(t) {
  return String(t || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); 
}

function getVagaStatusText() {
  const candidates = [
    document.querySelector("[data-vaga-status]")?.dataset?.vagaStatus,
    document.querySelector("[data-status]")?.getAttribute("data-status"),
    document.querySelector(".status-badge")?.textContent,
    document.querySelector(".badge-status")?.textContent,
    document.querySelector(".status")?.textContent,
    document.querySelector(".chip.status")?.textContent,
    document.querySelector(".pill.status")?.textContent
  ].filter(Boolean);


  return candidates.length ? candidates[0].trim() : "";
}

function isAbertaStatus(txt) {
  const s = _norm(txt);
  const hasOpen =
    s.includes("ABERTA") ||
    s.includes("ABERTO") ||
    s.includes("INSCRICOES ABERTAS");
  const hasClosed =
    s.includes("FINALIZADA") ||
    s.includes("FINALIZADO") ||
    s.includes("ENCERRADA") ||
    s.includes("ENCERRADO") ||
    s.includes("INSCRICOES FINALIZADAS") ||
    s.includes("FECHADA") ||
    s.includes("FECHADO") ||
    s.includes("ANDAMENTO"); // tratar como não-aberta para aplicação

  if (hasClosed) return false;
  if (hasOpen) return true;
  // fallback conservador: se não identificou nada, considera fechada
  return false;
}

function hideApplyUI(hide) {
  const display = hide ? "none" : "";
  if (applyBtn)    applyBtn.style.display = display;
  if (applyPanel)  applyPanel.style.display = display;
  if (applyMessage) applyMessage.disabled = hide;
}

function toggleApplyByStatus() {
  const txt =
    document.querySelector("[data-vaga-status]")?.dataset?.vagaStatus ||
    document.querySelector(".status-badge")?.getAttribute("data-status") ||
    document.querySelector(".badge-status")?.getAttribute("data-status") ||
    document.querySelector(".status-badge, .badge-status, .status")?.textContent ||
    "";

  const S = String(txt).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const isOpen = S.includes("ABERTA") || S.includes("ABERTO") || S.includes("INSCRICOES ABERTAS");
  const isClosed =
    S.includes("FINALIZADA") || S.includes("FINALIZADO") ||
    S.includes("ENCERRADA")  || S.includes("ENCERRADO")  ||
    S.includes("INSCRICOES FINALIZADAS") || S.includes("ANDAMENTO") ||
    S.includes("FECHADA") || S.includes("FECHADO");

  hideApplyUI(!isOpen || isClosed);
}

function setupStatusWatcher() {
  toggleApplyByStatus();
  const obs = new MutationObserver(() => toggleApplyByStatus());
  obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
}

renderApplications();
showSlide(0);
toggleApplyByStatus();
applicationsCount.style.cursor = 'pointer';
