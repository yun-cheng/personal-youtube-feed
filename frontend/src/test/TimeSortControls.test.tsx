import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TimeSortControls, { WINDOWS, SORT_OPTIONS, CHANNEL_SORT_OPTIONS } from '../components/TimeSortControls'

describe('TimeSortControls — feed variant', () => {
  const defaultProps = {
    variant: 'feed' as const,
    window: '3d',
    onWindowChange: vi.fn(),
    sort: 'likes',
    onSortChange: vi.fn(),
    timeMode: 'wide',
    onTimeModeChange: vi.fn(),
  }

  it('renders all time window buttons', () => {
    render(<TimeSortControls {...defaultProps} />)
    for (const w of WINDOWS) {
      expect(screen.getByRole('button', { name: w.label })).toBeInTheDocument()
    }
  })

  it('renders Narrow and Wide toggle buttons', () => {
    render(<TimeSortControls {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Narrow' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Wide' })).toBeInTheDocument()
  })

  it('renders all sort option buttons', () => {
    render(<TimeSortControls {...defaultProps} />)
    for (const opt of SORT_OPTIONS) {
      expect(screen.getByRole('button', { name: opt.label })).toBeInTheDocument()
    }
  })

  it('calls onWindowChange when a window button is clicked', () => {
    const onWindowChange = vi.fn()
    render(<TimeSortControls {...defaultProps} onWindowChange={onWindowChange} />)
    fireEvent.click(screen.getByRole('button', { name: '1w' }))
    expect(onWindowChange).toHaveBeenCalledWith('1w')
  })

  it('calls onSortChange when a sort button is clicked', () => {
    const onSortChange = vi.fn()
    render(<TimeSortControls {...defaultProps} onSortChange={onSortChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hot' }))
    expect(onSortChange).toHaveBeenCalledWith('score')
  })

  it('calls onTimeModeChange when Narrow is clicked', () => {
    const onTimeModeChange = vi.fn()
    render(<TimeSortControls {...defaultProps} onTimeModeChange={onTimeModeChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Narrow' }))
    expect(onTimeModeChange).toHaveBeenCalledWith('narrow')
  })

  it('calls onTimeModeChange when Wide is clicked', () => {
    const onTimeModeChange = vi.fn()
    render(<TimeSortControls {...defaultProps} timeMode="narrow" onTimeModeChange={onTimeModeChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Wide' }))
    expect(onTimeModeChange).toHaveBeenCalledWith('wide')
  })

  it('highlights selected window button in narrow mode', () => {
    render(<TimeSortControls {...defaultProps} window="1w" timeMode="narrow" />)
    const btn = screen.getByRole('button', { name: '1w' })
    expect(btn.className).toMatch(/bg-white/)
  })

  it('highlights buttons up to selected window in wide mode', () => {
    render(<TimeSortControls {...defaultProps} window="1w" timeMode="wide" />)
    // 1d, 3d, 1w should be highlighted; 2w onward should not
    expect(screen.getByRole('button', { name: '1d' }).className).toMatch(/bg-white/)
    expect(screen.getByRole('button', { name: '2w' }).className).not.toMatch(/bg-white/)
  })
})

describe('TimeSortControls — channels variant', () => {
  it('renders channel sort options only', () => {
    render(<TimeSortControls variant="channels" sort="subs" onSortChange={vi.fn()} />)
    for (const opt of CHANNEL_SORT_OPTIONS) {
      expect(screen.getByRole('button', { name: opt.label })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: '1d' })).not.toBeInTheDocument()
  })

  it('calls onSortChange when A-Z is clicked', () => {
    const onSortChange = vi.fn()
    render(<TimeSortControls variant="channels" sort="subs" onSortChange={onSortChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'A-Z' }))
    expect(onSortChange).toHaveBeenCalledWith('alpha')
  })
})
