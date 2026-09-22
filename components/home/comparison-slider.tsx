"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

export function ComparisonSlider() {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPos(percent);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    },
    [handleMove]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging.current) {
        handleMove(e.clientX);
      }
    },
    [handleMove]
  );

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <section className="akiyo-compare-section">
      <div className="akiyo-compare-bg">
        <Image
          src="https://akiyo.co.uk/cdn/shop/files/7_2f22c73f-d49a-4570-94f6-585112436f7b.jpg?v=1784253341&width=3840"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="akiyo-compare-bg-overlay" />
      </div>

      <div className="akiyo-compare-inner">
        <div className="akiyo-compare-copy">
          <h2>See The Difference</h2>
          <p>
            Compare an Akiyo wallpaper with a standard AI-generated image.
            <br />
            <em>Drag the slider</em>
          </p>
        </div>

        <div
          ref={containerRef}
          className="akiyo-comparison-slider"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
        >
          {/* After image (Akiyo authentic impasto - crisp) */}
          <div className="akiyo-comparison-layer akiyo-comparison-layer--after">
            <Image
              src="https://akiyo.co.uk/cdn/shop/files/Screenshot_2026-07-17_at_02.48.28.png?v=1784253185&width=3840"
              alt="Akiyo Impasto Texture"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            <span className="akiyo-comparison-badge akiyo-comparison-badge--after">
              Akiyo 6K
            </span>
          </div>

          {/* Before image (Standard AI - blurry) clipped to sliderPos */}
          <div
            className="akiyo-comparison-layer akiyo-comparison-layer--before"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            <Image
              src="https://akiyo.co.uk/cdn/shop/files/blurry_pic.png?v=1784253214&width=3840"
              alt="Standard AI Image"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            <span className="akiyo-comparison-badge akiyo-comparison-badge--before">
              Standard AI
            </span>
          </div>

          {/* Drag Handle */}
          <div
            className="akiyo-comparison-handle"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="akiyo-comparison-line" />
            <div className="akiyo-comparison-button">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M5.5 3L1 8l4.5 5M10.5 3L15 8l-4.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
          </div>

          {/* Hidden range input for accessibility and easy touch */}
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            aria-label="Comparison slider percentage"
            className="akiyo-comparison-range"
          />
        </div>
      </div>
    </section>
  );
}
