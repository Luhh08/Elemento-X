// Elementos-chave
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

let currentSlide = 0;
const slides = carouselTrack.querySelectorAll('img');
const totalSlides = slides.length;

// --- CAROUSEL SIMPLES ---
function showSlide(idx){
  if(idx < 0) idx = totalSlides - 1;
  if(idx >= totalSlides) idx = 0;
  currentSlide = idx;
  carouselTrack.style.transform = `translateX(-${idx * 100}%)`;
}
prevBtn.addEventListener('click', ()=> showSlide(currentSlide - 1));
nextBtn.addEventListener('click', ()=> showSlide(currentSlide + 1));

// autoplay leve
let autoplay = setInterval(()=> showSlide(currentSlide + 1), 5000);
[prevBtn, nextBtn, carouselTrack].forEach(el => el.addEventListener('mouseenter', ()=> clearInterval(autoplay)));
carouselTrack.addEventListener('mouseleave', ()=> autoplay = setInterval(()=> showSlide(currentSlide + 1), 5000));

// --- DENÚNCIA (modal) ---
reportBtn.addEventListener('click', ()=> {
  reportModal.setAttribute('aria-hidden','false');
});

cancelReport.addEventListener('click', ()=> {
  reportModal.setAttribute('aria-hidden','true');
});

sendReport.addEventListener('click', ()=> {
  const text = document.getElementById('reportText').value.trim();
  // Simular envio da denúncia
  console.log('Denúncia enviada:', text);
  alert('Denúncia enviada. Obrigado por reportar.');
  reportModal.setAttribute('aria-hidden','true');
  document.getElementById('reportText').value = '';
});

// --- APLICAR (salvar em localStorage) ---
const JOB_ID = 'job-001'; // id da vaga (poderia vir do backend)
const STORAGE_KEY = `applications:${JOB_ID}`;

function loadApplications(){
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveApplications(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function renderApplications(){
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

// escape simples para evitar HTML injection quando renderizar mensagem
function escapeHtml(str){
  if(!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// abrir painel de aplicações
applicationsCount.addEventListener('click', ()=>{
  const isVisible = applicationsPanel.style.display === 'block';
  applicationsPanel.style.display = isVisible ? 'none' : 'block';
  applicationsPanel.setAttribute('aria-hidden', isVisible ? 'true' : 'false');
});

// fechar painel
closeApps.addEventListener('click', ()=>{
  applicationsPanel.style.display = 'none';
  applicationsPanel.setAttribute('aria-hidden', 'true');
});

// aplicar
applyBtn.addEventListener('click', ()=>{
  const message = applyMessage.value.trim();
  if(message.length < 10){
    alert('Escreva pelo menos 10 caracteres na motivação para aplicar.');
    applyMessage.focus();
    return;
  }

  // opcional: pedir nome do candidato (simples prompt)
  const nome = prompt('Digite seu nome (opcional):');
  const applications = loadApplications();
  applications.unshift({
    name: nome ? nome.trim() : 'Anônimo',
    message,
    date: new Date().toISOString()
  });
  saveApplications(applications);
  renderApplications();

  // confirmação visual
  alert('Sua candidatura foi enviada com sucesso!');
  applyMessage.value = '';
});

// delegação para remover candidatura
applicationsList.addEventListener('click', (e)=>{
  if(e.target.matches('.remove-app')){
    const idx = Number(e.target.dataset.i);
    const arr = loadApplications();
    arr.splice(idx,1);
    saveApplications(arr);
    renderApplications();
  }
});

// --- TAGS INTERATIVAS: filtrar (apenas efeito visual aqui) ---
tagsEls.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const tag = btn.textContent.trim();
    if(tagFilterState.has(tag)){
      tagFilterState.delete(tag);
      btn.style.opacity = '1';
      btn.style.transform = 'none';
    } else {
      tagFilterState.add(tag);
      btn.style.opacity = '0.65';
      btn.style.transform = 'translateY(-3px)';
    }
    // Aqui você poderia aplicar filtro real no listagem. Apenas demonstrativo.
    console.log('Tags ativas:', Array.from(tagFilterState));
  });
});

// inicializar
renderApplications();
showSlide(0);

// pequeno hack: clicar no contador abre o painel
applicationsCount.style.cursor = 'pointer';
