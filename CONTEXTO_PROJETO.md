# Contexto do Projeto: Show Track

Atualizado em: 2026-07-10.

## Resumo

Show Track e um app pessoal/PWA para acompanhar series e filmes. Ele permite buscar titulos no TMDB, adicionar a uma biblioteca pessoal, marcar filmes/episodios/temporadas como assistidos, consultar historico, ver episodios recentes/proximos lancamentos, criar listas customizadas e sincronizar dados por usuario.

O app migrou do modelo antigo `localStorage + GitHub Gist + token TMDB digitado na UI` para um modelo mais confortavel:

- Supabase Auth para login.
- Supabase Database para sync automatico por usuario.
- Funcao serverless `/api/tmdb` para consultar TMDB com token privado no servidor.
- `localStorage` como cache local/offline.
- Backup JSON manual apenas como seguranca extra.

## Stack

- React 19 com Vite.
- Tailwind CSS 4 via `@tailwindcss/vite`.
- Icones com `lucide-react`.
- Supabase JS para Auth e Database.
- Vercel Functions para proxy TMDB.
- Deploy alvo: Vercel.

Scripts:

- `npm run dev`: Vite local.
- `npm run build`: build de producao.
- `npm run lint`: ESLint.
- `npm run preview`: preview do build.
- `npm run deploy`: `npx vercel --prod`.

## Variaveis de ambiente

Ver `.env.example`:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
TMDB_BEARER_TOKEN=
```

`TMDB_BEARER_TOKEN` deve ficar no ambiente serverless da Vercel, nao no frontend.

## Supabase

Migration inicial:

```text
supabase/migrations/001_show_track_user_data.sql
```

Tabela principal:

```text
public.show_track_user_data
```

Modelo conservador:

- `user_id`: usuario Supabase.
- `library_payload`: biblioteca completa em JSON.
- `custom_lists_payload`: listas customizadas em JSON.
- timestamps de criacao/atualizacao.

RLS permite que cada usuario leia/insira/atualize apenas a propria linha.

## Estrutura

- `src/main.jsx`: monta React e registra `/sw.js`.
- `src/App.jsx`: estado principal, auth, sync, filtros, listas e renderizacao.
- `src/components/`: componentes visuais.
- `src/hooks/useTmdbSearch.js`: busca debounced no TMDB via proxy.
- `src/utils/tmdb.js`: chama `/api/tmdb` e monta itens de filme/serie.
- `src/utils/cloudSync.js`: carrega/salva payload no Supabase.
- `src/utils/supabaseClient.js`: cliente Supabase.
- `src/utils/sync.js`: merge de biblioteca/listas.
- `src/utils/helpers.js`: progresso, datas e regras de episodios.
- `src/utils/format.js`: formatacao.
- `api/tmdb.js`: funcao serverless para TMDB.
- `public/sw.js`: service worker simples.

## Persistencia

Local:

- `show_track_watchlist_v1`: cache da biblioteca.
- `show-track-custom-lists`: cache das listas customizadas.
- preferencias de UI/sort tambem ficam no `localStorage`.

Nuvem:

- Supabase salva um payload por usuario.
- Ao entrar, o app baixa o payload remoto e mescla com o cache local.
- Mudancas locais sao enviadas automaticamente com debounce.
- O botao "Sincronizar agora" força upload do estado atual.

## Modelo de dados local

Filme:

- `uid`: `movie-{tmdbId}`.
- `tmdbId`, `type`, `title`, `original_title`, `year`, `release_date`.
- imagens, sinopse, generos, runtime.
- `watched`, `watchedAt`, `createdAt`, `updatedAt`.

Serie:

- `uid`: `tv-{tmdbId}`.
- metadados gerais da serie.
- `episodes` com temporada, episodio, nome, data, watched/watchedAt.

Lista customizada:

- `id`, `name`, `itemUids`, `sortMode`, `createdAt`, `updatedAt`.

## Telas

- `Hoje`: painel inicial com series para continuar, filmes pendentes, proximos episodios e recentes.
- `Series`: adicionadas, historico, em breve, lancados e busca.
- `Filmes`: adicionados, historico e busca.
- `Listas`: listas customizadas.
- `Estatisticas`: resumo simples.
- `Mais`: conta, status de sync e backup local.

## Regras importantes

- Filme/episodio futuro nao pode ser marcado como assistido.
- Temporada marca apenas episodios ja lancados.
- Historico usa `watchedAt`.
- "Em breve" e "Lancados" usam janela de 7 dias.
- A busca local remove acentos e compara em lowercase.
- Merge preserva episodio assistido mais recente por `updatedAt`/`watchedAt`.

## Validacao

Antes de publicar:

```bash
npm run lint
npm run build
```

Para testar `/api/tmdb` localmente:

```bash
npx vercel dev
```

## Pontos de atencao

- Sem variaveis de ambiente, login/sync e TMDB proxy nao funcionam no deploy.
- GitHub Pages nao e mais o alvo principal, porque o app precisa de funcao serverless para esconder o token TMDB.
- O modelo Supabase inicial usa JSON por usuario; normalizar filmes/series/episodios pode ser feito depois.
- `src/App.jsx` ainda concentra muita responsabilidade.
