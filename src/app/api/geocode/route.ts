import { fail, json } from "@/lib/api";
import { searchCities } from "@/lib/weather";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return json({ results: [] }, 3600);
  if (q.length > 80) return fail("Слишком длинный запрос", 400);
  try {
    return json({ results: await searchCities(q) }, 3600);
  } catch {
    return fail("Поиск городов временно недоступен");
  }
}
