import type { TagInfo } from '../App'

// ── Constants ──────────────────────────────────────────────

export const WINDOWS = [
  { value: '1d', label: '1d' },
  { value: '3d', label: '3d' },
  { value: '1w', label: '1w' },
  { value: '2w', label: '2w' },
  { value: '1m', label: '1m' },
  { value: '3m', label: '3m' },
  { value: '6m', label: '6m' },
  { value: '1y', label: '1y' },
] as const

export const SORT_OPTIONS = [
  { value: 'score', label: 'Hot' },
  { value: 'views', label: 'Views' },
  { value: 'likes', label: 'Likes' },
  { value: 'like%', label: 'Like%' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
] as const

// ── Props ──────────────────────────────────────────────────

type Props = {
  window: string
  onWindowChange: (w: string) => void
  sort: string
  onSortChange: (s: string) => void
}

// ── Inline time + sort (no TopBar wrapper) ─────────────────

export default function TimeSortControls({ window, onWindowChange, sort, onSortChange }: Props) {
  return (
    <div className="flex items-center gap-4">
      {/* Time window buttons */}
      <div className="flex gap-1">
        {WINDOWS.map((w) => (
          <button
            key={w.value}
            onClick={() => onWindowChange(w.value)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              window === w.value
                ? 'bg-white text-black font-medium'
                : 'bg-[#272727] text-white hover:bg-[#3a3a3a]'
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      {/* Sort segmented toggle */}
      <div className="ml-auto flex gap-1 bg-[#1a1a1a] rounded-lg p-0.5">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSortChange(opt.value)}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              sort === opt.value
                ? 'bg-[#272727] text-white font-medium'
                : 'text-[#888] hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}