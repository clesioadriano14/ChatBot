# Chat com IA (LLM)

Aplicação web de chat com um modelo de linguagem, feita só com HTML, CSS e JavaScript (client-side).

## Integrantes
- Clésio Adriano de Carvalho Filho
- Felipe Martins dos Santos

## API utilizada
- API: Groq (formato compatível com Chat Completions)
- Modelo: `openai/gpt-oss-120b`
- Endpoint: `https://api.groq.com/openai/v1/chat/completions`

## Como executar
1. Crie uma chave de teste em https://console.groq.com/keys
2. Abra o `index.html` no navegador (ou use a extensão Live Server do VS Code).
3. Cole a sua chave no campo "Chave da API" e comece a conversar.

> A chave não fica no código: cada usuário informa a própria chave, que existe só na memória da página (ao recarregar, é preciso informar de novo). Use sempre chaves de teste.

## Recursos
- Menu lateral fixo com várias conversas: criar, trocar e excluir (cada uma mantém o próprio histórico)
- Conversas salvas no `localStorage` do navegador
- Balões distintos para usuário e IA
- Histórico enviado em cada requisição (mantém o contexto)
- Indicador de carregamento ("Digitando...")
- Tratamento de erros (chave inválida, limite de uso, falha de conexão)
- `fetch()` com `async/await`; Enter envia, Shift+Enter quebra linha