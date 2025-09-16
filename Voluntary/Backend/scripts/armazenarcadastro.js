const btn = document.querySelector("#submitBtn");

btn.addEventListener("click", function(event) {
    event.preventDefault()

    const nome = document.querySelector("#nome").value
    const usuario = document.querySelector("#usuario").value
    const email = document.querySelector("#email").value
    const cpf = document.querySelector("#cpf").value
    const senha = document.querySelector("#senha").value

    console.table([nome,usuario,email,cpf,senha])

    Headers.innerHTML = "Cadastro de " + nome + " " + usuario
})