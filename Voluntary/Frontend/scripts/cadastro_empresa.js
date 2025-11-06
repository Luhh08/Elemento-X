// === Máscaras ===
document.getElementById('cnpj').addEventListener('input', function(e) {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length > 14) value = value.slice(0, 14);
  value = value.replace(/^(\d{2})(\d)/, '$1.$2');
  value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
  value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
  value = value.replace(/(\d{4})(\d)/, '$1-$2');
  e.target.value = value;
});

function mascaraCPF(campo) {
  let valor = campo.value.replace(/\D/g, "");
  valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
  valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
  valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  campo.value = valor;
}

function mascaraTelefone(input) {
  let value = input.value.replace(/\D/g, '');
  if (value.length > 11) value = value.slice(0, 11);
  if (value.length > 10)
    value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  else if (value.length > 6)
    value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  else if (value.length > 2)
    value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  else value = value.replace(/^(\d*)/, '($1');
  input.value = value;
}

document.getElementById('telefone_empresa').addEventListener('input', e => mascaraTelefone(e.target));
document.getElementById('telefone_representante').addEventListener('input', e => mascaraTelefone(e.target));

document.getElementById('cep').addEventListener('input', function(e) {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length > 8) value = value.slice(0, 8);
  if (value.length > 5)
    value = value.replace(/^(\d{5})(\d{0,3})/, '$1-$2');
  e.target.value = value;
});

// === Controle de Etapas ===
const form1 = document.getElementById('form1');
const form2 = document.getElementById('form2');
const next1 = document.getElementById('next1');
const prev2 = document.getElementById('prev2');

next1.addEventListener('click', () => {
  form1.classList.remove('active');
  form2.classList.add('active');
});

prev2.addEventListener('click', () => {
  form2.classList.remove('active');
  form1.classList.add('active');
});

// === Validação de Senha ===
const senha = document.getElementById('senha');
const confirmar = document.getElementById('confirmarSenha');
const erro = document.getElementById('erroSenha');

form2.addEventListener('submit', function(e) {
  if (senha.value !== confirmar.value) {
    e.preventDefault();
    erro.style.display = 'block';
    confirmar.style.borderColor = 'red';
  } else {
    erro.style.display = 'none';
    confirmar.style.borderColor = 'green';
  }
});

confirmar.addEventListener('input', function() {
  if (confirmar.value !== senha.value) {
    confirmar.style.borderColor = 'red';
    erro.style.display = 'block';
  } else {
    confirmar.style.borderColor = 'green';
    erro.style.display = 'none';
  }
});

// === Envio do formulário final ===
const form = document.getElementById("form2");
const API_URL = "http://localhost:3000/api"; 

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // === Dados da empresa ===
  const razao_social = document.getElementById("razao_social").value.trim();
  const email = document.getElementById("email").value.trim();
  const cnpj = document.getElementById("cnpj").value.trim();
  const telefone_empresa = document.getElementById("telefone_empresa").value.trim();
  const cep = document.getElementById("cep").value.trim();
  const endereco = document.getElementById("endereco").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!razao_social || !email || !cnpj || !telefone_empresa || !cep || !endereco || !senha) {
    alert("Por favor, preencha todos os campos da empresa.");
    return;
  }

  const dadosEmpresa = {
    razao_social,
    email,
    cnpj,
    telefone_empresa,
    cep,
    endereco,
    senha
  };

  // === Dados do representante legal ===
  const nome = document.getElementById("nome").value.trim();
  const cpf = document.getElementById("cpf").value.trim();
  const cargo = document.getElementById("cargo").value.trim();
  const email_representante = document.getElementById("email_representante").value.trim();
  const telefone_representante = document.getElementById("telefone_representante").value.trim();

  if (!nome || !cpf || !cargo || !email_representante || !telefone_representante) {
    alert("Por favor, preencha todos os campos do representante legal.");
    return;
  }

  const dadosRepresentante = {
    nome,
    cpf,
    cargo,
    email_representante,
    telefone_representante
  };

  try {
    // ✅ Envia empresa + representante no mesmo POST
    const response = await fetch(`${API_URL}/empresas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresa: dadosEmpresa,
        representante: dadosRepresentante
      })
    });

    const resultado = await response.json();
    if (!response.ok) {
      alert("Erro ao cadastrar: " + (resultado.error || "Erro desconhecido"));
      return;
    }

    alert("Cadastro concluído com sucesso! Verifique seu e-mail.");
    form.reset();
    window.location.href = "login_empresa.html";
  } catch (err) {
    console.error("Erro na requisição:", err);
    alert("Erro ao conectar com o servidor. Verifique se ele está rodando.");
  }
});
