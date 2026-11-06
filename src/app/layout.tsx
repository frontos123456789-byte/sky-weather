import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Небесная погода — погода, Солнце, Луна и геомагнитное поле",
  description:
    "Погода на 7 дней, солнечная активность, фаза и положение Луны, Kp-индекс и прогноз магнитных бурь. Open-Meteo и NOAA SWPC.",
};

export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <body className="bg-slate-950 text-slate-200 antialiased">{children}</body>
    </html>
  );
}
