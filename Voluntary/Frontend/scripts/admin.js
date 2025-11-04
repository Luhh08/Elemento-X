document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".pill[data-section]");
  const sections = document.querySelectorAll(".table-section");
  const searchInput = document.getElementById("searchInput");
  const toast = document.getElementById("toast");
  const modal = document.getElementById("modalConfirm");
  const modalText = document.getElementById("modalText");
  const modalBtnConfirm = document.getElementById("confirmYes");
  const modalBtnCancel = document.getElementById("confirmNo");
    const dataDenuncias = [
  { id: 1, usuario: "João Mendes", motivo: "Conteúdo inadequado", data: "02/10/2025", status: "Pendente" },
  { id: 2, usuario: "Maria Lopes", motivo: "Spam em vaga", data: "05/10/2025", status: "Resolvido" }
];

    const dataFeedback = [
  { id: 1, vaga: "Mutirão Ambiental", usuario: "Ana Silva", comentario: "Excelente experiência!", data: "15/10/2025" },
  { id: 2, vaga: "Ação Comunitária", usuario: "Bruno Souza", comentario: "Boa organização.", data: "18/10/2025" }
];

  let currentSection = "usuarios";
  let currentActionRow = null;

  const dataUsuarios = [
    { id: 1, nome: "Ana Silva", email: "ana@gmail.com", cadastro: "01/10/2025", status: "Ativo" },
    { id: 2, nome: "Bruno Souza", email: "bruno@gmail.com", cadastro: "05/10/2025", status: "Pendente" },
    { id: 3, nome: "Carlos Lima", email: "carlos@gmail.com", cadastro: "08/10/2025", status: "Inativo" }
  ];

  const dataEmpresas = [
    { id: 1, nome: "EcoBrasil", email: "contato@ecobrasil.com", cadastro: "10/09/2025", vagas: 5, status: "Verificada" },
    { id: 2, nome: "VidaVerde ONG", email: "info@vidaverde.org", cadastro: "12/09/2025", vagas: 2, status: "Pendente" }
  ];

  const dataVagas = [
    { id: 1, titulo: "Mutirão Ambiental", empresa: "EcoBrasil", postagem: "15/09/2025", candidaturas: 12, status: "Aberta" },
    { id: 2, titulo: "Ação Comunitária", empresa: "VidaVerde ONG", postagem: "20/09/2025", candidaturas: 5, status: "Fechada" }
  ];

  function renderTable(section, search = "") {
    const tableBody = document.getElementById(`${section}TableBody`);
    tableBody.innerHTML = "";


    let data = [];
    if (section === "usuarios") data = dataUsuarios;
    if (section === "empresas") data = dataEmpresas;
    if (section === "vagas") data = dataVagas;
    if (section === "denuncias") data = dataDenuncias;
    if (section === "feedback") data = dataFeedback;

    data
      .filter(item => {
        if (search) {
          return Object.values(item).some(val =>
            String(val).toLowerCase().includes(search.toLowerCase())
          );
        }
        return true;
      })
      .forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = generateRowHTML(section, item);
        tableBody.appendChild(row);
      });
  }

  function generateRowHTML(section, item) {
    const statusClass = getStatusClass(item.status);
    let html = `<td><input type="checkbox"></td>`;
    

    if (section === "usuarios") {
      html += `
        <td>${item.id}</td>
        <td>${item.nome}</td>
        <td>${item.email}</td>
        <td>${item.cadastro}</td>
        <td><span class="status-badge ${statusClass}">${item.status}</span></td>
      `;
    } else if (section === "empresas") {
      html += `
        <td>${item.id}</td>
        <td>${item.nome}</td>
        <td>${item.email}</td>
        <td>${item.cadastro}</td>
        <td>${item.vagas}</td>
        <td><span class="status-badge ${statusClass}">${item.status}</span></td>
      `;
    } else if (section === "vagas") {
      html += `
        <td>${item.id}</td>
        <td>${item.titulo}</td>
        <td>${item.empresa}</td>
        <td>${item.postagem}</td>
        <td>${item.candidaturas}</td>
        <td><span class="status-badge ${statusClass}">${item.status}</span></td>
      `;
    }
    else if (section === "denuncias") {
  html += `
    <td>${item.id}</td>
    <td>${item.usuario}</td>
    <td>${item.motivo}</td>
    <td>${item.data}</td>
    <td><span class="status-badge ${getStatusClass(item.status)}">${item.status}</span></td>
  `;
} else if (section === "feedback") {
  html += `
    <td>${item.id}</td>
    <td>${item.vaga}</td>
    <td>${item.usuario}</td>
    <td>${item.comentario}</td>
    <td>${item.data}</td>
  `;
}

    html += `
      <td>
        <button class="action-btn action-green" data-action="aprovar">Aprovar</button>
        <button class="action-btn action-red" data-action="excluir">Excluir</button>
      </td>
    `;
    return html;
  }

  function getStatusClass(status) {
    const s = status.toLowerCase();
    if (s.includes("ativo") || s.includes("verificada") || s.includes("aberta")) return "status-ativo";
    if (s.includes("inativo") || s.includes("fechada")) return "status-inativo";
    if (s.includes("pendente")) return "status-pendente";
    if (s.includes("rejeitada")) return "status-rejeitada";
    if (s.includes ("resolvido")) return "status-resolvido";
    return "";
  }

  function showSection(sectionId) {
  const activeSection = document.querySelector(".table-section.active");
  const newSection = document.getElementById(sectionId);

  if (activeSection === newSection) return;

  if (activeSection) {
    activeSection.classList.remove("active");
    activeSection.classList.add("fade-out");

    setTimeout(() => {
      activeSection.classList.remove("fade-out");
      activeSection.style.display = "none";

      newSection.style.display = "block";
      requestAnimationFrame(() => newSection.classList.add("active"));
    }, 400); 
  } else {
    newSection.style.display = "block";
    requestAnimationFrame(() => newSection.classList.add("active"));
  }
}



  tabs.forEach(tab => {
    tab.addEventListener("click", e => {
      e.preventDefault();
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.dataset.section;
      currentSection = target;
      showSection(target);
      renderTable(target, searchInput.value);

      const sectionTitle = document.getElementById("sectionTitle");
      sectionTitle.textContent =
    target === "usuarios" ? "Gerenciamento de Usuários" :
    target === "empresas" ? "Gerenciamento de Empresas" :
    target === "vagas" ? "Gerenciamento de Vagas" :
    target === "denuncias" ? "Gerenciamento de Denúncias" :
    "Feedback de Vagas";
    });
  });

  searchInput.addEventListener("input", () => {
    renderTable(currentSection, searchInput.value);
  });

  document.addEventListener("click", e => {
    if (e.target.matches(".action-btn")) {
      const action = e.target.dataset.action;
      currentActionRow = e.target.closest("tr");

      if (action === "excluir") {
        modalText.textContent = "Tem certeza que deseja excluir este item?";
        modal.setAttribute("aria-hidden", "false");
      } else if (action === "aprovar") {
        showToast("Item aprovado com sucesso!");
      }
    }
  });

  modalBtnConfirm.addEventListener("click", () => {
    if (currentActionRow) {
      currentActionRow.remove();
      showToast("Item excluído com sucesso!");
    }
    modal.setAttribute("aria-hidden", "true");
  });

  modalBtnCancel.addEventListener("click", () => {
    modal.setAttribute("aria-hidden", "true");
  });

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
  }

  showSection(currentSection);
  renderTable(currentSection);
});
