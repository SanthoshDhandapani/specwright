export function SpecwrightLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 69 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Specwright logo"
      className={className}
    >
      {/* Waveform bars — left to right, center-aligned vertically */}
      <rect x="0"  y="16" width="6" height="8"  rx="3" fill="white" />
      <rect x="9"  y="10" width="6" height="20" rx="3" fill="white" />
      <rect x="18" y="5"  width="6" height="30" rx="3" fill="white" />
      <rect x="27" y="0"  width="6" height="40" rx="3" fill="white" />
      <rect x="36" y="2"  width="6" height="36" rx="3" fill="white" />
      <rect x="45" y="8"  width="6" height="24" rx="3" fill="white" />
      <rect x="54" y="13" width="6" height="14" rx="3" fill="white" />
      <rect x="63" y="17" width="6" height="6"  rx="3" fill="white" />
    </svg>
  );
}
