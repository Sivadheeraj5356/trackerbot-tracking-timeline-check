# Trackerbot Tracking Timeline Check

A client-side QA check for eCommerce order-tracking timelines, built with Trackerbot's world in mind: sellers automate order tracking, and buyers see whatever the carrier feed says - including the broken parts.

Paste carrier scan events and the tool rebuilds the timeline, detects the carrier from the tracking number, and flags what would erode buyer trust:

- **OUT_OF_ORDER** - a scan timestamped before the previous scan
- **DUPLICATE** - repeated scan of the same status at the same location
- **SCAN_AFTER_DELIVERY** - carrier activity after the delivered scan
- **EXCEPTION** - customs holds, failed attempts, returns
- **STALE_TRANSIT** - no scan for 5+ days while still in transit
- **NO_MOVEMENT** - label created but never picked up

Carrier formats recognised: UPS, FedEx, USPS, DHL, Delhivery, BlueDart.

## Use

Open `index.html`, paste one scan event per line:

```text
2026-10-01 08:00 | Picked up | Origin facility
2026-10-01 18:20 | In transit | Mumbai hub
2026-10-02 14:40 | Delivered | Doorstep
```

## Test

```bash
npm test
```

The project uses plain HTML, CSS and JavaScript with the Node.js built-in test runner. It has no external services, build step or secrets.
