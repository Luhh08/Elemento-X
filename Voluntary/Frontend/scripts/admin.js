document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".pill[data-section]");
  const sections = document.querySelectorAll(".table-section");
  const searchInput = document.getElementById("searchInput");
  const toast = document.getElementById("toast");
  const modal = document.getElementById("modalConfirm");
  const modalText = document.getElementById("modalText");
  const modalBtnConfirm = document.getElementById("confirmYes");
  const modalBtnCancel = document.getElementById("confirmNo");

  let currentSection = "usuarios";
  let currentActionRow = null;

  // Dados simulados
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

  // Renderiza tabela conforme seção
  function renderTable(section, search = "") {
    const tableBody = document.getElementById(`${section}TableBody`);
    tableBody.innerHTML = "";

    let data = [];
    if (section === "usuarios") data = dataUsuarios;
    if (section === "empresas") data = dataEmpresas;
    if (section === "vagas") data = dataVagas;

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

  // Gera HTML da linha
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

    html += `
      <td>
        <button class="action-btn action-green" data-action="aprovar">Aprovar</button>
        <button class="action-btn action-red" data-action="excluir">Excluir</button>
      </td>
    `;
    return html;
  }

  // Define classe de status
  function getStatusClass(status) {
    const s = status.toLowerCase();
    if (s.includes("ativo") || s.includes("verificada") || s.includes("aberta")) return "status-ativo";
    if (s.includes("inativo") || s.includes("fechada")) return "status-inativo";
    if (s.includes("pendente")) return "status-pendente";
    if (s.includes("rejeitada")) return "status-rejeitada";
    return "";
  }

  // Alterna visibilidade das seções
  function showSection(sectionId) {
    sections.forEach(sec => sec.classList.remove("active"));
    document.getElementById(sectionId).classList.add("active");
  }

  // Troca de abas
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
        target === "usuarios"
          ? "Gerenciamento de Usuários"
          : target === "empresas"
          ? "Gerenciamento de Empresas"
          : "Gerenciamento de Vagas";
    });
  });

  // Busca em tempo real
  searchInput.addEventListener("input", () => {
    renderTable(currentSection, searchInput.value);
  });

  // Ações dos botões
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

  // Inicia mostrando apenas "Usuários"
  showSection(currentSection);
  renderTable(currentSection);
});
