#!/usr/bin/env python3
"""Read DMIT's vnStat counters and expose a non-sensitive panel payload locally."""
import calendar
import json
import subprocess
from datetime import date, datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = 18081
INTERFACE = "eth0"
TOTAL_BYTES = 1_500_000_000_000  # DMIT: 1.50 TB, decimal and bidirectional.
BILLING_DAY = 19
# DMIT's control panel reported 39.78 GB on 2026-08-28. vnStat reported
# 55,516,016,684 bytes at the same observation point. Keep the panel aligned
# with the provider for this cycle only; a new cycle starts without an offset.
CALIBRATION_PERIOD = date(2026, 8, 19)
CALIBRATION_BYTES = -15_736_016_684


def current_period_start(today):
    if today.day >= BILLING_DAY:
        return date(today.year, today.month, BILLING_DAY)
    if today.month == 1:
        return date(today.year - 1, 12, BILLING_DAY)
    return date(today.year, today.month - 1, BILLING_DAY)


def next_reset(today):
    year, month = today.year, today.month
    if today.day >= BILLING_DAY:
        month += 1
        if month == 13:
            year, month = year + 1, 1
    return calendar.timegm((year, month, BILLING_DAY, 0, 0, 0))


def traffic_payload():
    now = datetime.now(timezone.utc)
    start = current_period_start(now.date())
    raw = subprocess.run(
        ["/usr/bin/vnstat", "--json", "d", "45", "-i", INTERFACE],
        check=True, capture_output=True, text=True, timeout=5,
    ).stdout
    days = json.loads(raw)["interfaces"][0]["traffic"].get("day", [])
    used = 0
    for item in days:
        item_date = date(item["date"]["year"], item["date"]["month"], item["date"]["day"])
        if start <= item_date <= now.date():
            used += int(item.get("rx", 0)) + int(item.get("tx", 0))
    calibrated = start == CALIBRATION_PERIOD
    if calibrated:
        used = max(used + CALIBRATION_BYTES, 0)
    return {
        "provider": "DMIT",
        "metering": "bidirectional-vnstat",
        "used_bytes": used,
        "total_bytes": TOTAL_BYTES,
        "period_start": calendar.timegm(start.timetuple()),
        "reset_at": next_reset(now.date()),
        "updated_at": int(now.timestamp()),
        "calibrated": calibrated,
    }


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            body = json.dumps(traffic_payload(), separators=(",", ":")).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception:
            self.send_response(503)
            self.send_header("Content-Length", "0")
            self.end_headers()

    def log_message(self, *_args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
