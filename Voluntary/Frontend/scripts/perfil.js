// ----------- Seletores rápidos -----------
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ----------- Tokens e identificação -----------
const token = localStorage.getItem("token");
const loggedUserId = localStorage.getItem("userId");

// ✅ Se não houver ?id= na URL, adiciona automaticamente o ID do usuário logado
const params = new URLSearchParams(window.location.search);
let perfilId = params.get("id");

if (!perfilId && loggedUserId) {
  perfilId = loggedUserId;
  const novaUrl = `${window.location.pathname}?id=${perfilId}`;
  window.history.replaceState({}, "", novaUrl);
}

// ----------- POPUPS -----------
const popupEdicao = $("#popupEdicao");
const popupDenuncia = $("#popupDenuncia");
const popupDenunciaOk = $("#popupDenunciaOk");

$("#btnEditar")?.addEventListener("click", () =>
  popupEdicao.setAttribute("aria-hidden", "false")
);
$("#btnDenunciar")?.addEventListener("click", () =>
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
  if (!token || !perfilId) return;

  try {
    const res = await fetch(`/api/usuario/${perfilId}`, {
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

    // Preenche popup de edição (somente se for o dono do perfil)
    if (perfilId === loggedUserId) {
      $("#editNome").value = data.nome || "";
      $("#editUsuario").value = data.usuario || "";
      $("#editDescricao").value = data.descricao || "";
      $("#editEmailContato").value = data.emailcontato || "";
      $("#editTelefoneContato").value = data.telefonecontato || "";
      $("#editCompetencias").value = (data.competencias || []).join(", ");
    }

    // Marcar disponibilidade
    if (data.preferenciaHorario) {
      const radio = document.querySelector(
        `input[name="disp"][value="${data.preferenciaHorario}"]`
      );
      if (radio) radio.checked = true;
    }

    // Barra de progresso
    atualizarBarraProgresso(data.progresso);

    // Mostrar ou esconder botões conforme o perfil
    if (perfilId === loggedUserId) {
      $("#btnEditar")?.classList.remove("hidden");
      $("#btnDenunciar")?.classList.add("hidden");
    } else {
      $("#btnEditar")?.classList.add("hidden");
      $("#btnDenunciar")?.classList.remove("hidden");
    }
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
$("#formEdicao")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!token || !loggedUserId) return;

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
    const resp = await fetch(`/api/usuario/${loggedUserId}`, {
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
      const resp = await fetch(`/api/usuario/${loggedUserId}/upload/${tipo}`, {
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

$("#btnNovaFoto")?.addEventListener("click", () => uploadImagem("foto"));
$("#btnNovoBanner")?.addEventListener("click", () => uploadImagem("banner"));

// ----------- Denúncia visual -----------
$("#formDenuncia")?.addEventListener("submit", (e) => {
  e.preventDefault();
  popupDenuncia.setAttribute("aria-hidden", "true");
  popupDenunciaOk.setAttribute("aria-hidden", "false");
});

// ✅ ----------- Botão de sair -----------
document.querySelector(".pill-logout")?.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  window.location.href = "../login.html";
});

// ----------- Inicialização -----------
document.addEventListener("DOMContentLoaded", carregarPerfil);
