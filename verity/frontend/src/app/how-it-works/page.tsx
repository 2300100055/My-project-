export default function HowItWorksPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-[36px] font-bold tracking-tight mb-4">How Verity Works</h1>
      <p className="text-text-secondary text-[17px] leading-relaxed mb-12">
        Verity uses a fused pipeline of six independent signals to assess whether content was AI-generated or manipulated. No single signal is conclusive — the combination is what matters.
      </p>

      <div className="space-y-8">
        {[
          {
            num: "01",
            title: "Provenance (C2PA / Content Credentials)",
            desc: "Checks for cryptographically signed Content Credentials (the C2PA open standard). Cameras from Sony, Leica, Nikon, and tools from Adobe attach these. AI generators that sign their output also appear here. Absent credentials are neutral — most images have none.",
          },
          {
            num: "02",
            title: "Metadata Forensics",
            desc: "Inspects EXIF, XMP, and IPTC metadata for AI tool signatures (Stable Diffusion, Midjourney, DALL-E, Firefly…), stripped-metadata flags, and inconsistencies between creation timestamps and edit history.",
          },
          {
            num: "03",
            title: "Error Level Analysis (ELA)",
            desc: "Re-saves the image at 95% JPEG quality and measures the pixel-level difference. Genuine photos show varied error patterns from camera sensor noise. AI-generated images often have unusually uniform error levels across the image.",
          },
          {
            num: "04",
            title: "Spectral / Frequency Analysis",
            desc: "Applies FFT (Fast Fourier Transform) to detect periodic frequency artifacts common in GAN and diffusion-generated images, and measures the noise residual to detect AI smoothing vs. natural camera sensor noise.",
          },
          {
            num: "05",
            title: "ML Classifier",
            desc: "Runs a Vision Transformer (ViT) binary classifier trained to distinguish real vs. AI-generated images. Temperature scaling is applied for well-calibrated confidence estimates. Model: umm-maybe/AI-image-detector (MIT).",
          },
          {
            num: "06",
            title: "Temporal Consistency (Video)",
            desc: "For video, extracts keyframes adaptively (up to 1 fps for short clips), runs the full image pipeline on each frame, then checks for suspicious inter-frame score variance indicating deepfake flicker or stitching artifacts.",
          },
        ].map(({ num, title, desc }) => (
          <div key={num} className="flex gap-6">
            <span className="flex-shrink-0 w-10 h-10 bg-accent/10 text-accent rounded-full flex items-center justify-center font-mono text-[13px] font-semibold">
              {num}
            </span>
            <div>
              <h2 className="text-[17px] font-semibold mb-1">{title}</h2>
              <p className="text-text-secondary text-[15px] leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 card-surface p-6 rounded-card">
        <h2 className="text-[17px] font-semibold mb-3">What Verity Cannot Do</h2>
        <ul className="space-y-2 text-[14px] text-text-secondary list-disc list-inside">
          <li>Detect proprietary watermarks (SynthID requires Google&apos;s detection model — not public)</li>
          <li>Guarantee a correct result — false positives and negatives exist</li>
          <li>Analyze screenshots or heavily re-compressed content reliably</li>
          <li>Replace legal or forensic investigation</li>
        </ul>
      </div>
    </div>
  );
}
