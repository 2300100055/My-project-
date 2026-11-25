import type { Metadata } from "next";
import "@/styles/globals.css";
import { Nav } from "@/components/layout/Nav";
import { Providers } from "@/components/layout/Providers";

export const metadata: Metadata = {
  title: "Verity — AI Content Authenticity Analyzer",
  description:
    "Upload an image or video to receive an honest, explainable, multi-signal assessment of whether it was AI-generated or manipulated. No login required.",
  keywords: ["AI detection", "deepfake", "image forensics", "authenticity", "C2PA"],
  openGraph: {
    title: "Verity — AI Content Authenticity Analyzer",
    description: "Honest, explainable analysis. No login required.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Nav />
          <main id="main-content">{children}</main>
          <footer className="border-t border-black/8 mt-24 py-8 text-center text-sm text-text-secondary">
            <p>
              Verity is an informational tool. Results are never certain. &ldquo;Not detected&rdquo; never means &ldquo;authentic.&rdquo;
            </p>
            <p className="mt-1">
              <a href="/privacy" className="text-accent hover:underline">Privacy</a>
              {" · "}
              <a href="/how-it-works" className="text-accent hover:underline">How It Works</a>
              {" · "}
              <a href="https://github.com/2300100055/My-project-" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">GitHub</a>
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
