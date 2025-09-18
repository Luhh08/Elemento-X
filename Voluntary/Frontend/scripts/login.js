// scripts/login.js

const formLogin = document.querySelector(".login-form");

formLogin.addEventListener("submit", async (e) => {
    e.preventDefault(); // Evita recarregar a página

    const email = document.getElementById("email").value; // pega o email
    const senha = document.getElementById("senha").value;

    try {
        const response = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha }) // envia email e senha
        });

        const data = await response.json();

        if (response.ok) {
            // Login bem-sucedido
            alert(data.message); // Mostra "Login realizado com sucesso!"
            
            // Redireciona para a página do dashboard
            window.location.href = "dashboard.html";
        } else {
            // Exibe erros de autenticação
            alert(data.error);
        }
    } catch (err) {
        console.error("Erro na requisição:", err);
        alert("Erro ao conectar com o servidor.");
    }
});
