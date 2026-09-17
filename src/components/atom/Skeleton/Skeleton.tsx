import './Skeleton.css';

export interface SkeletonProps {
  /** CSS width (default 100%). */
  width?: number | string;
  /** CSS height (default 16px). */
  height?: number | string;
  /** Rounded pill / circle / card corners. */
  shape?: 'text' | 'circle' | 'rect';
  /** Render N stacked lines (text shape). */
  lines?: number;
  className?: string;
}

/** Loading placeholder that shimmers in the surface tone. Never conveys data; aria-hidden. */
export function Skeleton({ width = '100%', height = 16, shape = 'text', lines = 1, className = '' }: SkeletonProps) {
  const style = { width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height };
  if (lines > 1) {
    return (
      <div className={`skeleton-lines ${className}`} aria-hidden>
        {Array.from({ length: lines }, (_, i) => <span key={i} className="skeleton skeleton-text" style={{ ...style, width: i === lines - 1 ? '60%' : style.width }} />)}
      </div>
    );
  }
  return <span className={`skeleton skeleton-${shape} ${className}`} style={style} aria-hidden />;
}

/** Three class-row shaped skeletons — the C-02 loading state from the canvas. */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-rows" aria-hidden aria-busy>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-row">
          <Skeleton shape="circle" width={10} height={10} />
          <Skeleton width={56} height={28} />
          <div className="grow stack-sm"><Skeleton width="70%" height={14} /><Skeleton width="40%" height={12} /></div>
          <Skeleton width={72} height={8} />
        </div>
      ))}
    </div>
  );
}
