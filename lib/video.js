// Turn a pasted video link into something we can show. Supports YouTube, Facebook, Instagram, TikTok and direct .mp4/.webm links.
export function parseVideo(raw) {
  const url = String(raw || '').trim();
  if (!/^https?:\/\//i.test(url)) return null;
  let m;
  if ((m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/i))) {
    const vertical = /\/shorts\//i.test(url);
    return { type: 'youtube', url, id: m[1], vertical, src: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0&playsinline=1`, thumb: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`, label: 'YouTube' };
  }
  if (/^https?:\/\/(?:[\w-]+\.)?(?:facebook\.com|fb\.watch|fb\.com)\//i.test(url)) {
    return { type: 'facebook', url, vertical: /\/reel\//i.test(url), src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`, thumb: '', label: 'Facebook' };
  }
  if ((m = url.match(/instagram\.com\/(reel|reels|p|tv)\/([\w-]+)/i))) {
    const kind = m[1] === 'reels' ? 'reel' : m[1];
    return { type: 'instagram', url, vertical: true, src: `https://www.instagram.com/${kind}/${m[2]}/embed`, thumb: '', label: 'Instagram' };
  }
  if ((m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i))) {
    return { type: 'tiktok', url, vertical: true, src: `https://www.tiktok.com/embed/v2/${m[1]}`, thumb: '', label: 'TikTok' };
  }
  if (/\.(mp4|webm|mov)(\?|#|$)/i.test(url)) return { type: 'file', url, vertical: false, src: url, thumb: '', label: 'Video' };
  return null;
}

export const parseVideos = (list) => (Array.isArray(list) ? list : []).map(parseVideo).filter(Boolean);
