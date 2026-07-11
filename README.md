# Show Track

Show Track e um app pessoal para acompanhar series e filmes. Ele busca titulos no TMDB, salva uma biblioteca local, marca filmes/episodios/temporadas como assistidos, mostra historico, destaca proximos episodios e permite sincronizar os dados por GitHub Gist.

## Funcionalidades

- Busca de series e filmes no TMDB.
- Tela Hoje com series para continuar, filmes pendentes e lancamentos proximos.
- Biblioteca separada por series e filmes.
- Progresso de series por episodio e temporada.
- Historico de filmes e episodios assistidos.
- Abas para episodios em breve e lancados recentemente.
- Listas customizadas para sagas, universos ou qualquer agrupamento pessoal.
- Sincronizacao manual ou automatica usando um Gist privado do GitHub.
- Backup local em JSON, com importacao mesclada aos dados atuais.
- PWA simples, preparado para rodar em `/show-track/`.

## Requisitos

- Node.js compativel com Vite 8.
- Token Bearer do TMDB para buscar e adicionar titulos.
- Token do GitHub com acesso a Gists, se quiser sincronizar entre dispositivos.

## Como rodar

```bash
npm install
npm run dev
```

Depois abra a URL exibida pelo Vite.

## Configuracao no app

No menu `Mais`:

- Salve o token do TMDB para habilitar buscas.
- Salve o token do GitHub e, opcionalmente, o ID do Gist para sincronizar.
- Se nao houver ID do Gist, o primeiro envio cria um Gist privado e salva o ID localmente.
- Use o backup local para exportar/importar um JSON da biblioteca quando quiser uma copia manual.

Os dados principais ficam no `localStorage`. A sincronizacao exporta/importa o arquivo `show-track-list.json` em um Gist.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run preview
npm run deploy
```

## Estrutura

- `src/App.jsx`: estado principal, regras de negocio, filtros, listas e sincronizacao.
- `src/components/`: telas, rows, drawer de detalhes e navegacao.
- `src/hooks/useTmdbSearch.js`: busca com debounce no TMDB.
- `src/utils/tmdb.js`: chamadas ao TMDB e montagem dos itens.
- `src/utils/sync.js`: upload, download e merge via GitHub Gist.
- `public/sw.js`: service worker simples para PWA.

## Contexto para manutencao

Leia `CONTEXTO_PROJETO.md` antes de mudancas maiores. Ele descreve o modelo de dados, fluxos e pontos de atencao do projeto.
