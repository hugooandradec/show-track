# Contexto do Projeto: Show Track

Este documento foi criado a partir da leitura do codigo, porque o `README.md` ainda e o template padrao do Vite.

## Resumo

Show Track e um app React/Vite para acompanhar series e filmes. Ele permite buscar titulos no TMDB, adicionar a uma biblioteca pessoal, marcar filmes/episodios/temporadas como assistidos, consultar historico, ver episodios recentes ou proximos lancamentos, criar listas customizadas e sincronizar os dados entre dispositivos usando um Gist privado do GitHub.

O app e escrito em portugues e tem uma interface mobile-first com navegacao inferior fixa.

## Stack e scripts

- React 19 com Vite.
- Tailwind CSS 4 via `@tailwindcss/vite`.
- Icones com `lucide-react`.
- ESLint configurado em `eslint.config.js`.
- Deploy previsto para GitHub Pages com base `/show-track/`.

Scripts em `package.json`:

- `npm run dev`: inicia o Vite em desenvolvimento.
- `npm run build`: gera o build de producao.
- `npm run lint`: roda ESLint.
- `npm run preview`: serve o build localmente.
- `npm run deploy`: publica `dist` via `gh-pages`.

## Estrutura principal

- `src/main.jsx`: monta o React e registra o service worker em `/show-track/sw.js`.
- `src/App.jsx`: componente central. Concentra estado, filtros, ordenacao, mutacoes da biblioteca, sincronizacao, listas customizadas e renderizacao das paginas.
- `src/components/`: componentes de tela e UI.
- `src/hooks/useTmdbSearch.js`: busca debounced no TMDB.
- `src/utils/tmdb.js`: constantes, chamadas ao TMDB e construcao/atualizacao de itens de filme/serie.
- `src/utils/sync.js`: upload/download/merge da lista via GitHub Gist.
- `src/utils/helpers.js`: progresso, datas, episodios proximos/recentes e inferencia de horario por emissora/plataforma.
- `src/utils/format.js`: formatacao de datas, datas com hora e codigos de episodios.
- `src/utils/titles.js`: escolha de titulo primario/secundario.
- `src/utils/seriesStatus.js`: labels e estilos de status de serie.
- `src/utils/posters.js`: URL base de posters do TMDB.
- `src/utils/listCleanup.js`: limpa datas legadas `1969-12-31` e `1970-01-01`.
- `public/manifest.json` e `public/sw.js`: suporte PWA simples.

## Integracoes externas

### TMDB

O app usa a API do TMDB em `https://api.themoviedb.org/3`.

O usuario precisa salvar um Bearer token do TMDB em `Mais > Configuracoes`. Esse token fica no `localStorage` com a chave `show_track_tmdb_token`.

Fluxos que dependem do TMDB:

- Busca global em `/search/multi`, com `language=pt-BR`.
- Adicao de filme via `/movie/{id}`.
- Adicao/refresh de serie via `/tv/{id}` e `/tv/{id}/season/{season_number}`.

Observacao: detalhes principais da serie sao buscados em `pt-BR`, mas temporadas/episodios sao buscados em `en-US`.

### GitHub Gist

A sincronizacao usa a API do GitHub em `https://api.github.com`.

O usuario salva um token do GitHub com acesso a Gists e, opcionalmente, um `gistId`. A configuracao fica no `localStorage` com a chave `show-track-sync-config`.

Arquivo sincronizado no Gist:

- `show-track-list.json`

O payload tem este formato geral:

```json
{
  "app": "show-track",
  "version": 1,
  "syncedAt": "...",
  "list": [],
  "customLists": []
}
```

Se nao houver `gistId`, o primeiro upload cria um Gist privado e salva o ID.

## Persistencia local

O app usa `localStorage` como fonte local de persistencia.

Chaves principais:

- `show_track_tmdb_token`: token do TMDB.
- `show_track_watchlist_v1`: biblioteca de filmes e series.
- `show-track-sync-config`: token/Gist/autosync.
- `show-track-sort-preferences`: preferencias de ordenacao.
- `show-track-ui-preferences`: secao/abas/filtros ativos.
- `show-track-custom-lists`: listas customizadas.

