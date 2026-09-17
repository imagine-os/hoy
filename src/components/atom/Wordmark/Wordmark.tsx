import { tenant } from '../../../tenant/tenant';
import { useTheme } from '../../../design/ThemeProvider';

/** The hoy wordmark, picking the colourway for the current theme. */
export function Wordmark({ height = 28, variant, className = '' }: { height?: number; variant?: 'blue' | 'cream' | 'yellow' | 'auto'; className?: string }) {
  const { theme } = useTheme();
  const v = !variant || variant === 'auto' ? (theme === 'dark' ? 'cream' : 'blue') : variant;
  return <img className={`wordmark ${className}`} src={tenant.brand.wordmark[v]} alt={tenant.name} style={{ height, width: 'auto' }} />;
}
