import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "LOOM — Lector de libros con voz humana",
  description:
    "Experiencia visual de LOOM: biblioteca moderna con narración en voz humana.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-theme="dark">
      <body
        className={`${inter.variable} bg-background text-foreground antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
