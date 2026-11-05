import styles from './Chip.module.scss';

/*
 * The one interactive chip: a border and a word, an optional count, and a dot
 * that appears when the chip is in force. Layout belongs to the caller.
 */

export type ChipTone =
  | 'accent'
  | 'retained'
  | 'stored'
  | 'pending'
  | 'downloading'
  | 'failed'
  | 'unavailable';

interface ChipProps {
  readonly label: string;
  readonly count?: number;
  readonly tone?: ChipTone;
  readonly selected?: boolean;
  readonly indicator?: boolean;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
}

export default function Chip({
  label,
  count,
  tone = 'accent',
  selected = false,
  indicator = true,
  disabled = false,
  onClick
}: ChipProps) {
  return (
    <button
      type="button"
      className={styles.chip}
      data-tone={tone}
      aria-pressed={selected}
      aria-label={count === undefined ? label : `${label} ${count}`}
      disabled={disabled}
      onClick={onClick}>
      {indicator ? (
        <span className={styles.chip__indicator} aria-hidden="true" />
      ) : null}
      <span>{label}</span>
      {count === undefined ? null : (
        <span className={styles.chip__count}>{count}</span>
      )}
    </button>
  );
}
