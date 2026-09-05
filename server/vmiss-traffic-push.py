#!/usr/bin/env python3
import json
import subprocess
import time
import urllib.request
from pathlib import Path

INTERFACE = "eth0"
TOTAL_BYTES = 500_000_000_000
PUSH_URL = "https://sub.havooc.cc/api/traffic/vmiss-us"
TOKEN_PATH = Path("/etc/vmiss-traffic/push-token")


def counters():
    raw = subprocess.run(
        ["/usr/bin/vnstat", "--json", "m", "1", "-i", INTERFACE],
        check=True, capture_output=True, text=True, timeout=10,
    ).stdout
    months = json.loads(raw)["interfaces"][0]["traffic"].get("month", [])
    if not months:
        raise RuntimeError("vnStat has no monthly counter")
    current = months[-1]
    # From the client viewpoint, server RX is upload and server TX is download.
    return int(current["rx"]), int(current["tx"])


def main():
    upload, download = counters()
    payload = json.dumps({
        "upload": upload,
        "download": download,
        "total": TOTAL_BYTES,
        "expire": 0,
        "updated_at": int(time.time()),
        "estimated": False,
    }, separators=(",", ":")).encode()
    request = urllib.request.Request(
        PUSH_URL, data=payload, method="POST",
        headers={
            "Authorization": f"Bearer {TOKEN_PATH.read_text().strip()}",
            "Content-Type": "application/json",
            "User-Agent": "vmiss-traffic-reporter/1",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        if response.status != 204:
            raise RuntimeError(f"unexpected HTTP status {response.status}")


if __name__ == "__main__":
    main()
