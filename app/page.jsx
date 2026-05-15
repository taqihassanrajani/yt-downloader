'use client';

import { useState } from 'react';

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
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const QUALITY_ORDER = ['2160p','1440p','1080p','720p','480p','360p','240p','144p'];
function qualityRank(q = '') {
  const match = q.match(/(\d+)p/);
  if (!match) return 999;
  return QUALITY_ORDER.indexOf(`${parseInt(match[1])}p`);
}

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
  const [showMergeHint, setShowMergeHint] = useState(false);

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

  const sortedVideos = [...(result?.videos || [])].sort((a, b) => qualityRank(a.quality) - qualityRank(b.quality));
  const videoWithAudio = sortedVideos.filter(v => v.hasAudio !== false);
  const videoOnly = sortedVideos.filter(v => v.hasAudio === false);
  const audios = result?.audios || [];
  const bestAudio = audios[0] || null;

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
              <div className="video-info">
                <div className="thumbnail-wrap">
                  <img src={result.thumbnail} alt={result.title} />
                  {result.duration && <span className="duration-badge">{result.duration}</span>}
                </div>
                <div className="video-meta">
                  <h2>{result.title}</h2>
                  <div className="meta-row">
                    {result.channel && <span className="meta-tag">📺 {result.channel}</span>}
                    {result.views && <span className="meta-tag">👁 {result.views}</span>}
                    {result.duration && <span className="meta-tag">⏱ {result.duration}</span>}
                  </div>
                </div>
              </div>

              {/* HIGH QUALITY — video-only streams paired with audio */}
              {videoOnly.length > 0 && (
                <>
                  <div className="section-label">
                    <span>High Quality — 720p / 1080p+</span>
                    <button className="info-btn" onClick={() => setShowMergeHint(h => !h)} title="How to merge?">
                      <InfoIcon /> How to merge?
                    </button>
                  </div>

                  {showMergeHint && (
                    <div className="merge-hint">
                      <strong>📌 Why two downloads?</strong> YouTube separates 720p+ video from audio. Download <em>both</em> files, then merge them free online:<br />
                      <a href="https://www.veed.io/tools/video-merger" target="_blank" rel="noopener noreferrer">→ VEED.io merger</a>
                      &nbsp;·&nbsp;
                      <a href="https://clideo.com/merge-video" target="_blank" rel="noopener noreferrer">→ Clideo</a>
                      &nbsp;·&nbsp;
                      Or use VLC: <em>Media → Convert/Save → Add both files → Profile: MP4</em>
                    </div>
                  )}

                  <div className="download-list">
                    {videoOnly.map((v, i) => (
                      <div key={i} className="hq-block">
                        <div className="hq-label">
                          <span className="quality-badge">{v.quality}</span>
                          <span className="hq-note">Download both ↓ then merge</span>
                        </div>
                        <div className="hq-row">
                          <div className="download-item hq-item">
                            <div className="item-info">
                              <div className="item-icon video"><VideoIcon /></div>
                              <div>
                                <div className="item-label">{v.quality} Video</div>
                                <div className="item-sub">{v.extension?.toUpperCase()}{v.size ? ` · ${formatSize(v.size)}` : ''}</div>
                              </div>
                            </div>
                            <a className="btn-dl" href={v.url} target="_blank" rel="noopener noreferrer" download>
                              <DownloadIcon /> Video
                            </a>
                          </div>
                          {bestAudio && (
                            <div className="download-item hq-item">
                              <div className="item-info">
                                <div className="item-icon audio"><MusicIcon /></div>
                                <div>
                                  <div className="item-label">Best Audio</div>
                                  <div className="item-sub">{bestAudio.extension?.toUpperCase()}{bestAudio.size ? ` · ${formatSize(bestAudio.size)}` : ''}</div>
                                </div>
                              </div>
                              <a className="btn-dl audio-dl" href={bestAudio.url} target="_blank" rel="noopener noreferrer" download>
                                <DownloadIcon /> Audio
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* READY TO PLAY */}
              {videoWithAudio.length > 0 && (
                <>
                  <div className="section-label"><span>Ready to Play — Video + Audio</span></div>
                  <div className="download-list">
                    {videoWithAudio.map((v, i) => (
                      <div className="download-item" key={i}>
                        <div className="item-info">
                          <div className="item-icon video"><VideoIcon /></div>
                          <div>
                            <div className="item-label">{v.quality}</div>
                            <div className="item-sub">{v.extension?.toUpperCase()}{v.size ? ` · ${formatSize(v.size)}` : ''}</div>
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

              {/* AUDIO ONLY */}
              {audios.length > 0 && (
                <>
                  <div className="section-label"><span>Audio Only</span></div>
                  <div className="download-list">
                    {audios.map((a, i) => (
                      <div className="download-item" key={i}>
                        <div className="item-info">
                          <div className="item-icon audio"><MusicIcon /></div>
                          <div>
                            <div className="item-label">{a.quality}</div>
                            <div className="item-sub">{a.extension?.toUpperCase()}{a.size ? ` · ${formatSize(a.size)}` : ''}</div>
                          </div>
                        </div>
                        <a className="btn-dl audio-dl" href={a.url} target="_blank" rel="noopener noreferrer" download>
                          <DownloadIcon /> Download
                        </a>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {videoWithAudio.length === 0 && videoOnly.length === 0 && audios.length === 0 && (
                <div className="no-formats">No downloadable formats found for this video.</div>
              )}
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