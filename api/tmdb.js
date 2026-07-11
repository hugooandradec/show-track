const TMDB_BASE = "https://api.themoviedb.org/3";

export default async function handler(request, response) {
  const token = process.env.TMDB_BEARER_TOKEN;

  if (!token) {
    response.status(500).json({ error: "TMDB_BEARER_TOKEN nao configurado." });
    return;
  }

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  const rawPath = String(request.query.path || "");

  if (!rawPath.startsWith("/")) {
    response.status(400).json({ error: "Parametro path invalido." });
    return;
  }

  try {
    const url = new URL(`${TMDB_BASE}${rawPath}`);

    for (const [key, value] of Object.entries(request.query)) {
      if (key === "path" || value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, Array.isArray(value) ? value[0] : value);
    }

    const tmdbResponse = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const text = await tmdbResponse.text();
    response.status(tmdbResponse.status);
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.send(text || "{}");
  } catch (error) {
    response.status(500).json({ error: error.message || "Erro ao consultar TMDB." });
  }
}
