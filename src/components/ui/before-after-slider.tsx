import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc?: string | null;
  /** Rendered over the After side when no afterSrc is provided. */
  afterOverlay?: React.ReactNode;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

/**
 * Interactive before/after slider. Drag the handle (or use ←/→ keys when
 * focused) to reveal the "after" side underneath the "before" image.
 */
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  afterOverlay,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(0, Math.min(100, next)));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      updateFromClientX(x);
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [updateFromClientX]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setPosition((p) => Math.max(0, p - 5));
    if (e.key === 'ArrowRight') setPosition((p) => Math.min(100, p + 5));
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full overflow-hidden rounded-xl border border-border bg-muted select-none',
        'aspect-[4/3]',
        className,
      )}
      onMouseDown={(e) => { draggingRef.current = true; updateFromClientX(e.clientX); }}
      onTouchStart={(e) => { draggingRef.current = true; updateFromClientX(e.touches[0].clientX); }}
    >
      {/* AFTER (full layer underneath) */}
      <div className="absolute inset-0">
        {afterSrc ? (
          <img
            src={afterSrc}
            alt={afterLabel}
            className="w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-accent/5 to-background flex items-center justify-center p-6">
            {afterOverlay}
          </div>
        )}
      </div>

      {/* BEFORE (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Labels */}
      <span className="absolute top-3 left-3 text-xs px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border font-medium">
        {beforeLabel}
      </span>
      <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border font-medium">
        {afterLabel}
      </span>

      {/* Handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-primary cursor-ew-resize"
        style={{ left: `${position}%` }}
      >
        <button
          type="button"
          onKeyDown={handleKey}
          aria-label="Drag to compare"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
            <polyline points="9 18 3 12 9 6" style={{ display: 'none' }} />
          </svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="-ml-1">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
