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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-[17px] tracking-tight text-text-primary flex-shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="10" stroke="#0071E3" strokeWidth="1.6" />
            <path d="M6.5 11.5L9.5 14.5L15.5 8.5" stroke="#0071E3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Verity</span>
        </Link>

        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-1 sm:gap-2 list-none">
            {links.map(({ href, label }) => {
              const active = href === "/" ? isAnalyze : pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`px-3 py-1.5 rounded-pill text-[13px] sm:text-[14px] transition-colors duration-150 whitespace-nowrap ${
                      active
                        ? "bg-surface text-text-primary font-medium"
                        : "text-text-secondary hover:text-text-primary"
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
