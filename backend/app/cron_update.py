"""
Cron job: fetch latest videos for all channels using yt-dlp, upsert into DB.

Run:  cd /Users/zeke/personal-youtube-feed/backend
      source .venv/bin/activate
      python -m app.cron_update
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone, timedelta

from sqlalchemy import select

from app.database import async_session, init_db
from app.models import Channel, Video
from app.fetcher import fetch_latest_videos, fetch_video_details


YOUTUBE_THUMB = "https://i.ytimg.com/vi/{vid}/mqdefault.jpg"


def _publication_time(entry: dict) -> datetime:
    """Extract publication time from a yt-dlp entry."""
    ts = entry.get("published_at") or entry.get("timestamp")
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts, tz=timezone.utc)
    return datetime.now(timezone.utc)


async def _update_view_counts(video_ids: list[str]):
    """Batch-fetch view counts via yt-dlp and update DB."""
    if not video_ids:
        return
    details = fetch_video_details(video_ids)
    if not details:
        return

    async with async_session() as session:
        for det in details:
            existing = await session.execute(
                select(Video).where(Video.youtube_id == det["youtube_id"])
            )
            v = existing.scalar_one_or_none()
            if v:
                v.view_count = det.get("view_count", v.view_count)
                v.like_count = det.get("like_count", v.like_count)
                v.duration_seconds = det.get("duration_seconds", v.duration_seconds)
                if det.get("published_at"):
                    v.published_at = det["published_at"]
        await session.commit()
    print(f"  [views] Updated {len(details)} video stats")


async def update_channel_videos(
    channel: Channel,
    since: datetime | None = None,
) -> int:
    """Fetch and upsert videos for one channel. Returns count."""
    url = f"https://www.youtube.com/channel/{channel.youtube_id}"
    videos_data = fetch_latest_videos(url, max_results=50, since=since)

    if not videos_data:
        return 0

    new_ids = []
    count = 0
    async with async_session() as session:
        for v in videos_data:
            pub = _publication_time(v)
            vid = v.get("youtube_id")
            if not vid:
                continue

            existing = await session.execute(
                select(Video).where(Video.youtube_id == vid)
            )
            exists = existing.scalar_one_or_none()
            thumb = v.get("thumbnail_url") or YOUTUBE_THUMB.format(vid=vid)
            if exists:
                exists.view_count = v.get("view_count", exists.view_count)
                exists.like_count = v.get("like_count", exists.like_count)
                exists.thumbnail_url = exists.thumbnail_url or thumb
                exists.last_updated = datetime.now(timezone.utc)
            else:
                session.add(Video(
                    youtube_id=vid,
                    channel_id=channel.youtube_id,
                    title=v.get("title", ""),
                    description=v.get("description", ""),
                    thumbnail_url=thumb,
                    published_at=pub,
                    duration_seconds=v.get("duration_seconds", 0),
                    view_count=v.get("view_count", 0),
                    like_count=v.get("like_count", 0),
                    last_updated=datetime.now(timezone.utc),
                ))
                new_ids.append(vid)
            count += 1

        channel.last_video_fetched = datetime.now(timezone.utc)
        await session.commit()

    # Batch-update view counts for newly inserted videos
    if new_ids:
        await _update_view_counts(new_ids)

    return count


async def run_update():
    """Main cron task: update all channels."""
    await init_db()

    async with async_session() as session:
        result = await session.execute(select(Channel))
        channels = result.scalars().all()

    total = 0
    for ch in channels:
        # Only fetch last 1 year for initial, or incremental since last fetch
        since = None
        if ch.last_video_fetched:
            since = ch.last_video_fetched - timedelta(hours=12)  # small overlap

        try:
            count = await update_channel_videos(ch, since=since)
            total += count
            print(f"  [{ch.title[:30]:30s}] {count:3d} videos")
        except Exception as e:
            print(f"  [ERROR] {ch.title}: {e}")

    print(f"\nDone. {total} videos updated across {len(channels)} channels.")


if __name__ == "__main__":
    asyncio.run(run_update())