## Modelo de dados

### Filme

Itens de filme sao criados por `buildMovieItem` em `src/utils/tmdb.js`.

Campos importantes:

- `uid`: `movie-{tmdbId}`.
- `tmdbId`
- `type`: `"movie"`
- `title`
- `original_title`
- `year`
- `release_date`
- `poster_path`
- `backdrop_path`
- `overview`
- `genres`
- `runtime`
- `watched`
- `watchedAt`
- `note`
- `createdAt`
- `updatedAt`

### Serie

Itens de serie sao criados por `buildTvItem` e atualizados por `refreshTvItem`.

Campos importantes:

- `uid`: `tv-{tmdbId}`.
- `tmdbId`
- `type`: `"tv"`
- `title`
- `original_title`
- `year`
- `release_date`
- `poster_path`
- `backdrop_path`
- `overview`
- `genres`
- `network`
- `networks`
- `air_time`
- `number_of_seasons`
- `number_of_episodes`
- `next_episode_to_air`
- `status`
- `episodes`
- `note`
- `createdAt`
- `updatedAt`

Cada episodio tem:

- `id`: `{serieId}-{season_number}-{episode_number}`.
- `tmdbEpisodeId`
- `season_number`
- `episode_number`
- `name`
- `air_date`
- `air_time`
- `overview`
- `runtime`
- `still_path`
- `watched`
- `watchedAt`
- `updatedAt`

### Lista customizada

Criada em `App.jsx`.

Campos:

- `id`: `custom-{timestamp}`.
- `name`
- `itemUids`
- `sortMode`: `oldest`, `newest` ou `title`.
- `createdAt`
- `updatedAt`

As listas customizadas exibem apenas titulos pendentes: filmes nao assistidos e series que ainda nao estao totalmente assistidas.

## Navegacao e telas

A navegacao inferior (`BottomNav`) tem cinco secoes:

- `series`: series adicionadas, historico, proximos episodios, episodios lancados recentemente e busca.
- `movies`: filmes adicionados, historico e busca.
- `lists`: listas customizadas.
- `stats`: estatisticas simples.
- `more`: configuracoes de token TMDB e sincronizacao GitHub Gist.

### Series

Abas em `SeriesSection`:

- `Adicionado`: lista series ordenadas pelo proximo episodio pendente, data ou titulo.
- `Historico`: episodios assistidos, mais recentes primeiro.
- `Em breve`: episodios dos proximos 7 dias.
- `Lancados`: episodios lancados nos ultimos 7 dias.
- `Buscar`: resultados do TMDB.

O `SeriesRow` mostra poster, titulo, proximo episodio pendente, data/horario/emissora, progresso e status da serie.

O drawer de detalhes permite:

- Ver poster, ano, emissora/plataformas, horario, status e sinopse.
- Expandir temporadas.
- Marcar/desmarcar episodio individual.
- Marcar/desmarcar temporada inteira.
- Remover a serie.

### Filmes

Abas em `MoviesSection`:

- `Adicionado`: filmes pendentes ou vistos, com filtro `Para ver`/`Visto`.
- `Historico`: filmes assistidos, mais recentes primeiro.
- `Buscar`: resultados do TMDB.

O `MovieRow` mostra poster, titulo, data de lancamento e acao de marcar como assistido.

O drawer de detalhes permite:

- Ver poster, data, duracao e sinopse.
- Marcar/desmarcar como assistido.
- Remover o filme.

### Modal de data assistida

`WatchedDateModal` aparece ao marcar filme, episodio ou temporada como assistido.

Opcoes:

- `Agora`: usa a data de hoje.
- `No lancamento`: usa a data de lancamento, quando disponivel.
- `Selecionar data`: permite escolher uma data, mas nao antes do lancamento.

## Regras de negocio importantes

