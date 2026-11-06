// A chave da API NÃO fica no código: o usuário informa a sua no campo de senha da página.
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";
const CHAVE_STORAGE = "chat-llm:conversas";

const MENSAGEM_SISTEMA = {
    role: "system",
    content: "Você é um assistente prestativo. Responda em português do Brasil, de forma clara e objetiva."
};

// conversa = { id, titulo, mensagens: [{ role, content }] }
let conversas = carregarConversas();
let ativaId = null;
let aguardando = false;

const lista = document.getElementById("lista");
const tituloEl = document.getElementById("titulo");
const campoChave = document.getElementById("chave");
const areaMensagens = document.getElementById("mensagens");
const formulario = document.getElementById("formulario");
const entrada = document.getElementById("entrada");
const botaoEnviar = document.getElementById("enviar");

// ===== Armazenamento (localStorage) =====
function carregarConversas() {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE_STORAGE));
        return Array.isArray(salvo) ? salvo : [];
    } catch {
        return [];
    }
}

function salvarConversas() {
    try {
        localStorage.setItem(CHAVE_STORAGE, JSON.stringify(conversas));
    } catch (erro) {
        console.error("Não foi possível salvar as conversas:", erro);
    }
}

function conversaAtiva() {
    return conversas.find((c) => c.id === ativaId);
}

// ===== Menu lateral =====
function renderizarLista() {
    lista.innerHTML = "";
    for (const conversa of conversas) {
        const item = document.createElement("div");
        item.className = "item" + (conversa.id === ativaId ? " ativa" : "");

        const abrir = document.createElement("button");
        abrir.className = "abrir";
        abrir.textContent = conversa.titulo;
        abrir.addEventListener("click", () => selecionarConversa(conversa.id));

        const excluir = document.createElement("button");
        excluir.className = "excluir";
        excluir.textContent = "✕";
        excluir.addEventListener("click", () => excluirConversa(conversa.id));

        item.append(abrir, excluir);
        lista.appendChild(item);
    }
}

function novaConversa() {
    if (aguardando) return;
    // Reaproveita uma conversa vazia já existente
    const vazia = conversas.find((c) => c.mensagens.length === 0);
    if (vazia) return selecionarConversa(vazia.id);

    const conversa = { id: Date.now().toString(), titulo: "Nova conversa", mensagens: [] };
    conversas.unshift(conversa);
    salvarConversas();
    selecionarConversa(conversa.id);
}

function selecionarConversa(id) {
    if (aguardando) return;
    ativaId = id;
    renderizarLista();
    renderizarMensagens();
    entrada.focus();
}

function excluirConversa(id) {
    if (aguardando) return;
    if (!confirm("Excluir esta conversa?")) return;
    conversas = conversas.filter((c) => c.id !== id);
    salvarConversas();
    if (id === ativaId) {
        conversas.length > 0 ? selecionarConversa(conversas[0].id) : novaConversa();
    } else {
        renderizarLista();
    }
}

// ===== Mensagens =====
function renderizarMensagens() {
    const conversa = conversaAtiva();
    tituloEl.textContent = conversa.titulo;
    areaMensagens.innerHTML = "";
    if (conversa.mensagens.length === 0) {
        areaMensagens.innerHTML = '<p class="vazio">Escreva uma mensagem para começar a conversa.</p>';
        return;
    }
    for (const m of conversa.mensagens) {
        adicionarBalao(m.content, m.role === "user" ? "usuario" : "ia");
    }
}

function adicionarBalao(texto, tipo) {
    const vazio = areaMensagens.querySelector(".vazio");
    if (vazio) vazio.remove();
    const balao = document.createElement("div");
    balao.className = "balao " + tipo; // tipos: usuario, ia, erro
    balao.textContent = texto;
    areaMensagens.appendChild(balao);
    areaMensagens.scrollTop = areaMensagens.scrollHeight;
    return balao;
}

// ===== API =====
async function enviarParaAPI(mensagens) {
    const resposta = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${campoChave.value.trim()}`
        },
        body: JSON.stringify({ model: MODEL, messages: mensagens })
    });

    if (!resposta.ok) {
        if (resposta.status === 401) throw new Error("Chave de API inválida (erro 401).");
        if (resposta.status === 404) throw new Error("Modelo não encontrado. Confira a constante MODEL no script.js.");
        if (resposta.status === 429) throw new Error("Limite de requisições atingido (erro 429). Tente de novo em instantes.");
        throw new Error("Erro " + resposta.status + " na API.");
    }

    const dados = await resposta.json();
    const texto = dados?.choices?.[0]?.message?.content;
    if (!texto) throw new Error("A API respondeu em um formato inesperado.");
    return texto;
}

async function enviarMensagem(texto) {
    const conversa = conversaAtiva();
    conversa.mensagens.push({ role: "user", content: texto });

    // O título da conversa vem da primeira mensagem
    if (conversa.mensagens.length === 1) {
        conversa.titulo = texto.length > 30 ? texto.slice(0, 30) + "…" : texto;
        tituloEl.textContent = conversa.titulo;
        renderizarLista();
    }

    adicionarBalao(texto, "usuario");
    const carregando = adicionarBalao("Digitando...", "ia");
    aguardando = true;
    botaoEnviar.disabled = true;

    try {
        // Histórico completo da conversa enviado a cada requisição (mantém o contexto)
        const resposta = await enviarParaAPI([MENSAGEM_SISTEMA, ...conversa.mensagens]);
        conversa.mensagens.push({ role: "assistant", content: resposta });
        carregando.textContent = resposta;
    } catch (erro) {
        console.error("Erro:", erro);
        conversa.mensagens.pop(); // remove a pergunta sem resposta para não duplicar ao reenviar
        carregando.className = "balao erro";
        carregando.textContent = erro instanceof TypeError
            ? "Falha de conexão. Verifique sua internet e tente de novo."
            : erro.message;
    }

    salvarConversas();
    aguardando = false;
    botaoEnviar.disabled = false;
    entrada.focus();
}

// ===== Eventos =====
formulario.addEventListener("submit", (e) => {
    e.preventDefault();
    const texto = entrada.value.trim();
    if (!texto || aguardando) return;

    if (!campoChave.value.trim()) {
        adicionarBalao("Informe sua chave da API no campo acima para conversar.", "erro");
        campoChave.focus();
        return;
    }

    entrada.value = "";
    enviarMensagem(texto);
});

// Enter envia; Shift+Enter quebra linha
entrada.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        formulario.requestSubmit();
    }
});

document.getElementById("novaConversa").addEventListener("click", novaConversa);

// ===== Início =====
if (conversas.length > 0) {
    selecionarConversa(conversas[0].id);
} else {
    novaConversa();
}