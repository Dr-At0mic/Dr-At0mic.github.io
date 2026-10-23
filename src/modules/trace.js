// "Your visit, traced": the page records a span for every section you settle on, the way a
// request is traced through services — and draws the waterfall in the footer. It's computed
// here, in the browser, and never sent anywhere.

const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
const secs = (ms) => (ms < 60_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.floor(ms / 60_000)}m ${String(Math.round((ms % 60_000) / 1000)).padStart(2, '0')}s`);

export function initTrace() {
  const list = document.querySelector('[data-trace-spans]');
  if (!list) return;
  const start = performance.now();
  document.querySelector('[data-trace-id]').textContent = `${hex(8)}…`;
  const total = document.querySelector('[data-trace-total]');

  // one row per section, in the order you first reached it; each visit is a segment
  const rows = new Map();
  let open = null;
  const close = (now) => {
    if (open) open.seg[1] = now;
    open = null;
  };
  addEventListener('tx', (e) => {
    const { op, path } = e.detail;
    if (op !== 'commit' || !path) return;
    const now = performance.now() - start;
    close(now);
    if (!rows.has(path)) rows.set(path, []);
    const seg = [now, now];
    rows.get(path).push(seg);
    open = { path, seg };
  });

  let visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(list.closest('.trace'));

  const draw = () => {
    const now = performance.now() - start;
    if (open) open.seg[1] = now;
    total.textContent = secs(now);
    if (!visible) return;
    const span = Math.max(now, 1);
    list.innerHTML = [...rows]
      .map(([path, segs]) => {
        const dur = segs.reduce((n, [a, b]) => n + (b - a), 0);
        const bars = segs.map(([a, b]) => `<i class="trace__seg" style="left:${((a / span) * 100).toFixed(2)}%;width:${(((b - a) / span) * 100).toFixed(2)}%"></i>`).join('');
        return `<li class="trace__span${open?.path === path ? ' is-now' : ''}"><span class="trace__name">${path.replace(/[<>&]/g, '')}</span><span class="trace__track">${bars}</span><span class="trace__dur">${secs(dur)}</span></li>`;
      })
      .join('');
  };
  setInterval(draw, 500);
  draw();
}