- Filme ou episodio com data futura nao pode ser marcado como assistido.
- Temporada so pode ser marcada como assistida se houver episodios lancados.
- Ao marcar uma temporada, apenas episodios ja lancados sao marcados.
- O historico usa `watchedAt`, nao apenas o booleano `watched`.
- Series totalmente assistidas podem continuar aparecendo de forma especial se houver proximo episodio futuro ou status ativo.
- Episodios "em breve" e "lancados" usam uma janela de 7 dias.
- Horario de episodio e calculado com prioridade: `episode.air_time`, depois `item.air_time`, depois inferencia por `network`.
- A busca local remove acentos e compara em lowercase.
- A ordenacao usa `pt-BR` com `sensitivity: "base"` para titulos.
- `getPrimaryTitle` prioriza `original_title` sobre `title`.

## Sincronizacao e merge

Em `src/utils/sync.js`:

- `uploadListToGist`: cria ou atualiza um Gist privado.
- `downloadListFromGist`: baixa `show-track-list.json`.
- `mergeLists`: une biblioteca local/remota por `uid`.
- `mergeCustomLists`: une listas customizadas por `id`.

Resolucao de conflitos:

- Para itens, o registro com `updatedAt`/`createdAt` mais recente vence.
- Para series, os episodios sao mesclados individualmente.
- Para episodios, vence o mais recente por `updatedAt` ou `watchedAt`; se nao houver datas, episodio assistido tem prioridade.
- Para listas customizadas, o registro mais recente vence, mas `itemUids` sao unidos.

Auto sync:

- Se ligado, ao abrir o app ele tenta baixar/mesclar o Gist.
- Alteracoes locais disparam upload automatico com debounce de 400 ms.
- Se nao houver `gistId`, o primeiro envio cria o Gist.

## PWA e deploy

O projeto esta configurado para rodar sob `/show-track/`:

- `vite.config.js` define `base: "/show-track/"`.
- `public/manifest.json` define `start_url: "/show-track/"`.
- `src/main.jsx` registra `/show-track/sw.js`.
- `public/sw.js` cacheia navegacao em `/show-track/`.

Ponto de atencao: em `index.html`, os links do favicon e manifest usam caminhos absolutos `/favicon.svg` e `/manifest.json`. Como o deploy usa base `/show-track/`, pode ser necessario ajustar esses caminhos se os assets nao carregarem corretamente no GitHub Pages.

## Pontos de manutencao conhecidos

- `README.md` ainda e o template do Vite.
- `src/App.css` parece sobra do template e nao e importado por `src/main.jsx` nem por `src/App.jsx`.
- `src/assets/vite.svg` e `src/assets/react.svg` tambem parecem sobras do template.
- Algumas strings no codigo aparecem com caracteres mojibake, como `SÃ©ries`, `HistÃ³rico`, `NÃ£o`. Isso provavelmente indica problema de encoding em arquivos existentes. Ao editar textos de UI, conferir se o arquivo esta salvo em UTF-8.
- `src/App.jsx` concentra muita responsabilidade: estado global, regras de negocio, sync, filtros e renderizacao. Se o projeto crescer, bons proximos cortes seriam hooks para biblioteca, sync e listas customizadas.
- Nao ha testes automatizados no projeto no momento.

## Como validar mudancas

Comandos recomendados:

```bash
npm run lint
npm run build
```

Para testar manualmente:

```bash
npm run dev
```

Fluxos manuais importantes:

- Salvar token do TMDB e buscar filme/serie.
- Adicionar filme e serie.
- Marcar/desmarcar filme, episodio e temporada.
- Ver historico de filmes e series.
- Conferir abas `Em breve` e `Lancados`.
- Criar lista customizada, adicionar/remover titulos e validar que itens assistidos somem da lista.
- Configurar Gist, enviar, baixar e mesclar lista.

## Mapa geral do workspace

Existe um mapa central dos projetos em:

```text
C:\github\MAPA_GERAL.md
```

Quando este projeto for aberto em um chat dentro de `C:\github\show-track`, tente consultar esse arquivo para entender como ele se relaciona com os outros projetos do workspace.
Se o chat estiver limitado apenas a esta pasta e nao conseguir acessar `C:\github`, continue usando este `CONTEXTO_PROJETO.md` como fonte principal.
