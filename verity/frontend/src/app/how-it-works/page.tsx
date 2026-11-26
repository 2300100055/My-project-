export default function HowItWorksPage() {
  const steps = [
    {
      num: "01",
      title: "Provenance (C2PA / Content Credentials)",
      desc: "Checks for cryptographically signed Content Credentials (the C2PA open standard). Cameras from Sony, Leica, Nikon, and tools from Adobe attach these. Absent credentials are neutral — most images have none.",
    },
    {
      num: "02",
      title: "Metadata Forensics",
      desc: "Inspects EXIF, XMP, and IPTC metadata for AI tool signatures (Stable Diffusion, Midjourney, DALL-E, Firefly), stripped-metadata flags, and inconsistencies between creation timestamps and edit history.",
    },
    {
      num: "03",
      title: "Error Level Analysis (ELA)",
      desc: "Re-saves the image at 95% JPEG quality and measures pixel-level differences. Genuine photos show varied error patterns from camera sensor noise, while AI-generated images often show unusually uniform error levels.",
    },
    {
      num: "04",
      title: "Spectral & Noise Residual Analysis",
      desc: "Applies FFT (Fast Fourier Transform) to detect periodic frequency artifacts common in GAN and diffusion-generated images, and measures high-pass noise residuals to compare against natural camera sensor noise.",
    },
    {
      num: "05",
      title: "ML Classifier",
      desc: "Runs a Vision Transformer (ViT) binary classifier trained to distinguish real vs. AI-generated images, calibrated with temperature scaling (umm-maybe/AI-image-detector, MIT license).",
    },
    {
      num: "06",
      title: "Temporal Consistency (Video)",
      desc: "Extracts keyframes adaptively, runs the image pipeline on each frame, and checks inter-frame score variance for deepfake flicker or stitching artifacts.",
    },
  ];

  return (
    <div className="bg-white min-h-[calc(100vh-56px)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.025em] text-text-primary mb-4">
          How Verity Works
        </h1>
        <p className="text-text-secondary text-[16px] sm:text-[18px] leading-relaxed mb-12">
          Verity fuses six independent forensic signals to assess whether an image or video was AI-generated or manipulated.
        </p>

        <div className="space-y-4">
          {steps.map(({ num, title, desc }) => (
            <div key={num} className="card p-5 sm:p-6 flex gap-4 sm:gap-6 items-start">
              <span className="flex-shrink-0 w-9 h-9 bg-surface text-accent rounded-full flex items-center justify-center font-mono text-[12px] font-semibold">
                {num}
              </span>
              <div>
                <h2 className="text-[16px] sm:text-[17px] font-semibold text-text-primary mb-1">{title}</h2>
                <p className="text-text-secondary text-[14px] sm:text-[15px] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 card-surface p-6 sm:p-8">
          <h2 className="text-[17px] font-semibold text-text-primary mb-3">What Verity Cannot Do</h2>
          <ul className="space-y-2 text-[14px] text-text-secondary list-disc list-inside leading-relaxed">
            <li>Detect proprietary watermarks (SynthID requires Google&apos;s private detection model)</li>
            <li>Guarantee a correct result — false positives and negatives exist</li>
            <li>Analyze screenshots or heavily re-compressed content with high reliability</li>
            <li>Replace formal legal or forensic investigation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
