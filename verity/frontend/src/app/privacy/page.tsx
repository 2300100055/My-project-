export default function PrivacyPage() {
  const items = [
    { q: "What do you store?", a: "Your file is stored under a randomly generated ID for 60 minutes, then permanently deleted along with its analysis result." },
    { q: "Do you use my file for training?", a: "Never. Your uploads are never used to train any AI model." },
    { q: "Do you require an account?", a: "No. No login, no email, and no account required." },
    { q: "What do you log?", a: "Timestamp, file type, file size (never file contents), and a random job ID. No IP addresses in result logs." },
    { q: "Do you use cookies or trackers?", a: "No tracking cookies, no analytics SDKs, and no fingerprinting." },
    { q: "Can I delete my results immediately?", a: "Yes — click Delete My Results in the result view, or wait 60 minutes for automatic deletion." },
    { q: "Can I self-host?", a: "Yes. Run docker compose up --build and your data never leaves your own infrastructure." },
  ];

  return (
    <div className="bg-white min-h-[calc(100vh-56px)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.025em] text-text-primary mb-3">
          Privacy
        </h1>
        <p className="text-text-secondary text-[16px] sm:text-[18px] mb-10">
          Plain language. No legal jargon.
        </p>

        <div className="divide-y divide-black/[0.06] border-t border-b border-black/[0.06]">
          {items.map(({ q, a }) => (
            <div key={q} className="py-6">
              <h2 className="text-[16px] font-semibold text-text-primary mb-1.5">{q}</h2>
              <p className="text-text-secondary text-[14px] sm:text-[15px] leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
