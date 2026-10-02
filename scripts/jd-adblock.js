// Only remove explicit ad containers at verified top-level/data paths.
// Order, tracking and account responses pass through until fixtures prove a safe path.
(function main() {
  try {
    const match = String($request.url || "").match(/[?&]functionId=([^&]+)/);
    const id = match ? decodeURIComponent(match[1]) : "";
    if (!["deliverLayer", "getTabHomeInfo", "start", "welcomeHome"].includes(id)) return $done({});
    const body = JSON.parse($response.body);
    if (!body || typeof body !== "object" || Array.isArray(body)) return $done({});
    const keys = ["ad", "ads", "adInfo", "adList", "splash", "splashAd", "launchAd"];
    let changed = false;
    for (const container of [body, body.data]) {
      if (!container || typeof container !== "object" || Array.isArray(container)) continue;
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(container, key)) {
          delete container[key]; changed = true;
        }
      }
    }
    $done(changed ? { body: JSON.stringify(body) } : {});
  } catch (_) { $done({}); }
})();
