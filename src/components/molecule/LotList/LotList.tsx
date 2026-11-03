import './LotList.css';

export interface LotListItem {
  id: string;
  /** What the lot is (bought pack, trial, gift, courtesy…), already in the reader's language. */
  title: string;
  /** Classes left and the expiry, or "no expiry", already in the reader's language. */
  detail: string;
  /** The lot's source key, for styling and tests (`data-lot-source`). */
  source?: string;
}

/**
 * PRO-06 (Jas 1 Nov): the customer's live class lots, one line each: what it is and how many classes are left until when.
 * Text only (names and dates arrive formatted); an empty list renders nothing.
 */
export function LotList({ lots, label }: { lots: LotListItem[]; label?: string }) {
  if (lots.length === 0) return null;
  return (
    <ul className="lot-list" aria-label={label} data-lot-list>
      {lots.map((l) => (
        <li key={l.id} className="lot-list-row" data-lot-source={l.source}>
          <span className="lot-list-title">{l.title}</span>
          <span className="lot-list-detail">{l.detail}</span>
        </li>
      ))}
    </ul>
  );
}
