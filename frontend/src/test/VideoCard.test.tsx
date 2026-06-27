import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import VideoCard from '../components/VideoCard'
import type { VideoItem } from '../App'

const mockVideo: VideoItem = {
  youtube_id: 'abc123',
  title: 'Test Video Title',
  channel_id: 'chan1',
  channel_name: 'Test Channel',
  thumbnail_url: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
  published_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2h ago
  view_count: 1_500_000,
  like_count: 75_000,
  duration_seconds: 1234,
  score: 450.5,
}

beforeAll(() => {
  window.open = vi.fn()
})

describe('VideoCard', () => {
  it('renders video title', () => {
    render(<VideoCard video={mockVideo} isHovered={false} onHover={vi.fn()} onChannelClick={vi.fn()} />)
    expect(screen.getByText('Test Video Title')).toBeInTheDocument()
  })

  it('renders channel name', () => {
    render(<VideoCard video={mockVideo} isHovered={false} onHover={vi.fn()} onChannelClick={vi.fn()} />)
    expect(screen.getByText('Test Channel')).toBeInTheDocument()
  })

  it('formats view count in millions', () => {
    render(<VideoCard video={mockVideo} isHovered={false} onHover={vi.fn()} onChannelClick={vi.fn()} />)
    expect(screen.getByText(/1\.5M views/)).toBeInTheDocument()
  })

  it('formats duration correctly', () => {
    render(<VideoCard video={mockVideo} isHovered={false} onHover={vi.fn()} onChannelClick={vi.fn()} />)
    // 1234s = 20:34
    expect(screen.getByText('20:34')).toBeInTheDocument()
  })

  it('shows relative time', () => {
    render(<VideoCard video={mockVideo} isHovered={false} onHover={vi.fn()} onChannelClick={vi.fn()} />)
    expect(screen.getByText(/2h ago/)).toBeInTheDocument()
  })

  it('shows score', () => {
    render(<VideoCard video={mockVideo} isHovered={false} onHover={vi.fn()} onChannelClick={vi.fn()} />)
    expect(screen.getByText(/450\.5/)).toBeInTheDocument()
  })

  it('shows thumbnail when not hovered', () => {
    render(<VideoCard video={mockVideo} isHovered={false} onHover={vi.fn()} onChannelClick={vi.fn()} />)
    const img = screen.getByRole('img', { name: 'Test Video Title' })
    expect(img).toBeVisible()
  })

  it('calls onHover with video id on mouse enter', () => {
    const onHover = vi.fn()
    render(<VideoCard video={mockVideo} isHovered={false} onHover={onHover} onChannelClick={vi.fn()} />)
    fireEvent.mouseEnter(screen.getByRole('img', { name: 'Test Video Title' }).closest('.relative')!)
    expect(onHover).toHaveBeenCalledWith('abc123')
  })

  it('calls onHover with null on mouse leave', () => {
    const onHover = vi.fn()
    render(<VideoCard video={mockVideo} isHovered={false} onHover={onHover} onChannelClick={vi.fn()} />)
    fireEvent.mouseLeave(screen.getByRole('img', { name: 'Test Video Title' }).closest('.relative')!)
    expect(onHover).toHaveBeenCalledWith(null)
  })

  it('opens YouTube on card click', () => {
    render(<VideoCard video={mockVideo} isHovered={false} onHover={vi.fn()} onChannelClick={vi.fn()} />)
    fireEvent.click(screen.getByRole('img', { name: 'Test Video Title' }).closest('.relative')!)
    expect(window.open).toHaveBeenCalledWith('https://www.youtube.com/watch?v=abc123', '_blank')
  })

  it('calls onChannelClick when channel name is clicked', () => {
    const onChannelClick = vi.fn()
    render(<VideoCard video={mockVideo} isHovered={false} onHover={vi.fn()} onChannelClick={onChannelClick} />)
    fireEvent.click(screen.getByText('Test Channel'))
    expect(onChannelClick).toHaveBeenCalledWith('chan1')
  })

  it('shows "Unknown" when channel_name is absent', () => {
    const video = { ...mockVideo, channel_name: undefined }
    render(<VideoCard video={video} isHovered={false} onHover={vi.fn()} onChannelClick={vi.fn()} />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('hides duration badge when duration is 0', () => {
    const video = { ...mockVideo, duration_seconds: 0 }
    render(<VideoCard video={video} isHovered={false} onHover={vi.fn()} onChannelClick={vi.fn()} />)
    // Duration badge shows MM:SS or H:MM:SS — absence of that specific pattern
    expect(screen.queryByText(/^\d+:\d{2}$/)).not.toBeInTheDocument()
  })
})
