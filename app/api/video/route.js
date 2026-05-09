export const runtime = 'edge';

function extractVideoId(input) {
  input = input.trim();
  // Plain video ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);
    // youtu.be/VIDEO_ID
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0];
    // youtube.com/shorts/VIDEO_ID
    if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2];
    // youtube.com/watch?v=VIDEO_ID
    const v = url.searchParams.get('v');
    if (v) return v;
  } catch {
    // not a URL
  }
  return null;
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const s = parseInt(seconds, 10);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('url') || '';

  if (!input) {
    return Response.json({ error: 'No URL provided' }, { status: 400 });
  }

  const videoId = extractVideoId(input);
  if (!videoId) {
    return Response.json({ error: 'Could not extract a valid YouTube video ID.' }, { status: 400 });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return Response.json({ error: 'API key not configured. Add RAPIDAPI_KEY to your .env.local' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${videoId}`,
      {
        headers: {
          'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com',
          'x-rapidapi-key': apiKey,
        },
        // Cache for 5 minutes to save API credits
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      return Response.json({ error: `API error: ${res.status} ${res.statusText}` }, { status: res.status });
    }

    const data = await res.json();

    if (!data || data.status === false) {
      return Response.json({ error: data?.errorMessage || 'Video not found or unavailable.' }, { status: 404 });
    }

    // Normalize the response
    const videos = (data.videos?.items || []).map((item) => ({
      quality: item.quality || item.qualityLabel || 'Unknown',
      extension: item.extension || 'mp4',
      size: item.size || null,
      url: item.url,
      hasAudio: item.hasAudio ?? true,
    }));

    const audios = (data.audios?.items || []).map((item) => ({
      quality: item.quality || item.qualityLabel || 'Audio',
      extension: item.extension || 'mp3',
      size: item.size || null,
      url: item.url,
    }));

    return Response.json({
      id: videoId,
      title: data.title,
      thumbnail: data.thumbnail?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: formatDuration(data.lengthSeconds || data.duration),
      channel: data.channel?.name || data.author,
      views: data.viewCount ? Number(data.viewCount).toLocaleString() : null,
      videos,
      audios,
    });
  } catch (err) {
    return Response.json({ error: `Request failed: ${err.message}` }, { status: 500 });
  }
}
