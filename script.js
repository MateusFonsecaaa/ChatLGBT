/* =========================================================
   ELEMENTOS DA INTERFACE
========================================================= */
const campoPergunta = document.getElementById("campo-pergunta");
const botaoEnviar = document.getElementById("botao-enviar");
const botaoMicrofone = document.getElementById("botao-microfone");
const botaoReiniciar = document.getElementById("botao-reiniciar");
const categorias = document.querySelectorAll(".categoria");
const telaInicial = document.getElementById("tela-inicial");
const areaConversa = document.getElementById("area-conversa");
const historicoConversa = document.getElementById("historico-conversa");

/* =========================================================
   CONFIGURAÇÃO AZURE OPENAI
========================================================= */
const AZURE_ENDPOINT = "https://seila.openai.azure.com/openai/v1/chat/completions";
const AZURE_API_KEY = "";
const MODELO = "gpt-4.1-mini";

/* =========================================================
   ESTADO DA APLICAÇÃO
========================================================= */
let conversaIniciada = false;
let microfoneAtivo = false;
let reconhecimento = null;
let palavraAtivacaoDetectada = false;
let textoDepoisDaAtivacao = "";
let temporizadorSilencio = null;
let enviandoPerguntaVoz = false;

/* =========================================================
   CONFIGURAÇÃO DA VOZ
========================================================= */
const TEMPO_SILENCIO = 1500;

/* =========================================================
   INSTRUÇÃO DO SISTEMA
========================================================= */
const instrucaoSistema = {
    role: "system",
    content: `Você é o APEX, um assistente especializado em astronomia, astrofísica, cosmologia, exploração espacial e ciências relacionadas ao espaço.
Sua personalidade deve ser amigável, natural, curiosa e conversacional.
Você pode conversar normalmente com o usuário, responder cumprimentos, despedidas, agradecimentos, perguntas sobre como você está, perguntas sobre quem você é e pequenas interações sociais.
EXEMPLOS DE CONVERSAS PERMITIDAS:
Usuário: "Oi"
APEX: "Olá! 🚀 Como posso ajudar você hoje?"
Usuário: "Oi, tudo bem?"
APEX: "Tudo certo por aqui! 🚀 E com você? O que vamos explorar hoje?"
Usuário: "Eai Chat"
APEX: "E aí! 🚀 Estou pronto. O que você quer explorar?"
Usuário: "Obrigado"
APEX: "Por nada! 🚀 Sempre que quiser explorar o Universo, estou por aqui."
Usuário: "Quem é você?"
APEX: "Eu sou o APEX, seu assistente para explorar astronomia, espaço e o Universo. 🚀"
REGRAS IMPORTANTES:
1. Cumprimentos, despedidas, agradecimentos e conversas sociais simples são sempre permitidos.
2. Perguntas sobre o próprio APEX também são permitidas.
3. Não rejeite mensagens apenas porque não possuem imediatamente uma pergunta sobre astronomia.
4. Sempre que possível, mantenha uma conversa natural antes de direcionar o usuário novamente para assuntos relacionados ao espaço.
5. Seu principal campo de conhecimento continua sendo astronomia, astrofísica, cosmologia, exploração espacial e ciências relacionadas.
6. Você pode responder perguntas sobre Sistema Solar, planetas, luas, estrelas, galáxias, buracos negros, nebulosas, asteroides, cometas, cosmologia, Universo, exploração espacial, missões espaciais, telescópios, astronáutica, física relacionada ao espaço e vida extraterrestre sob perspectiva científica.
7. Caso o usuário faça uma solicitação claramente extensa e completamente fora da sua especialidade, como pedir uma receita culinária, resolver assuntos jurídicos ou escrever conteúdo sobre temas totalmente não relacionados, explique educadamente que sua especialidade é astronomia e espaço.
8. Não use a mensagem de recusa para simples cumprimentos ou conversas casuais.
9. Para assuntos realmente fora da especialidade, responda de maneira natural, por exemplo:
"Esse assunto foge um pouco da minha área de exploração. 🚀 Minha especialidade é astronomia, espaço e o Universo. Se quiser, podemos explorar algo relacionado!"
10. Nunca seja excessivamente rígido ou robótico.
11. Responda sempre em português do Brasil.
12. Explique assuntos científicos de maneira clara, didática, objetiva e tecnicamente correta.
13. Nunca utilize LaTeX, MathJax, Markdown matemático ou comandos como \\frac, \\sqrt, \\Delta, \\gamma, \\times, \\(, \\), \\[ ou \\].
14. Escreva fórmulas matemáticas utilizando texto simples e símbolos Unicode.
15. Utilize símbolos matemáticos naturais como ×, ÷, √, ≈, ≤, ≥, ±, Δ, γ, π, θ e ∞.
16. Utilize caracteres sobrescritos quando possível, como x², x³, m², m³ e s⁻¹.
17. As fórmulas devem ser legíveis diretamente como texto comum no navegador.
18. Exemplo correto: γ = 1 / √(1 - v²/c²)
19. Exemplo incorreto: \\gamma = \\frac{1}{\\sqrt{1 - \\frac{v^2}{c^2}}}`
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

    mensagem.classList.add(
        "mensagem",
        "mensagem-usuario"
    );

    mensagem.textContent = texto;

    historicoConversa.appendChild(mensagem);

    rolarParaFinal();
}

