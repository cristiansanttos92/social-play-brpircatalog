type GoogleTranslateResponse = Array<
  Array<[string, string, unknown, unknown?]> | string | unknown
>;

async function translateText(text: string, targetLanguage = "pt-BR"): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", targetLanguage);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", trimmed);

  const response = await fetch(url.toString(), {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Falha ao traduzir texto: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as GoogleTranslateResponse;
  const segments = Array.isArray(data[0]) ? data[0] : [];

  return segments
    .map((segment) => (Array.isArray(segment) ? segment[0] : ""))
    .join("")
    .trim();
}

export async function translateGameTexts(input: {
  summary?: string | null;
  storyline?: string | null;
}) {
  const [summary, storyline] = await Promise.all([
    input.summary ? translateText(input.summary) : Promise.resolve(""),
    input.storyline ? translateText(input.storyline) : Promise.resolve(""),
  ]);

  return {
    summary_pt: summary || null,
    storyline_pt: storyline || null,
  };
}
