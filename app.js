(function () {
  const $ = (id) => document.getElementById(id);
  function renderCarrier() {
    const name = TrackerTimeline.detectCarrier($('tn').value);
    $('carrier').innerHTML = $('tn').value.trim()
      ? name ? `Detected carrier: <span class="chip">${name}</span>` : 'Carrier format not recognised.'
      : '';
  }
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function run() {
    const lines = $('events').value.split('\n').map((l) => l.trim()).filter(Boolean);
    const events = lines.map(TrackerTimeline.parseEvent).filter(Boolean);
    const skipped = lines.length - events.length;
    const { sorted, findings, delivered } = TrackerTimeline.analyze(events);
    if (skipped > 0) findings.unshift({ level: 'warn', code: 'UNPARSED', text: `${skipped} line(s) could not be parsed and were skipped.` });
    if (!findings.length) findings.push({ level: 'ok', code: 'CLEAN', text: delivered ? 'Timeline is consistent and delivered.' : 'Timeline is consistent so far.' });
    $('findings').innerHTML = findings.map((f) =>
      `<li class="${f.level}"><span class="code">${esc(f.code)}</span><br>${esc(f.text)}</li>`).join('');
    $('timeline').innerHTML = sorted.map((e) => {
      const cls = /delivered/i.test(e.status) ? 'delivered' : /exception|failed|return|hold|customs/i.test(e.status) ? 'exception' : '';
      return `<li class="${cls}"><div class="time">${esc(e.time.toLocaleString())}</div><div class="status">${esc(e.status)}</div><div class="loc">${esc(e.location)}</div></li>`;
    }).join('');
    $('results').classList.remove('hidden');
  }
  $('tn').addEventListener('input', renderCarrier);
  $('run').addEventListener('click', run);
  renderCarrier();
})();