/* =========================================================
   CRIAR MENSAGEM DO APEX
========================================================= */
function adicionarMensagemApex(texto) {
    const mensagem = document.createElement("div");

    mensagem.classList.add(
        "mensagem",
        "mensagem-apex"
    );

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
        historicoConversa.scrollTop =
            historicoConversa.scrollHeight;
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

            console.error(
                "Erro Azure:",
                resposta.status,
                erroTexto
            );

            throw new Error(
                "Erro HTTP " + resposta.status
            );
        }

        const dados = await resposta.json();

        const textoResposta =
            dados.choices?.[0]?.message?.content;

        if (!textoResposta) {
            console.error(
                "Resposta inesperada:",
                dados
            );

            throw new Error(
                "A Azure não retornou uma resposta válida."
            );
        }

        historicoIA.push({
            role: "assistant",
            content: textoResposta
        });

        return textoResposta;

    } catch (erro) {

        if (
            historicoIA.length > 1 &&
            historicoIA[
                historicoIA.length - 1
            ].role === "user"
        ) {
            historicoIA.pop();
        }

        throw erro;
    }
}

/* =========================================================
   ENVIAR PERGUNTA PELO INPUT
========================================================= */
async function enviarPergunta() {
    const pergunta =
        campoPergunta.value.trim();

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
        const resposta =
            await consultarAzure(pergunta);

        adicionarMensagemApex(resposta);

    } catch (erro) {

        console.error(
            "Erro ao consultar APEX:",
            erro
        );

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
   ENVIAR PERGUNTA POR VOZ
========================================================= */
async function enviarPerguntaPorVoz(texto) {

    const pergunta = texto.trim();

    if (pergunta === "") {
        return;
    }

    if (enviandoPerguntaVoz) {
        return;
    }

    enviandoPerguntaVoz = true;

    iniciarConversa();

    adicionarMensagemUsuario(pergunta);

    palavraAtivacaoDetectada = false;
    textoDepoisDaAtivacao = "";

    try {

        const resposta =
            await consultarAzure(pergunta);

        adicionarMensagemApex(resposta);

    } catch (erro) {

        console.error(
            "Erro ao consultar APEX:",
            erro
        );

        adicionarMensagemApex(
            "Não consegui me conectar ao serviço de inteligência artificial. Verifique a configuração do Azure e tente novamente."
        );

    } finally {

        enviandoPerguntaVoz = false;

        reiniciarReconhecimento();
    }
}

/* =========================================================
   BOTÃO FOGUETE
========================================================= */
botaoEnviar.addEventListener(
    "click",
    function () {
        enviarPergunta();
    }
);

/* =========================================================
   ENTER
========================================================= */
campoPergunta.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {
            event.preventDefault();

            enviarPergunta();
        }
    }
);

