// ----------- Seletores rápidos -----------
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ----------- Tokens de sessão -----------
const token = localStorage.getItem("token");
const userId = localStorage.getItem("userId");

// ----------- POPUPS -----------
const popupEdicao = $("#popupEdicao");
const popupDenuncia = $("#popupDenuncia");
const popupDenunciaOk = $("#popupDenunciaOk");

$("#btnEditar").addEventListener("click", () =>
  popupEdicao.setAttribute("aria-hidden", "false")
);
$("#btnDenunciar").addEventListener("click", () =>
  popupDenuncia.setAttribute("aria-hidden", "false")
);

$$("[data-close]").forEach((btn) =>
  btn.addEventListener("click", () => {
    [popupEdicao, popupDenuncia, popupDenunciaOk].forEach((p) =>
      p.setAttribute("aria-hidden", "true")
    );
  })
);

// ----------- Caminhos padrão de imagem -----------
const defaultFoto = "../img/default-avatar.jpg";
const defaultBanner = "../img/default-banner.png";

// ----------- Função principal: carregar perfil -----------
async function carregarPerfil() {
  if (!token || !userId) return;

  try {
    const res = await fetch(`/api/usuario/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Erro ao carregar perfil.");

    const data = await res.json();

    // Header
    $("#nomeUsuario").textContent = data.nome || "";
    $("#usuarioTag").textContent = data.usuario ? `@${data.usuario}` : "";
    $("#descricaoUsuario").textContent =
      data.descricao || "Este usuário ainda não adicionou uma descrição.";

    // Imagens
    $("#bannerUsuario").src = data.bannerUrl || defaultBanner;
    $("#fotoUsuario").src = data.fotoUrl || defaultFoto;
    $("#bannerPreview").src = data.bannerUrl || defaultBanner;
    $("#fotoPreview").src = data.fotoUrl || defaultFoto;

    // Competências
    const tagsEl = $("#listaCompetencias");
    tagsEl.innerHTML = "";
    (data.competencias || []).forEach((t) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = t;
      tagsEl.appendChild(span);
    });

    // Disponibilidade e contatos
    $("#turnoUsuario").textContent = data.preferenciaHorario || "—";
    $("#emailContato").textContent = data.emailcontato || "—";
    $("#telefoneContato").textContent = data.telefonecontato || "—";

    // Preencher popup de edição
    $("#editNome").value = data.nome || "";
    $("#editUsuario").value = data.usuario || "";
    $("#editDescricao").value = data.descricao || "";
    $("#editEmailContato").value = data.emailcontato || "";
    $("#editTelefoneContato").value = data.telefonecontato || "";
    $("#editCompetencias").value = (data.competencias || []).join(", ");

    // Marcar disponibilidade
    if (data.preferenciaHorario) {
      const radio = document.querySelector(
        `input[name="disp"][value="${data.preferenciaHorario}"]`
      );
      if (radio) radio.checked = true;
    }

    atualizarBarraProgresso(data.progresso);
  } catch (err) {
    console.error("Erro ao carregar perfil:", err);
  }
}

// ----------- Atualizar barra de progresso -----------
function atualizarBarraProgresso(valor) {
  const p = Math.max(0, Math.min(100, Number(valor || 0)));
  $("#barraProgresso").style.width = `${p}%`;
  $("#labelProgresso").textContent = `${p}% completo`;
}

// ----------- Salvar edição -----------
$("#formEdicao").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!token || !userId) return;

  const dispSel = document.querySelector('input[name="disp"]:checked');
  const preferenciaHorario = dispSel ? dispSel.value : "";

  const body = {
    nome: $("#editNome").value,
    usuario: $("#editUsuario").value,
    descricao: $("#editDescricao").value,
    competencias: $("#editCompetencias").value,
    preferenciaHorario,
    emailcontato: $("#editEmailContato").value,
    telefonecontato: $("#editTelefoneContato").value,
  };

  try {
    const resp = await fetch(`/api/usuario/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const result = await resp.json();

    if (!resp.ok) throw new Error(result.error || "Erro ao atualizar perfil.");

    popupEdicao.setAttribute("aria-hidden", "true");
    await carregarPerfil();
    alert("✅ Perfil atualizado com sucesso!");
  } catch (err) {
    console.error("Erro ao salvar perfil:", err);
    alert("❌ Erro ao salvar as alterações.");
  }
});

// ----------- Upload de imagem local (foto e banner) -----------
async function uploadImagem(tipo) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const formData = new FormData();
    formData.append("imagem", arquivo);

    try {
      const resp = await fetch(`/api/usuario/${userId}/upload/${tipo}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro no upload.");

      if (tipo === "foto") {
        $("#fotoUsuario").src = data.usuario.fotoUrl;
        $("#fotoPreview").src = data.usuario.fotoUrl;
      } else {
        $("#bannerUsuario").src = data.usuario.bannerUrl;
        $("#bannerPreview").src = data.usuario.bannerUrl;
      }

      alert("🖼️ Imagem enviada com sucesso!");
    } catch (err) {
      console.error("Erro ao enviar imagem:", err);
      alert("❌ Falha no envio da imagem.");
    }
  };
  input.click();
}

// Botões no popup
$("#btnNovaFoto").addEventListener("click", () => uploadImagem("foto"));
$("#btnNovoBanner").addEventListener("click", () => uploadImagem("banner"));

// ----------- Denúncia visual -----------
$("#formDenuncia").addEventListener("submit", (e) => {
  e.preventDefault();
  popupDenuncia.setAttribute("aria-hidden", "true");
  popupDenunciaOk.setAttribute("aria-hidden", "false");
});

// ----------- Inicialização -----------
document.addEventListener("DOMContentLoaded", carregarPerfil);
