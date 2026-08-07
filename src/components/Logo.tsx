import * as React from "react";

export function Logo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M11 4 3 16l8 12"
        stroke="currentColor"
        className="text-electric"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 4l8 12-8 12"
        stroke="currentColor"
        className="text-electric"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="6.5" stroke="#f4f1ea" strokeWidth="2" />
      <circle cx="16" cy="16" r="2.2" fill="#0055ff" />
    </svg>
  );
}