/* =========================================================
   NORMALIZAR TEXTO PARA DETECTAR "EAI CHAT"
========================================================= */
function normalizarTexto(texto) {

    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[.,!?;:]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/* =========================================================
   LOCALIZAR PALAVRA DE ATIVAÇÃO
========================================================= */
function localizarPalavraAtivacao(texto) {

    const textoNormalizado =
        normalizarTexto(texto);

    const variacoes = [
        "eai chat",
        "e ai chat",
        "ei chat"
    ];

    for (const variacao of variacoes) {

        const posicao =
            textoNormalizado.indexOf(variacao);

        if (posicao !== -1) {

            return {
                encontrada: true,
                variacao: variacao,
                posicao: posicao,
                textoNormalizado: textoNormalizado
            };
        }
    }

    return {
        encontrada: false
    };
}

/* =========================================================
   PROGRAMAR ENVIO APÓS SILÊNCIO
========================================================= */
function programarEnvioPorSilencio() {

    clearTimeout(
        temporizadorSilencio
    );

    if (
        !palavraAtivacaoDetectada ||
        textoDepoisDaAtivacao.trim() === ""
    ) {
        return;
    }

    temporizadorSilencio =
        setTimeout(function () {

            const pergunta =
                textoDepoisDaAtivacao.trim();

            if (pergunta === "") {
                return;
            }

            textoDepoisDaAtivacao = "";

            enviarPerguntaPorVoz(
                pergunta
            );

        }, TEMPO_SILENCIO);
}

/* =========================================================
   CONFIGURAR RECONHECIMENTO DE VOZ
========================================================= */
function configurarReconhecimento() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        console.error(
            "Reconhecimento de voz não suportado."
        );

        return false;
    }

    reconhecimento =
        new SpeechRecognition();

    reconhecimento.lang =
        "pt-BR";

    reconhecimento.continuous =
        true;

    reconhecimento.interimResults =
        true;

    reconhecimento.maxAlternatives =
        1;

    reconhecimento.onresult =
        function (event) {

            let textoCompleto = "";

            for (
                let i = 0;
                i < event.results.length;
                i++
            ) {

                textoCompleto +=
                    event.results[i][0]
                        .transcript +
                    " ";
            }

            textoCompleto =
                textoCompleto.trim();

            console.log(
                "Ouvido:",
                textoCompleto
            );

            /* =============================================
               AINDA NÃO OUVIU "EAI CHAT"
            ============================================= */

            if (
                !palavraAtivacaoDetectada
            ) {

                const ativacao =
                    localizarPalavraAtivacao(
                        textoCompleto
                    );

                if (
                    !ativacao.encontrada
                ) {

                    /*
                        Tudo falado antes de
                        "Eai Chat" é ignorado.
                    */

                    return;
                }

                palavraAtivacaoDetectada =
                    true;

                console.log(
                    "APEX ativado por voz."
                );

                /*
                    Precisamos descobrir somente
                    o texto depois de "Eai Chat".
                */

                const textoNormalizado =
                    ativacao.textoNormalizado;

                const inicio =
                    ativacao.posicao +
                    ativacao.variacao.length;

                textoDepoisDaAtivacao =
                    textoNormalizado
                        .substring(inicio)
                        .trim();

                if (
                    textoDepoisDaAtivacao !== ""
                ) {
                    programarEnvioPorSilencio();
                }

                return;
            }

            /* =============================================
               JÁ OUVIU "EAI CHAT"
            ============================================= */

            const ativacao =
                localizarPalavraAtivacao(
                    textoCompleto
                );

            if (ativacao.encontrada) {

                const inicio =
                    ativacao.posicao +
                    ativacao.variacao.length;

                textoDepoisDaAtivacao =
                    ativacao
                        .textoNormalizado
                        .substring(inicio)
                        .trim();

            } else {

                textoDepoisDaAtivacao =
                    textoCompleto.trim();
            }

            if (
                textoDepoisDaAtivacao !== ""
            ) {

                console.log(
                    "Pergunta sendo capturada:",
                    textoDepoisDaAtivacao
                );

                programarEnvioPorSilencio();
            }
        };

    /* =====================================================
       SE O SERVIÇO PARAR, INICIA NOVAMENTE
    ===================================================== */

    reconhecimento.onend =
        function () {

            if (
                microfoneAtivo &&
                !enviandoPerguntaVoz
            ) {

                setTimeout(
                    function () {

                        try {
                            reconhecimento.start();
                        } catch (erro) {
                            console.log(
                                "Reconhecimento já iniciado."
                            );
                        }

                    },
                    300
                );
            }
        };

    /* =====================================================
       ERROS DO RECONHECIMENTO
    ===================================================== */

    reconhecimento.onerror =
        function (event) {

            console.error(
                "Erro no reconhecimento de voz:",
                event.error
            );

            if (
                event.error ===
                "not-allowed"
            ) {

                microfoneAtivo = false;

                botaoMicrofone
                    .classList
                    .remove("ativo");

                alert(
                    "O acesso ao microfone foi bloqueado. Permita o uso do microfone nas configurações do navegador."
                );
            }
        };

    return true;
}

