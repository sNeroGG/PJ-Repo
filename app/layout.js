import { Outfit } from "next/font/google";
import "./globals.css";
import { branding } from "../lib/branding";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata = {
  title: branding.metadataTitle,
  description: branding.metadataDescription,
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
