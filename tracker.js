// Core timeline analysis for eCommerce order tracking events.
// Pure functions, no DOM, importable from tests and the browser app.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TrackerTimeline = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const CARRIERS = [
    { name: 'UPS', re: /^1Z[0-9A-Z]{16}$/i },
    { name: 'FedEx', re: /^(\d{12}|\d{15}|\d{20})$/ },
    { name: 'USPS', re: /^(94|93|92|95)\d{20}$/ },
    { name: 'DHL', re: /^\d{10}$/ },
    { name: 'Delhivery', re: /^\d{12,14}$/ },
    { name: 'BlueDart', re: /^\d{11}$/ },
  ];
  function detectCarrier(trackingNumber) {
    const t = (trackingNumber || '').trim();
    for (const c of CARRIERS) if (c.re.test(t)) return c.name;
    return null;
  }
  // Parse one event line: "2026-10-01 09:30 | In transit | Mumbai hub"
  function parseEvent(line) {
    const parts = line.split('|').map((s) => s.trim());
    if (parts.length < 2) return null;
    const ts = new Date(parts[0].replace(' ', 'T'));
    if (isNaN(ts)) return null;
    return { time: ts, status: parts[1], location: parts[2] || '' };
  }
  const isDelivery = (s) => /delivered/i.test(s);
  const isException = (s) => /exception|failed|return|hold|customs/i.test(s);
  const isTransit = (s) => /transit|departed|arrived|out for delivery|picked/i.test(s);
  function analyze(events, now) {
    const findings = [];
    const sorted = [...events].sort((a, b) => a.time - b.time);
    for (let i = 1; i < events.length; i++) {
      if (events[i].time < events[i - 1].time)
        findings.push({ level: 'error', code: 'OUT_OF_ORDER', text: `Scan "${events[i].status}" is timestamped before the previous scan - carrier feed is out of order.` });
    }
    const seen = new Set();
    for (const e of sorted) {
      const key = e.status.toLowerCase() + '|' + e.location.toLowerCase();
      if (seen.has(key)) findings.push({ level: 'warn', code: 'DUPLICATE', text: `Duplicate scan "${e.status}" at ${e.location || 'unknown location'}.` });
      seen.add(key);
    }
    const deliveredIdx = sorted.findIndex((e) => isDelivery(e.status));
    if (deliveredIdx >= 0) {
      for (let i = deliveredIdx + 1; i < sorted.length; i++)
        findings.push({ level: 'error', code: 'SCAN_AFTER_DELIVERY', text: `Scan "${sorted[i].status}" arrived after the delivery scan - reconcile with the carrier.` });
    }
    const exceptions = sorted.filter((e) => isException(e.status));
    for (const e of exceptions)
      findings.push({ level: 'error', code: 'EXCEPTION', text: `Exception scan: "${e.status}"${e.location ? ' at ' + e.location : ''} - buyer-visible delay likely.` });
    if (deliveredIdx < 0 && sorted.length) {
      const last = sorted[sorted.length - 1];
      const ref = now ? new Date(now) : new Date();
      const ageDays = (ref - last.time) / 86400000;
      if (isTransit(last.status) && ageDays > 5)
        findings.push({ level: 'warn', code: 'STALE_TRANSIT', text: `No scan for ${Math.floor(ageDays)} days after "${last.status}" - order may be stuck.` });
      if (!sorted.some((e) => isTransit(e.status) || isDelivery(e.status)))
        findings.push({ level: 'warn', code: 'NO_MOVEMENT', text: 'No transit scans at all - label may be created but not picked up.' });
    }
    return { sorted, findings, delivered: deliveredIdx >= 0 };
  }
  return { CARRIERS, detectCarrier, parseEvent, analyze };
});
