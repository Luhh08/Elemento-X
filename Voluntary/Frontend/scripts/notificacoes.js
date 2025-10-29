document.addEventListener("DOMContentLoaded", () => {
  const notifBtn = document.getElementById("notifBtn");
  const notifPanel = document.getElementById("notifPanel");

  if (!notifBtn || !notifPanel) {
    console.warn("⚠️ Elementos de notificação não encontrados no DOM.");
    return;
  }

  notifBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    notifPanel.classList.toggle("active");
  });

  // Fecha o painel ao clicar fora
  document.addEventListener("click", (e) => {
    if (!notifPanel.contains(e.target) && !notifBtn.contains(e.target)) {
      notifPanel.classList.remove("active");
    }
  });
});
document.getElementById('notificationIcon').addEventListener('click', () => {
    document.getElementById('notifPanel').classList.toggle('active');
});
// Seleciona todos os wrappers de notificação
document.querySelectorAll('.notification-wrapper').forEach(wrapper => {
  const panel = wrapper.querySelector('.notif-panel');

  wrapper.addEventListener('click', (e) => {
    // Toggle da classe active
    panel.classList.toggle('active');
    e.stopPropagation(); // evita fechar imediatamente ao clicar dentro do painel
  });
});

// Fecha o painel ao clicar fora
window.addEventListener('click', (e) => {
  document.querySelectorAll('.notif-panel.active').forEach(panel => {
    if (!panel.contains(e.target)) {
      panel.classList.remove('active');
    }
  });
});