/* =========================================================
   ATIVAR MICROFONE
========================================================= */
function ativarMicrofone() {

    if (!reconhecimento) {

        const configurado =
            configurarReconhecimento();

        if (!configurado) {

            alert(
                "Seu navegador não suporta reconhecimento de voz. Teste no Google Chrome ou Microsoft Edge."
            );

            return;
        }
    }

    microfoneAtivo = true;

    palavraAtivacaoDetectada =
        false;

    textoDepoisDaAtivacao =
        "";

    botaoMicrofone
        .classList
        .add("ativo");

    botaoMicrofone.setAttribute(
        "aria-label",
        "Desativar microfone"
    );

    botaoMicrofone.title =
        "Desativar microfone";

    try {

        reconhecimento.start();

    } catch (erro) {

        console.log(
            "Reconhecimento já está ativo."
        );
    }

    console.log(
        'Microfone ativo. Aguardando "Eai Chat".'
    );
}

/* =========================================================
   DESATIVAR MICROFONE
========================================================= */
function desativarMicrofone() {

    microfoneAtivo = false;

    palavraAtivacaoDetectada =
        false;

    textoDepoisDaAtivacao =
        "";

    clearTimeout(
        temporizadorSilencio
    );

    if (reconhecimento) {

        try {

            reconhecimento.stop();

        } catch (erro) {

            console.log(
                "Reconhecimento já estava parado."
            );
        }
    }

    botaoMicrofone
        .classList
        .remove("ativo");

    botaoMicrofone.setAttribute(
        "aria-label",
        "Ativar microfone"
    );

    botaoMicrofone.title =
        "Ativar microfone";

    console.log(
        "Microfone desativado."
    );
}

/* =========================================================
   REINICIAR RECONHECIMENTO
========================================================= */
function reiniciarReconhecimento() {

    if (!microfoneAtivo) {
        return;
    }

    palavraAtivacaoDetectada =
        false;

    textoDepoisDaAtivacao =
        "";

    if (!reconhecimento) {
        return;
    }

    try {
        reconhecimento.stop();
    } catch (erro) {
        console.log(
            "Reconhecimento sendo reiniciado."
        );
    }
}

/* =========================================================
   ALTERNAR MICROFONE
========================================================= */
function alternarMicrofone() {

    if (microfoneAtivo) {

        desativarMicrofone();

    } else {

        ativarMicrofone();
    }
}

/* =========================================================
   BOTÃO MICROFONE
========================================================= */
if (botaoMicrofone) {

    botaoMicrofone.addEventListener(
        "click",
        function () {
            alternarMicrofone();
        }
    );
}

/* =========================================================
   CATEGORIAS
========================================================= */
categorias.forEach(
    function (categoria) {

        categoria.addEventListener(
            "click",
            function () {

                const textoCategoria =
                    categoria
                        .querySelector(
                            ".texto-categoria"
                        )
                        .textContent
                        .trim();

                campoPergunta.value =
                    "Quero saber mais sobre " +
                    textoCategoria;

                campoPergunta.focus();
            }
        );
    }
);

/* =========================================================
   REINICIAR HISTÓRICO DA IA
========================================================= */
function reiniciarHistoricoIA() {

    historicoIA = [
        { ...instrucaoSistema }
    ];
}

/* =========================================================
   REINICIAR CONVERSA
========================================================= */
function reiniciarConversa() {

    desativarMicrofone();

    historicoConversa.innerHTML =
        "";

    historicoConversa.scrollTop =
        0;

    reiniciarHistoricoIA();

    conversaIniciada =
        false;

    areaConversa.classList.remove(
        "ativa"
    );

    telaInicial.classList.remove(
        "oculta"
    );

    campoPergunta.value =
        "";

    campoPergunta.disabled =
        false;

    botaoEnviar.disabled =
        false;

    requestAnimationFrame(
        function () {
            campoPergunta.focus();
        }
    );
}

/* =========================================================
   BOTÃO REINICIAR
========================================================= */
botaoReiniciar.addEventListener(
    "click",
    function () {
        reiniciarConversa();
    }
);

