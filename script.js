/* =========================================================
   ELEMENTOS DA INTERFACE
========================================================= */
const campoPergunta = document.getElementById("campo-pergunta");
const botaoEnviar = document.getElementById("botao-enviar");
const botaoReiniciar = document.getElementById("botao-reiniciar");
const categorias = document.querySelectorAll(".categoria");
const telaInicial = document.getElementById("tela-inicial");
const areaConversa = document.getElementById("area-conversa");
const historicoConversa = document.getElementById("historico-conversa");
/* =========================================================
   CONFIGURAÇÃO AZURE OPENAI
========================================================= */
const AZURE_ENDPOINT = "https://seila.openai.azure.com/openai/v1/chat/completions";
const AZURE_API_KEY = " ";
const MODELO = "gpt-4.1-mini";
/* =========================================================
   ESTADO DA APLICAÇÃO
========================================================= */
let conversaIniciada = false;
/* =========================================================
   INSTRUÇÃO DO SISTEMA
========================================================= */

const instrucaoSistema = {
    role: "system",
    content: `Você é o APEX, um assistente especializado exclusivamente em astronomia, astrofísica, cosmologia, exploração espacial e ciências diretamente relacionadas ao espaço.
Você pode responder perguntas sobre Sistema Solar, planetas, luas, estrelas, galáxias, buracos negros, nebulosas, asteroides, cometas, cosmologia, Universo, exploração espacial, missões espaciais, telescópios, astronáutica, física relacionada ao espaço e vida extraterrestre sob perspectiva científica.
REGRAS IMPORTANTES:
1. Responda somente perguntas relacionadas à astronomia, espaço ou áreas científicas diretamente relacionadas.
2. Se o usuário fizer uma pergunta fora desse tema, não responda ao conteúdo da pergunta.
3. Para perguntas fora do escopo, responda somente: "Esse assunto está fora da minha área de exploração. Sou o APEX e posso ajudar com perguntas sobre astronomia, espaço e o Universo. 🚀"
4. Não tente adaptar perguntas completamente fora do tema para conseguir respondê-las.
5. Se uma pergunta tiver relação parcial com astronomia, responda apenas a parte relacionada ao espaço.
6. Responda sempre em português do Brasil.
7. Explique os assuntos de maneira clara, didática, objetiva e tecnicamente correta.
8. Nunca utilize LaTeX, MathJax, Markdown matemático ou comandos como \\frac, \\sqrt, \\Delta, \\gamma, \\times, \\(, \\), \\[ ou \\].
9. Escreva fórmulas matemáticas utilizando texto simples e símbolos Unicode.
10. Utilize símbolos matemáticos naturais como ×, ÷, √, ≈, ≤, ≥, ±, Δ, γ, π, θ e ∞.
11. Utilize caracteres sobrescritos quando possível, como x², x³, m², m³ e s⁻¹.
12. As fórmulas devem ser legíveis diretamente como texto comum no navegador.
13. Exemplo correto: γ = 1 / √(1 - v²/c²)
14. Exemplo incorreto: \\gamma = \\frac{1}{\\sqrt{1 - \\frac{v^2}{c^2}}}`
};
/* =========================================================
   HISTÓRICO DA IA
========================================================= */
let historicoIA = [{ ...instrucaoSistema }];
/* =========================================================
   INICIAR CONVERSA
========================================================= */
function iniciarConversa() {
    if (conversaIniciada) return;
    conversaIniciada = true;
    telaInicial.classList.add("oculta");
    areaConversa.classList.add("ativa");
    requestAnimationFrame(function () {
        rolarParaFinal();
    });
}
/* =========================================================
   CRIAR MENSAGEM DO USUÁRIO
========================================================= */
function adicionarMensagemUsuario(texto) {
    const mensagem = document.createElement("div");
    mensagem.classList.add("mensagem", "mensagem-usuario");
    mensagem.textContent = texto;
    historicoConversa.appendChild(mensagem);
    rolarParaFinal();
}
/* =========================================================
   CRIAR MENSAGEM DO APEX
========================================================= */
function adicionarMensagemApex(texto) {
    const mensagem = document.createElement("div");
    mensagem.classList.add("mensagem", "mensagem-apex");
    const nome = document.createElement("span");
    nome.classList.add("nome-apex");
    nome.textContent = "APEX";
    mensagem.appendChild(nome);
    const resposta = document.createElement("span");
    resposta.classList.add("texto-resposta-apex");
    resposta.textContent = texto;
    mensagem.appendChild(resposta);
    historicoConversa.appendChild(mensagem);
    rolarParaFinal();
}
/* =========================================================
   SCROLL AUTOMÁTICO
========================================================= */
function rolarParaFinal() {
    requestAnimationFrame(function () {
        historicoConversa.scrollTop = historicoConversa.scrollHeight;
    });
}
/* =========================================================
   CONSULTAR AZURE OPENAI
========================================================= */
async function consultarAzure(pergunta) {
    historicoIA.push({
        role: "user",
        content: pergunta
    });
    try {
        const resposta = await fetch(AZURE_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": AZURE_API_KEY
            },
            body: JSON.stringify({
                model: MODELO,
                messages: historicoIA,
                max_completion_tokens: 2000,
                temperature: 0.7,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0
            })
        });
        if (!resposta.ok) {
            const erroTexto = await resposta.text();
            console.error("Erro Azure:", resposta.status, erroTexto);
            throw new Error("Erro HTTP " + resposta.status);
        }
        const dados = await resposta.json();
        const textoResposta = dados.choices?.[0]?.message?.content;
        if (!textoResposta) {
            console.error("Resposta inesperada:", dados);
            throw new Error("A Azure não retornou uma resposta válida.");
        }
        historicoIA.push({
            role: "assistant",
            content: textoResposta
        });
        return textoResposta;
    } catch (erro) {
        if (
            historicoIA.length > 1 &&
            historicoIA[historicoIA.length - 1].role === "user"
        ) {
            historicoIA.pop();
        }
        throw erro;
    }
}
/* =========================================================
   ENVIAR PERGUNTA
========================================================= */
async function enviarPergunta() {
    const pergunta = campoPergunta.value.trim();
    if (pergunta === "") {
        campoPergunta.focus();
        return;
    }
    if (botaoEnviar.disabled) return;
    iniciarConversa();
    adicionarMensagemUsuario(pergunta);
    campoPergunta.value = "";
    botaoEnviar.disabled = true;
    campoPergunta.disabled = true;
    try {
        const resposta = await consultarAzure(pergunta);
        adicionarMensagemApex(resposta);
    } catch (erro) {
        console.error("Erro ao consultar APEX:", erro);
        adicionarMensagemApex(
            "Não consegui me conectar ao serviço de inteligência artificial. Verifique a configuração do Azure e tente novamente."
        );
    } finally {
        botaoEnviar.disabled = false;
        campoPergunta.disabled = false;
        campoPergunta.focus();
    }
}
/* =========================================================
   BOTÃO FOGUETE
========================================================= */
botaoEnviar.addEventListener("click", function () {
    enviarPergunta();
});
/* =========================================================
   ENTER
========================================================= */
campoPergunta.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        enviarPergunta();
    }
});
/* =========================================================
   CATEGORIAS
========================================================= */
categorias.forEach(function (categoria) {
    categoria.addEventListener("click", function () {
        const textoCategoria = categoria
            .querySelector(".texto-categoria")
            .textContent
            .trim();
        campoPergunta.value = "Quero saber mais sobre " + textoCategoria;
        campoPergunta.focus();
    });
});
/* =========================================================
   REINICIAR HISTÓRICO DA IA
========================================================= */
function reiniciarHistoricoIA() {
    historicoIA = [{ ...instrucaoSistema }];
}
/* =========================================================
   REINICIAR CONVERSA
========================================================= */
function reiniciarConversa() {
    historicoConversa.innerHTML = "";
    historicoConversa.scrollTop = 0;
    reiniciarHistoricoIA();
    conversaIniciada = false;
    areaConversa.classList.remove("ativa");
    telaInicial.classList.remove("oculta");
    campoPergunta.value = "";
    campoPergunta.disabled = false;
    botaoEnviar.disabled = false;
    requestAnimationFrame(function () {
        campoPergunta.focus();
    });
}
/* =========================================================
   BOTÃO REINICIAR
========================================================= */
botaoReiniciar.addEventListener("click", function () {
    reiniciarConversa();
})

