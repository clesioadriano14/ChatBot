// ===== Configuração =====
// Exemplo com a API da Groq (compatível com Chat Completions).
// A chave da API NÃO fica no código: cada usuário informa a sua no campo de senha da página.
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";
const CHAVE_STORAGE = "chat-llm:conversas";
const CHAVE_MENU = "chat-llm:menu";

const MENSAGEM_SISTEMA = {
    role: "system",
    content: "Você é um assistente prestativo. Responda em português do Brasil, de forma clara e objetiva."
};

// ===== Estado =====
// conversa = { id, titulo, mensagens: [{ role, content }] }
let conversas = carregarConversas();
let ativaId = null;
let aguardando = false;

const app = document.querySelector(".app");
const botaoMenu = document.getElementById("abrirMenu");
const menu = document.getElementById("menu");
const fundoMenu = document.getElementById("fundoMenu");
const lista = document.getElementById("lista");
const tituloEl = document.getElementById("titulo");
const areaMensagens = document.getElementById("mensagens");
const formulario = document.getElementById("formulario");
const entrada = document.getElementById("entrada");
const botaoEnviar = document.getElementById("enviar");
const campoChave = document.getElementById("chave");

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
    if (conversas.length === 0) {
        const p = document.createElement("p");
        p.className = "sem-conversas";
        p.textContent = "Nenhuma conversa ainda.";
        lista.appendChild(p);
        return;
    }
    for (const conversa of conversas) {
        const item = document.createElement("div");
        item.className = "item" + (conversa.id === ativaId ? " ativa" : "");

        const abrir = document.createElement("button");
        abrir.className = "abrir";
        abrir.type = "button";
        abrir.textContent = conversa.titulo;
        abrir.title = conversa.titulo;
        abrir.addEventListener("click", () => selecionarConversa(conversa.id));

        const excluir = document.createElement("button");
        excluir.className = "excluir";
        excluir.type = "button";
        excluir.textContent = "✕";
        excluir.setAttribute("aria-label", `Excluir conversa ${conversa.titulo}`);
        excluir.addEventListener("click", () => excluirConversa(conversa.id));

        item.append(abrir, excluir);
        lista.appendChild(item);
    }
}

// Celular: gaveta sobre a tela (classe "aberto"). Computador: barra recolhível (classe "recolhido").
const telaPequena = window.matchMedia("(max-width: 760px)");

function abrirMenu(abrir) {
    menu.classList.toggle("aberto", abrir);
    fundoMenu.classList.toggle("aberto", abrir);
    botaoMenu.setAttribute("aria-expanded", String(abrir));
}

function alternarMenu() {
    if (telaPequena.matches) {
        abrirMenu(!menu.classList.contains("aberto"));
        return;
    }
    const recolher = !app.classList.contains("recolhido");
    app.classList.toggle("recolhido", recolher);
    botaoMenu.setAttribute("aria-expanded", String(!recolher));
    try {
        localStorage.setItem(CHAVE_MENU, recolher ? "recolhido" : "aberto");
    } catch { /* sem armazenamento */ }
}

function novaConversa() {
    // Reaproveita uma conversa vazia já existente em vez de criar várias
    const vazia = conversas.find((c) => c.mensagens.length === 0);
    if (vazia) return selecionarConversa(vazia.id);

    const conversa = { id: Date.now().toString(), titulo: "Nova conversa", mensagens: [] };
    conversas.unshift(conversa);
    salvarConversas();
    selecionarConversa(conversa.id);
}

function selecionarConversa(id) {
    ativaId = id;
    renderizarLista();
    renderizarMensagens();
    abrirMenu(false);
    entrada.focus();
}

function excluirConversa(id) {
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
        const p = document.createElement("p");
        p.className = "vazio";
        p.textContent = "Escreva uma mensagem para começar a conversa.";
        areaMensagens.appendChild(p);
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
    balao.className = `balao ${tipo}`;
    balao.textContent = texto; // textContent evita injeção de HTML
    areaMensagens.appendChild(balao);
    areaMensagens.scrollTop = areaMensagens.scrollHeight;
    return balao;
}

function mostrarCarregando() {
    const balao = adicionarBalao("", "ia");
    balao.innerHTML = '<div class="carregando" role="status" aria-label="Aguardando resposta"><span></span><span></span><span></span></div>';
    return balao;
}

function definirAguardando(valor) {
    aguardando = valor;
    botaoEnviar.disabled = valor;
    entrada.disabled = valor;
    menu.classList.toggle("bloqueado", valor); // evita trocar de conversa durante a resposta
    if (!valor) entrada.focus();
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
        let detalhe = "";
        try {
            const corpo = await resposta.json();
            detalhe = corpo?.error?.message || "";
        } catch { /* corpo sem JSON */ }
        if (resposta.status === 401) throw new Error("Chave de API inválida (erro 401).");
        if (resposta.status === 404) throw new Error("Modelo não encontrado ou sem acesso. Confira o nome na constante MODEL do script.js. " + detalhe);
        if (resposta.status === 429) throw new Error("Limite de requisições atingido (erro 429). Aguarde um pouco e tente de novo.");
        throw new Error(`Erro ${resposta.status} na API. ${detalhe}`.trim());
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
        conversa.titulo = texto.length > 40 ? texto.slice(0, 40) + "…" : texto;
        tituloEl.textContent = conversa.titulo;
        renderizarLista();
    }

    adicionarBalao(texto, "usuario");
    definirAguardando(true);
    const carregando = mostrarCarregando();

    try {
        // Histórico completo da conversa enviado a cada requisição (mantém o contexto)
        const resposta = await enviarParaAPI([MENSAGEM_SISTEMA, ...conversa.mensagens]);
        conversa.mensagens.push({ role: "assistant", content: resposta });
        carregando.remove();
        adicionarBalao(resposta, "ia");
    } catch (erro) {
        console.error("Erro:", erro);
        conversa.mensagens.pop(); // remove a pergunta sem resposta para não duplicar ao reenviar
        carregando.remove();
        const msg = erro instanceof TypeError
            ? "Falha de conexão. Verifique sua internet e tente de novo."
            : erro.message;
        adicionarBalao(msg, "erro");
    } finally {
        salvarConversas();
        definirAguardando(false);
    }
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
    entrada.style.height = "auto";
    enviarMensagem(texto);
});

// Enter envia; Shift+Enter quebra linha
entrada.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        formulario.requestSubmit();
    }
});

entrada.addEventListener("input", () => {
    entrada.style.height = "auto";
    entrada.style.height = entrada.scrollHeight + "px";
});

document.getElementById("novaConversa").addEventListener("click", novaConversa);
botaoMenu.addEventListener("click", alternarMenu);
fundoMenu.addEventListener("click", () => abrirMenu(false));

// ===== Início =====
try {
    if (localStorage.getItem(CHAVE_MENU) === "recolhido") app.classList.add("recolhido");
} catch { /* sem armazenamento */ }
botaoMenu.setAttribute("aria-expanded", String(telaPequena.matches ? false : !app.classList.contains("recolhido")));

if (conversas.length > 0) {
    selecionarConversa(conversas[0].id);
} else {
    novaConversa();
}