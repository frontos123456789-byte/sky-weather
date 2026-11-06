import { fail, json } from "@/lib/api";
import { getSun, SUN_REVALIDATE } from "@/lib/sun";

export async function GET() {
  try {
    return json(await getSun(), SUN_REVALIDATE);
  } catch {
    return fail("Данные NOAA SWPC о солнечной активности временно недоступны");
  }
}
