'use client';

import { useState } from 'react';

// ── Icons ───────────────────────────────────────────────────────────────────

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const VideoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const MusicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes) {
  if (!bytes) return null;
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Home() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleFetch() {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const res = await fetch(`/api/video?url=${encodeURIComponent(input.trim())}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong.');
      } else {
        setResult(data);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleFetch();
  }

  // Separate videos with audio vs video-only
  const videoWithAudio = result?.videos?.filter((v) => v.hasAudio !== false) || [];
  const videoOnly = result?.videos?.filter((v) => v.hasAudio === false) || [];
  const audios = result?.audios || [];

  return (
    <>
      {/* Header */}
      <header>
        <div className="container">
          <div className="header">
            <div className="logo">
              <div className="logo-icon">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
              <span className="logo-text">YT<span>Grab</span></span>
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="container">
          {/* Hero */}
          <div className="hero">
            <h1>Download <span>YouTube</span><br />Videos & Audio</h1>
            <p>Paste any YouTube link and grab it in your preferred quality.</p>
          </div>

          {/* Search */}
          <div className="search-box">
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              autoFocus
            />
            <button
              className="btn-fetch"
              onClick={handleFetch}
              disabled={loading || !input.trim()}
            >
              {loading ? 'Fetching…' : 'Get Links'}
            </button>
          </div>

          <p className="hint">Works with youtube.com, youtu.be, and Shorts links</p>

          {/* Error */}
          {error && <div className="error-box">⚠ {error}</div>}

          {/* Loading */}
          {loading && (
            <div className="loading-wrap">
              <div className="spinner" />
              <span>Fetching video info…</span>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="result-card">
              {/* Video Info */}
              <div className="video-info">
                <div className="thumbnail-wrap">
                  <img src={result.thumbnail} alt={result.title} />
                  {result.duration && (
                    <span className="duration-badge">{result.duration}</span>
                  )}
                </div>
                <div className="video-meta">
                  <h2>{result.title}</h2>
                  <div className="meta-row">
                    {result.channel && (
                      <span className="meta-tag">📺 {result.channel}</span>
                    )}
                    {result.views && (
                      <span className="meta-tag">👁 {result.views}</span>
                    )}
                    {result.duration && (
                      <span className="meta-tag">⏱ {result.duration}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Video + Audio formats */}
              {videoWithAudio.length > 0 && (
                <>
                  <div className="section-label">Video (with Audio)</div>
                  <div className="download-list">
                    {videoWithAudio.map((v, i) => (
                      <div className="download-item" key={i}>
                        <div className="item-info">
                          <div className="item-icon video"><VideoIcon /></div>
                          <div>
                            <div className="item-label">{v.quality}</div>
                            <div className="item-sub">
                              {v.extension?.toUpperCase()}
                              {v.size ? ` · ${formatSize(v.size)}` : ''}
                            </div>
                          </div>
                        </div>
                        <a className="btn-dl" href={v.url} target="_blank" rel="noopener noreferrer" download>
                          <DownloadIcon /> Download
                        </a>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Video only (no audio) */}
              {videoOnly.length > 0 && (
                <>
                  <div className="section-label">Video Only (no audio)</div>
                  <div className="download-list">
                    {videoOnly.map((v, i) => (
                      <div className="download-item" key={i}>
                        <div className="item-info">
                          <div className="item-icon video"><VideoIcon /></div>
                          <div>
                            <div className="item-label">{v.quality}</div>
                            <div className="item-sub">
                              {v.extension?.toUpperCase()}
                              {v.size ? ` · ${formatSize(v.size)}` : ''}
                            </div>
                          </div>
                        </div>
                        <a className="btn-dl" href={v.url} target="_blank" rel="noopener noreferrer" download>
                          <DownloadIcon /> Download
                        </a>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Audio */}
              {audios.length > 0 && (
                <>
                  <div className="section-label">Audio Only</div>
                  <div className="download-list">
                    {audios.map((a, i) => (
                      <div className="download-item" key={i}>
                        <div className="item-info">
                          <div className="item-icon audio"><MusicIcon /></div>
                          <div>
                            <div className="item-label">{a.quality}</div>
                            <div className="item-sub">
                              {a.extension?.toUpperCase()}
                              {a.size ? ` · ${formatSize(a.size)}` : ''}
                            </div>
                          </div>
                        </div>
                        <a className="btn-dl" href={a.url} target="_blank" rel="noopener noreferrer" download>
                          <DownloadIcon /> Download
                        </a>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {videoWithAudio.length === 0 && videoOnly.length === 0 && audios.length === 0 && (
                <div className="no-formats">
                  No downloadable formats found for this video.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer>
        <div className="container">
          <p className="footer">
            For personal use only · Respect copyright · Powered by RapidAPI
          </p>
        </div>
      </footer>
    </>
  );
}
