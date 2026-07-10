import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata = {
  title: "Pastoral Juvenil - Portal de Integrantes",
  description: "Sistema de registro, formularios y calendario para jóvenes del grupo católico Pastoral Juvenil.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${outfit.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
