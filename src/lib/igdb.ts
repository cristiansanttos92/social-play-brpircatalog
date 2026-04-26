// IGDB API utilities
const IGDB_CLIENT_ID = import.meta.env.VITE_IGDB_CLIENT_ID;
const IGDB_CLIENT_SECRET = import.meta.env.VITE_IGDB_CLIENT_SECRET;

let accessToken: string | null = null;
let tokenExpiry: number | null = null;

export interface IGDBGame {
  id: number;
  name: string;
  videos?: Array<{
    id: number;
    video_id: string;
  }>;
  screenshots?: Array<{
    id: number;
    url: string;
  }>;
  artworks?: Array<{
    id: number;
    url: string;
  }>;
  cover?: {
    id: number;
    url: string;
  };
  platforms?: Array<{
    id: number;
    name: string;
  }>;
  genres?: Array<{
    id: number;
    name: string;
  }>;
  game_modes?: Array<{
    id: number;
    name: string;
  }>;
  player_perspectives?: Array<{
    id: number;
    name: string;
  }>;
  themes?: Array<{
    id: number;
    name: string;
  }>;
  first_release_date?: number;
  summary?: string;
  storyline?: string;
  url?: string;
  rating?: number;
  aggregated_rating?: number;
  total_rating?: number;
  total_rating_count?: number;
  rating_count?: number;
  involved_companies?: Array<{
    id: number;
    company: {
      id: number;
      name: string;
    };
  }>;
}

const GAME_FIELDS = [
  "name",
  "cover.url",
  "screenshots.url",
  "videos.video_id",
  "artworks.url",
  "platforms.name",
  "genres.name",
  "game_modes.name",
  "player_perspectives.name",
  "themes.name",
  "first_release_date",
  "summary",
  "storyline",
  "url",
  "rating",
  "aggregated_rating",
  "total_rating",
  "total_rating_count",
  "rating_count",
  "involved_companies.company.name",
].join(", ");

function escapeIGDBString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function getAccessToken(): Promise<string> {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
    throw new Error('IGDB_CLIENT_ID e IGDB_CLIENT_SECRET não estão configurados. Verifique o arquivo .env.local');
  }

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: IGDB_CLIENT_ID,
      client_secret: IGDB_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('IGDB Auth Error:', errorData);
    throw new Error(`Failed to get IGDB access token: ${errorData.message || 'Unknown error'}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer
  return accessToken;
}

export async function searchGames(query: string): Promise<IGDBGame[]> {
  const token = await getAccessToken();
  const escapedQuery = escapeIGDBString(query.trim());

  const response = await fetch('/api/igdb/games', {
    method: 'POST',
    headers: {
      'Client-ID': IGDB_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body: `
      search "${escapedQuery}";
      fields ${GAME_FIELDS};
      limit 10;
      where cover != null;
    `,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to search IGDB games: ${response.status} ${errorText}`);
  }

  const games = await response.json();
  return games;
}

export async function getGameDetailsById(id: number): Promise<IGDBGame | null> {
  const token = await getAccessToken();

  const response = await fetch('/api/igdb/games', {
    method: 'POST',
    headers: {
      'Client-ID': IGDB_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body: `
      fields ${GAME_FIELDS};
      where id = ${id};
      limit 1;
    `,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to fetch IGDB game details: ${response.status} ${errorText}`);
  }

  const games = (await response.json()) as IGDBGame[];
  return games[0] ?? null;
}

export async function searchGameDetailsByName(name: string): Promise<IGDBGame | null> {
  const token = await getAccessToken();
  const escapedName = escapeIGDBString(name.trim());

  const response = await fetch('/api/igdb/games', {
    method: 'POST',
    headers: {
      'Client-ID': IGDB_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body: `
      search "${escapedName}";
      fields ${GAME_FIELDS};
      limit 20;
      where cover != null;
    `,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to search IGDB game details: ${response.status} ${errorText}`);
  }

  const games = (await response.json()) as IGDBGame[];
  if (!games.length) {
    return null;
  }

  const normalizedQuery = name.trim().toLowerCase();
  const exactMatch = games.find((game) => game.name.trim().toLowerCase() === normalizedQuery);
  if (exactMatch) {
    return exactMatch;
  }

  const sortedGames = [...games].sort(
    (a, b) => (b.total_rating_count ?? 0) - (a.total_rating_count ?? 0),
  );

  const containsMatch = sortedGames.find((game) => game.name.trim().toLowerCase().includes(normalizedQuery));
  return containsMatch ?? sortedGames[0];
}

export async function fetchRecentReleases(limit = 6): Promise<IGDBGame[]> {
  const token = await getAccessToken();

  const response = await fetch('/api/igdb/games', {
    method: 'POST',
    headers: {
      'Client-ID': IGDB_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body: `
      fields ${GAME_FIELDS};
      where cover != null & first_release_date != null;
      sort first_release_date desc;
      limit ${limit};
    `,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to fetch recent IGDB releases: ${response.status} ${errorText}`);
  }

  return (await response.json()) as IGDBGame[];
}

export function getIGDBImageUrl(coverUrl: string): string {
  // A IGDB retorna URLs como //images.igdb.com/...
  // Normaliza para a maior resolução disponível
  const normalizeCoverSize = (url: string) => {
    return url
      .replace(/t_thumb/gi, 't_1080p')
      .replace(/t_cover_small/gi, 't_1080p')
      .replace(/t_cover_med/gi, 't_1080p')
      .replace(/t_cover_big/gi, 't_1080p')
      .replace(/t_cover_huge/gi, 't_1080p');
  };
  if (coverUrl.startsWith('//')) {
    return normalizeCoverSize(`https:${coverUrl}`);
  }
  if (coverUrl.startsWith('http://') || coverUrl.startsWith('https://')) {
    return normalizeCoverSize(coverUrl);
  }
  // Se for apenas um ID, construir a URL em alta resolução
  const cleanId = coverUrl.replace(/\.jpg$/i, '');
  return `https://images.igdb.com/igdb/image/upload/t_1080p/${cleanId}.jpg`;
}
