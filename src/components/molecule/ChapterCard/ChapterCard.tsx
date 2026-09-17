import { Link } from 'react-router-dom';
import './ChapterCard.css';

export interface ChapterCardProps {
  /** Chapter number as written in the file name ('04'). */
  number: string;
  title: string;
  /** One-line front-matter summary. */
  summary?: string;
  /** Role chips — the chapter's `role:` front matter, already split. */
  roles?: string[];
  to: string;
  /** Reading time in minutes. */
  minutes?: number;
  /** Real captures embedded in the chapter. */
  figures?: number;
  /** Pending owner decisions flagged in the chapter. */
  decisions?: number;
  /** Captures the chapter still asks for. */
  placeholders?: number;
  /** Bilingual-agnostic labels for the meta row, supplied by the page. */
  labels?: { minutes: string; figures: string; decisions: string; placeholders: string };
  /** Marks the card as the chapter currently open. */
  active?: boolean;
}

/** One chapter of the operations manual as a card: number, title, summary, role chips and weight. */
export function ChapterCard({ number, title, summary, roles = [], to, minutes, figures, decisions, placeholders, labels, active = false }: ChapterCardProps) {
  return (
    <Link className={`chcard ${active ? 'is-active' : ''}`} to={to}>
      <span className="chcard-num">{number}</span>
      <span className="chcard-body">
        <span className="chcard-title">{title}</span>
        {summary && <span className="chcard-summary">{summary}</span>}
        {roles.length > 0 && <span className="chcard-roles">{roles.map((r) => <span key={r} className="chcard-role">{r}</span>)}</span>}
        <span className="chcard-meta">
          {minutes ? <span>{minutes} {labels?.minutes ?? 'min'}</span> : null}
          {figures ? <span>{figures} {labels?.figures ?? 'img'}</span> : null}
          {decisions ? <span className="chcard-warn">{decisions} {labels?.decisions ?? '!'}</span> : null}
          {placeholders ? <span className="chcard-pending">{placeholders} {labels?.placeholders ?? '□'}</span> : null}
        </span>
      </span>
    </Link>
  );
}
