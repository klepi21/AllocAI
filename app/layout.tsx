import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  metadataBase: new URL("https://allocai.agent"), // Resolves absolute URL warning
  title: "AllocAI | Autonomous Stablecoin Allocation",
  description: "Autonomous capital allocation agent built on Kite with on-chain proofs and paid intelligence scaling.",
  openGraph: {
    title: "AllocAI | Autonomous Stablecoin Allocation",
    description: "Autonomous capital allocation agent built on Kite.",
    images: ["/og-image.png"],
    url: "https://allocai.agent",
    siteName: "AllocAI",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {children}
        <Toaster 
          theme="dark" 
          position="bottom-right" 
          richColors 
          toastOptions={{
            style: {
              background: 'rgba(15, 15, 15, 0.95)',
              border: '1px solid rgba(179, 162, 136, 0.2)',
              color: '#fff',
              fontSize: '11px',
              fontFamily: 'var(--font-inter)',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              backdropFilter: 'blur(20px)',
              borderRadius: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }
          }}
        />
      </body>
    </html>
  );
}
