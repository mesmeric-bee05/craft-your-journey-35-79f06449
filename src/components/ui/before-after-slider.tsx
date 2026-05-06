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
  /** Accessible label for the slider region. */
  ariaLabel?: string;
  /** Initial reveal position 0-100 (default 50). */
  initialPosition?: number;
  /** Notified whenever the reveal position changes. */
  onPositionChange?: (position: number) => void;
}

/**
 * Interactive before/after slider with full keyboard a11y.
 * Keyboard: ←/→ ±5, Shift+←/→ ±10, PageUp/PageDown ±25, Home/End jump to ends.
 */
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  afterOverlay,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className,
  ariaLabel = 'Before and after comparison slider',
  initialPosition = 50,
  onPositionChange,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPositionState] = useState(initialPosition);
  const draggingRef = useRef(false);

  const setPosition = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(100, next));
      setPositionState(clamped);
      onPositionChange?.(clamped);
    },
    [onPositionChange],
  );

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition(((clientX - rect.left) / rect.width) * 100);
    },
    [setPosition],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      updateFromClientX(x);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
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
    let delta = 0;
    switch (e.key) {
      case 'ArrowLeft':
        delta = e.shiftKey ? -10 : -5;
        break;
      case 'ArrowRight':
        delta = e.shiftKey ? 10 : 5;
        break;
      case 'PageDown':
        delta = -25;
        break;
      case 'PageUp':
        delta = 25;
        break;
      case 'Home':
        e.preventDefault();
        setPosition(0);
        return;
      case 'End':
        e.preventDefault();
        setPosition(100);
        return;
      default:
        return;
    }
    e.preventDefault();
    setPosition(position + delta);
  };

  const positionRounded = Math.round(position);

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'relative w-full overflow-hidden rounded-xl border border-border bg-muted select-none',
        'aspect-[4/3]',
        className,
      )}
      onMouseDown={(e) => {
        draggingRef.current = true;
        updateFromClientX(e.clientX);
      }}
      onTouchStart={(e) => {
        draggingRef.current = true;
        updateFromClientX(e.touches[0].clientX);
      }}
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
        aria-hidden="true"
      >
        <img
          src={beforeSrc}
          alt=""
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
        className="absolute top-0 bottom-0 w-0.5 bg-primary cursor-ew-resize pointer-events-none"
        style={{ left: `${position}%` }}
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label={`${ariaLabel}. Use left and right arrow keys to compare.`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={positionRounded}
          aria-valuetext={`${positionRounded}% of ${beforeLabel} visible`}
          onKeyDown={handleKey}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center cursor-ew-resize pointer-events-auto focus:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="-ml-1"
            aria-hidden="true"
          >
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </div>
      </div>

      {/* SR-only live announcement */}
      <span className="sr-only" aria-live="polite">
        {positionRounded}% of {beforeLabel} revealed
      </span>
    </div>
  );
}
