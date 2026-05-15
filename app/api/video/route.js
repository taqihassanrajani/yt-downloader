function extractVideoId(input) {
  input = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0];
    if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2];
    const v = url.searchParams.get('v');
    if (v) return v;
  } catch {}
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

function dedupeByUrl(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('url') || '';

  if (!input)
    return Response.json({ error: 'No URL provided' }, { status: 400 });

  const videoId = extractVideoId(input);
  if (!videoId)
    return Response.json({ error: 'Could not extract a valid YouTube video ID.' }, { status: 400 });

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey)
    return Response.json({ error: 'API key not configured.' }, { status: 500 });

  try {
    const res = await fetch(
      `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${videoId}`,
      {
        headers: {
          'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com',
          'x-rapidapi-key': apiKey,
        },
      }
    );

    if (!res.ok) {
      const msg = res.status === 403
        ? '403 Forbidden — Make sure you are subscribed to the YouTube Media Downloader API on RapidAPI.'
        : `API error: ${res.status} ${res.statusText}`;
      return Response.json({ error: msg }, { status: res.status });
    }

    const data = await res.json();
    if (!data || data.status === false)
      return Response.json({ error: data?.errorMessage || 'Video not found.' }, { status: 404 });

    const allVideos = dedupeByUrl(data.videos?.items || []);
    const allAudios = dedupeByUrl(data.audios?.items || []);

    // Keep only 720p (no audio) and 360p (with audio), prefer mp4
    const TARGET = ['720p', '360p'];
    const videos = TARGET.map(q => {
      const match = allVideos.find(v =>
        v.quality?.includes(q) && (v.extension === 'mp4' || !allVideos.find(x => x.quality?.includes(q) && x.extension === 'mp4'))
      );
      return match ? {
        quality: q,
        extension: match.extension || 'mp4',
        size: match.size || null,
        url: match.url,
        hasAudio: match.hasAudio ?? true,
      } : null;
    }).filter(Boolean);

    // Best single audio — prefer m4a, then weba
    const bestAudio = allAudios.find(a => a.extension === 'm4a') || allAudios[0];
    const audios = bestAudio ? [{
      quality: bestAudio.quality || 'Best Quality',
      extension: bestAudio.extension || 'm4a',
      size: bestAudio.size || null,
      url: bestAudio.url,
    }] : [];

    // Best audio URL for 720p merging (m4a preferred)
    const mergeAudioUrl = bestAudio?.url || null;

    return Response.json({
      id: videoId,
      title: data.title,
      thumbnail: data.thumbnail?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: formatDuration(data.lengthSeconds || data.duration),
      channel: data.channel?.name || data.author,
      views: data.viewCount ? Number(data.viewCount).toLocaleString() : null,
      videos,
      audios,
      mergeAudioUrl,
    });
  } catch (err) {
    return Response.json({ error: `Request failed: ${err.message}` }, { status: 500 });
  }
}