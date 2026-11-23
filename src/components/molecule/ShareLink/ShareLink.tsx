import { useState } from 'react';
import { Button } from '../../atom/Button/Button';
import { Input } from '../../atom/Input/Input';
import { copyLink } from './copyLink';

export interface ShareLinkLabels { link: string; copy: string; copied: string; failed: string }

/**
 * A link to share and a Copy button. The clipboard write runs in the click handler (browsers allow it only there); a
 * refused write says so, and the link stays selectable in its field to copy by hand.
 */
export function ShareLink({ url, labels, disabled = false }: { url: string; labels: ShareLinkLabels; disabled?: boolean }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = () => { void copyLink(url).then(setState); };
  return (
    <div className="stack-sm" data-share-link>
      <div className="row wrap">
        <Input readOnly aria-label={labels.link} value={url} onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" size="sm" variant="secondary" icon="copy" disabled={disabled} onClick={copy}>{labels.copy}</Button>
      </div>
      {state !== 'idle' && <p className="xs muted" role="status" aria-live="polite">{state === 'copied' ? labels.copied : labels.failed}</p>}
    </div>
  );
}
