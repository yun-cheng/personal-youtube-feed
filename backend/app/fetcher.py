"""
yt-dlp wrapper — fetches subscriptions, channel info, and latest videos.

All calls use yt-dlp's --dump-json mode, which bypasses YouTube Data API quota.
"""

from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from typing import Any

import yt_dlp


def _run_ytdlp(url: str, **extra_opts) -> list[dict[str, Any]]:
    """Run yt-dlp and return parsed JSON output."""
    opts = {
        "quiet": True,
        "extract_flat": "in_playlist",  # fast mode — no per-video metadata
        "dump_single_json": False,
        "ignoreerrors": True,
        "skip_download": True,
    }
    opts.update(extra_opts)

    ydl = yt_dlp.YoutubeDL(opts)
    info = ydl.extract_info(url, download=False)
    if info is None:
        return []

    # yt-dlp returns a playlist-like dict for channel URLs
    if "entries" in info:
        return list(info["entries"])
    return [info]


def fetch_subscriptions(channel_urls: list[str]) -> list[dict[str, Any]]:
    """
    Fetch channel info for a list of YouTube channel URLs/IDs.

    Returns a list of dicts with keys:
        id, title, description, thumbnails, subscriber_count
    """
    channels = []
    for url in channel_urls:
        try:
            info = _run_ytdlp(url, extract_flat=False)
            if info:
                ch = info[0]
                channels.append({
                    "youtube_id": ch.get("id", ""),
                    "title": ch.get("channel", ch.get("title", "")),
                    "description": ch.get("description", ""),
                    "thumbnail_url": ch.get("thumbnail", ""),
                    "subscriber_count": ch.get("subscriber", 0),
                })
        except Exception as e:
            print(f"Error fetching channel {url}: {e}")
    return channels


def fetch_latest_videos(
    channel_url: str,
    max_results: int = 50,
    since: datetime | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch the latest N videos from a channel.

    When `since` is provided, only returns videos published after that time
    (used for incremental refresh).

    Returns list of dicts with keys:
        id, title, description, thumbnail, timestamp (unix),
        view_count, like_count, duration (seconds), webpage_url
    """
    opts: dict[str, Any] = {
        "extract_flat": "in_playlist",
        "playlistend": max_results,
    }
    if since:
        opts["dateafter"] = since.strftime("%Y%m%d")

    try:
        info = _run_ytdlp(channel_url + "/videos", **opts)
    except Exception as e:
        print(f"Error fetching videos for {channel_url}: {e}")
        return []

    videos = []
    for entry in info:
        if not entry or not entry.get("id"):
            continue

        pub_ts = entry.get("timestamp")
        if not pub_ts:
            # try upload_date string YYYYMMDD
            ud = entry.get("upload_date")
            if ud:
                pub_ts = datetime.strptime(ud, "%Y%m%d").replace(tzinfo=timezone.utc).timestamp()

        videos.append({
            "youtube_id": entry["id"],
            "title": entry.get("title", ""),
            "description": entry.get("description", ""),
            "thumbnail_url": entry.get("thumbnail", ""),
            "published_at": pub_ts,
            "view_count": entry.get("view_count", 0),
            "like_count": entry.get("like_count", 0),
            "duration_seconds": entry.get("duration", 0),
            "channel_id": entry.get("channel_id", entry.get("uploader_id", "")),
            "channel_title": entry.get("channel", entry.get("uploader", "")),
        })

    return videos


def fetch_video_details(video_ids: list[str]) -> list[dict[str, Any]]:
    """
    Fetch detailed info (view count, duration, etc.) for specific videos.
    Batches multiple videos in a single yt-dlp call.
    """
    if not video_ids:
        return []

    urls = [f"https://www.youtube.com/watch?v={vid}" for vid in video_ids]
    try:
        ydl = yt_dlp.YoutubeDL({
            "quiet": True,
            "extract_flat": False,
            "skip_download": True,
            "ignoreerrors": True,
            "no_warnings": True,
        })
        info = ydl.extract_info(urls[0], download=False)
        results = []
        entries = [info] if isinstance(info, dict) else (info or [])
        for entry in entries:
            if entry and entry.get("id"):
                results.append({
                    "youtube_id": entry["id"],
                    "view_count": entry.get("view_count", 0),
                    "like_count": entry.get("like_count", 0),
                    "duration_seconds": entry.get("duration", 0),
                    "published_at": datetime.fromtimestamp(entry["timestamp"], tz=timezone.utc)
                        if entry.get("timestamp") else None,
                })

        # Process remaining URLs one at a time (yt-dlp API doesn't accept lists)
        for url in urls[1:]:
            try:
                info = ydl.extract_info(url, download=False)
                if info and info.get("id"):
                    results.append({
                        "youtube_id": info["id"],
                        "view_count": info.get("view_count", 0),
                        "like_count": info.get("like_count", 0),
                        "duration_seconds": info.get("duration", 0),
                        "published_at": datetime.fromtimestamp(info["timestamp"], tz=timezone.utc)
                            if info.get("timestamp") else None,
                    })
            except Exception:
                pass
        return results
    except Exception as e:
        print(f"Error fetching video details: {e}")
        return []