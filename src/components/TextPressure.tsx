"use client";

import React, { useEffect, useRef, useState } from "react";

interface TextPressureProps {
  text?: string;
  className?: string;
}

export function TextPressure({ text = "SpotMe", className = "" }: TextPressureProps) {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const containerRef = useRef<HTMLDivElement>(null);
  const charsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const padding = 150;
      
      if (
        e.clientX >= rect.left - padding &&
        e.clientX <= rect.right + padding &&
        e.clientY >= rect.top - padding &&
        e.clientY <= rect.bottom + padding
      ) {
        setMousePos({ x: e.clientX, y: e.clientY });
      } else {
        setMousePos({ x: -1000, y: -1000 });
      }
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className={`flex select-none items-center justify-center ${className}`}>
      {text.split("").map((char, i) => {
        let weight = 700; // default bold for title
        
        if (mounted && mousePos.x !== -1000) {
          const el = charsRef.current[i];
          if (el) {
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dist = Math.sqrt(Math.pow(mousePos.x - centerX, 2) + Math.pow(mousePos.y - centerY, 2));
            
            if (dist < 100) {
              weight = 900 - (dist / 100) * 200; 
            }
          }
        }

        return (
          <span
            key={i}
            ref={(el) => { charsRef.current[i] = el; }}
            style={{
              fontWeight: Math.min(900, Math.max(400, weight)),
              transition: "font-weight 0.15s ease-out, transform 0.15s ease-out, color 0.3s ease",
              display: "inline-block",
              transform: weight > 800 ? "scale(1.1)" : "scale(1)",
              color: weight > 850 ? "var(--color-ruby)" : "inherit"
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </div>
  );
}
