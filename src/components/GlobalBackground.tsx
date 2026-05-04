"use client";

export function GlobalBackground() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none bg-black">
      {/* Subtle overlay gradients for depth, without grainient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black" />
    </div>
  );
}
