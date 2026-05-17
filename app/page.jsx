'use client';

import { useState, useRef } from 'react';

const VideoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
  </svg>
);
const MusicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

function formatSize(bytes) {
  if (!bytes) return null;
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}

export default function Home() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [mergeState, setMergeState] = useState({ active: false, progress: 0, label: '' });
  const ffmpegRef = useRef(null);

  async function handleFetch() {
    if (!input.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch(`/api/video?url=${encodeURIComponent(input.trim())}`);
      const data = await res.json();
      if (!res.ok || data.error) setError(data.error || 'Something went wrong.');
      else setResult(data);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  }

  // Client-side merge with ffmpeg.wasm (no server, no COEP headers needed with single-thread core)
  async function handleMerge720p(videoUrl, audioUrl, title) {
  setError('');
  setMergeState({ active: true, progress: 5, label: 'Loading ffmpeg…' });
  try {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

    if (!ffmpegRef.current) {
      const ff = new FFmpeg();
      ff.on('log', ({ message }) => console.log('[ffmpeg]', message));
      ff.on('progress', ({ progress }) => {
        setMergeState(s => ({
          ...s,
          progress: Math.min(95, 50 + Math.round(progress * 45)),
          label: 'Merging…',
        }));
      });

      // Single-threaded core — no SharedArrayBuffer needed
      const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ff.load({
        coreURL:  await toBlobURL(`${base}/ffmpeg-core.js`,   'text/javascript'),
        wasmURL:  await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegRef.current = ff;
    }

    const ff = ffmpegRef.current;

    // Use our proxy to avoid YouTube CORS restrictions
    const proxyVideo = `/api/proxy?url=${encodeURIComponent(videoUrl)}`;
    const proxyAudio = `/api/proxy?url=${encodeURIComponent(audioUrl)}`;

    setMergeState({ active: true, progress: 15, label: 'Downloading video…' });
    await ff.writeFile('v.mp4', await fetchFile(proxyVideo));

    setMergeState({ active: true, progress: 40, label: 'Downloading audio…' });
    await ff.writeFile('a.m4a', await fetchFile(proxyAudio));

    setMergeState({ active: true, progress: 52, label: 'Merging…' });
    await ff.exec(['-i', 'v.mp4', '-i', 'a.m4a', '-c:v', 'copy', '-c:a', 'aac', '-shortest', 'out.mp4']);

    setMergeState({ active: true, progress: 97, label: 'Preparing download…' });
    const fileData = await ff.readFile('out.mp4');
    const blob = new Blob([fileData.buffer], { type: 'video/mp4' });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = `${(title || 'video').slice(0, 60)}-720p.mp4`;
    a.click();
    URL.revokeObjectURL(dlUrl);

    await ff.deleteFile('v.mp4').catch(() => {});
    await ff.deleteFile('a.m4a').catch(() => {});
    await ff.deleteFile('out.mp4').catch(() => {});

    setMergeState({ active: true, progress: 100, label: 'Done! ✓' });
    setTimeout(() => setMergeState({ active: false, progress: 0, label: '' }), 2500);

  } catch (err) {
    console.error('Merge error:', err);
    setError('Merge failed: ' + (err?.message || String(err) || 'Unknown error — check browser console'));
    setMergeState({ active: false, progress: 0, label: '' });
  }
}

  const video720 = result?.videos?.find(v => v.quality === '720p');
  const video360 = result?.videos?.find(v => v.quality === '360p');
  const audio    = result?.audios?.[0];

  return (
    <>
      <header>
        <div className="container">
          <div className="header">
            <div className="logo">
              <div className="logo-icon">
                <svg viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
              </div>
              <span className="logo-text">YT<span>Grab</span></span>
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="container">
          <div className="hero">
            <h1>Download <span>YouTube</span><br />Videos & Audio</h1>
            <p>Paste any YouTube link and grab it in your preferred quality.</p>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
              autoFocus
            />
            <button className="btn-fetch" onClick={handleFetch} disabled={loading || !input.trim()}>
              {loading ? 'Fetching…' : 'Get Links'}
            </button>
          </div>
          <p className="hint">Works with youtube.com, youtu.be, and Shorts links</p>

          {error && <div className="error-box">⚠ {error}</div>}
          {loading && <div className="loading-wrap"><div className="spinner" /><span>Fetching video info…</span></div>}

          {result && !loading && (
            <div className="result-card">
              {/* Video info */}
              <div className="video-info">
                <div className="thumbnail-wrap">
                  <img src={result.thumbnail} alt={result.title} />
                  {result.duration && <span className="duration-badge">{result.duration}</span>}
                </div>
                <div className="video-meta">
                  <h2>{result.title}</h2>
                  <div className="meta-row">
                    {result.channel  && <span className="meta-tag">📺 {result.channel}</span>}
                    {result.views    && <span className="meta-tag">👁 {result.views}</span>}
                    {result.duration && <span className="meta-tag">⏱ {result.duration}</span>}
                  </div>
                </div>
              </div>

              <div className="section-label"><span>Download</span></div>
              <div className="download-list">

                {/* 720p — browser merge */}
                {video720 && result.mergeAudioUrl && (
                  <div className="download-item">
                    <div className="item-info">
                      <div className="item-icon video"><VideoIcon /></div>
                      <div>
                        <div className="item-label">720p HD — MP4 <span className="inline-badge">Full Video + Audio</span></div>
                        <div className="item-sub">MP4{video720.size ? ` · ${formatSize(video720.size)}` : ''}</div>
                      </div>
                    </div>
                    {mergeState.active ? (
                      <div className="merge-progress-wrap">
                        <div className="merge-bar">
                          <div className="merge-fill" style={{ width: mergeState.progress + '%' }} />
                        </div>
                        <span className="merge-label">{mergeState.label} {mergeState.progress < 100 ? mergeState.progress + '%' : '✓'}</span>
                      </div>
                    ) : (
                      <button
                        className="btn-dl"
                        onClick={() => handleMerge720p(video720.url, result.mergeAudioUrl, result.title)}
                      >
                        <DownloadIcon /> Download
                      </button>
                    )}
                  </div>
                )}

                {/* 360p — direct single file */}
                {video360 && (
                  <div className="download-item">
                    <div className="item-info">
                      <div className="item-icon video"><VideoIcon /></div>
                      <div>
                        <div className="item-label">360p — MP4 <span className="inline-badge">Ready to Play</span></div>
                        <div className="item-sub">MP4{video360.size ? ` · ${formatSize(video360.size)}` : ''}</div>
                      </div>
                    </div>
                    <a className="btn-dl" href={video360.url} target="_blank" rel="noopener noreferrer" download>
                      <DownloadIcon /> Download
                    </a>
                  </div>
                )}

                {/* Audio MP3 */}
                {audio && (
                  <div className="download-item">
                    <div className="item-info">
                      <div className="item-icon audio"><MusicIcon /></div>
                      <div>
                        <div className="item-label">Audio — MP3</div>
                        <div className="item-sub">{audio.extension?.toUpperCase()}{audio.size ? ` · ${formatSize(audio.size)}` : ''}</div>
                      </div>
                    </div>
                    <a className="btn-dl audio-dl" href={audio.url} target="_blank" rel="noopener noreferrer" download>
                      <DownloadIcon /> Download
                    </a>
                  </div>
                )}

                {!video720 && !video360 && !audio && (
                  <div className="no-formats">No downloadable formats found.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer>
        <div className="container">
          <p className="footer">For personal use only · Respect copyright · Powered by RapidAPI</p>
        </div>
      </footer>
    </>
  );
}