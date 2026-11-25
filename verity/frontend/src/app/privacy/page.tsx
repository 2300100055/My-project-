export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-[36px] font-bold tracking-tight mb-4">Privacy</h1>
      <p className="text-text-secondary text-[17px] mb-10">Plain language. No legal jargon.</p>

      {[
        { q: "What do you store?", a: "Your file is stored under a randomly generated ID for 60 minutes, then permanently deleted. We store your analysis result for the same window." },
        { q: "Do you use my file for training?", a: "Never. Your uploads are never used to train any AI model." },
        { q: "Do you require an account?", a: "No. No login, no email, no account required." },
        { q: "What do you log?", a: "Timestamp, file type, file size (not contents), and a random job ID. No IP addresses in result logs. Logs kept 30 days for security monitoring." },
        { q: "Do you use cookies or trackers?", a: "No tracking cookies, no analytics SDKs, no fingerprinting." },
        { q: "Can I delete my results immediately?", a: "Yes — use the Delete button in the result view, or they auto-delete in 60 minutes." },
        { q: "Can I self-host?", a: "Yes. Run docker compose up --build and your data never leaves your infrastructure." },
      ].map(({ q, a }) => (
        <div key={q} className="mb-8">
          <h2 className="text-[16px] font-semibold mb-1">{q}</h2>
          <p className="text-text-secondary text-[15px] leading-relaxed">{a}</p>
        </div>
      ))}
    </div>
  );
}
