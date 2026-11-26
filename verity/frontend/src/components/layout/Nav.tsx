"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Analyze" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/privacy", label: "Privacy" },
];

export function Nav() {
  const pathname = usePathname();
  const isAnalyze = pathname === "/" || pathname === "/image" || pathname === "/video";

  return (
    <header className="sticky top-0 z-50 nav-frosted">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold text-[18px] tracking-tight text-text-primary flex-shrink-0"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="9.5" stroke="#2563EB" strokeWidth="1.75" />
            <circle cx="11" cy="11" r="4" fill="#0F172A" />
          </svg>
          <span>OriginLens</span>
        </Link>

        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-1.5 sm:gap-3 list-none">
            {links.map(({ href, label }) => {
              const active = href === "/" ? isAnalyze : pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`px-3.5 py-1.5 rounded-pill text-[13px] sm:text-[14px] font-medium transition-all duration-150 whitespace-nowrap ${
                      active
                        ? "bg-accent text-white"
                        : "bg-white text-text-primary/75 border border-[#1D1D1F]/10 hover:border-accent hover:text-accent"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
