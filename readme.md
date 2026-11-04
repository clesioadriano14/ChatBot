# Chat com IA (LLM)

Aplicação web de chat com um modelo de linguagem, feita só com HTML, CSS e JavaScript (client-side).

## Integrantes
- Nome 1
- Nome 2

## API utilizada
- API: Groq (formato compatível com Chat Completions)
- Modelo: `llama-3.3-70b-versatile`
- Endpoint: `https://api.groq.com/openai/v1/chat/completions`

## Como executar
1. Crie uma chave de teste em https://console.groq.com/keys
2. Abra o `script.js` e troque `COLE_SUA_CHAVE_AQUI` na constante `API_KEY` pela sua chave.
3. Abra o `index.html` no navegador (ou use a extensão Live Server do VS Code).

> A chave fica exposta no navegador. Use apenas chaves de teste e não envie a chave real para repositórios públicos.

## Recursos
- Balões distintos para usuário e IA
- Histórico enviado em cada requisição (mantém o contexto)
- Indicador de carregamento
- Tratamento de erros (chave inválida, limite de uso, falha de conexão)
- Menu lateral com várias conversas: criar, trocar e excluir (cada uma mantém o próprio histórico); a barra pode ser recolhida pelo botão ☰ e o navegador lembra a escolha
- Conversas salvas no `localStorage` do navegador, então continuam depois de recarregar a página
- `fetch()` com `async/await`; Enter envia, Shift+Enter quebra linha