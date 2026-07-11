# Show Track

Show Track e um app pessoal para acompanhar series e filmes. Ele busca titulos no TMDB por uma funcao serverless, salva a biblioteca por usuario no Supabase e mantem um cache local para uso mais rapido no navegador.

## Funcionalidades

- Login por email/senha com Supabase Auth.
- Sync automatico por usuario no Supabase.
- Busca de series e filmes no TMDB sem pedir token no app.
- Tela Hoje com series para continuar, filmes pendentes e lancamentos proximos.
- Biblioteca separada por series e filmes.
- Progresso de series por episodio e temporada.
- Historico de filmes e episodios assistidos.
- Abas para episodios em breve e lancados recentemente.
- Listas customizadas para sagas, universos ou qualquer agrupamento pessoal.
- Backup local em JSON como seguranca extra.
- Importacao de export JSON do SeriesGuide.
- PWA simples para deploy na Vercel.

## Requisitos

- Node.js compativel com Vite 8.
- Projeto Supabase com Auth habilitado.
- Tabela `show_track_user_data`, criada pela migration em `supabase/migrations`.
- Token Bearer do TMDB configurado como segredo no deploy.
- Deploy em ambiente com funcao serverless, como Vercel.

## Variaveis de ambiente

Crie um `.env.local` para desenvolvimento e configure as mesmas variaveis na Vercel:

```bash
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
TMDB_BEARER_TOKEN=SEU_BEARER_TOKEN_PRIVADO_DO_TMDB
```

`TMDB_BEARER_TOKEN` fica apenas no servidor. O frontend chama `/api/tmdb`.

## Supabase

Execute o SQL em:

```text
supabase/migrations/001_show_track_user_data.sql
```

O modelo inicial e conservador: uma linha por usuario, com a biblioteca e listas customizadas em JSON. Isso preserva o formato atual do app e deixa uma normalizacao futura para quando valer a pena.

## Como rodar

```bash
npm install
npm run dev
```

Para testar a funcao `/api/tmdb` localmente, use Vercel Dev:

```bash
npx vercel dev
```

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run preview
npm run deploy
```

`npm run deploy` usa `npx vercel --prod`.

## Estrutura

- `src/App.jsx`: estado principal, regras de negocio, auth, sync, filtros e listas.
- `src/components/`: telas, rows, drawer de detalhes e navegacao.
- `src/hooks/useTmdbSearch.js`: busca com debounce no TMDB.
- `src/utils/tmdb.js`: chamadas ao proxy `/api/tmdb` e montagem dos itens.
- `src/utils/cloudSync.js`: leitura/gravacao do payload por usuario no Supabase.
- `src/utils/seriesGuideImport.js`: conversor do export JSON do SeriesGuide.
- `src/utils/supabaseClient.js`: cliente Supabase do frontend.
- `src/utils/sync.js`: merge de biblioteca/listas.
- `api/tmdb.js`: funcao serverless para consultar TMDB com token privado.
- `public/sw.js`: service worker simples para PWA.

## Contexto para manutencao

Leia `CONTEXTO_PROJETO.md` antes de mudancas maiores. Ele descreve o modelo de dados, fluxos e pontos de atencao do projeto.
