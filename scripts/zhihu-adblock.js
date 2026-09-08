// Havoooc: endpoint-scoped Zhihu cleanup.
// References: QingRex/LoonKissSurge and yjqiang/surge_scripts.
(function () {
  try {
    const raw = $response.body;
    if (typeof raw !== "string" || raw.length > 2097152) return $done({});
    // Preserve numeric precision: pass through responses with long integer tokens.
    const tokens = raw.replace(/"(?:\\.|[^"\\])*"/g, '""');
    if (/-?\b\d{16,}\b/.test(tokens)) return $done({});
    const obj = JSON.parse(raw);
    if (!obj || Array.isArray(obj) || typeof obj !== "object") return $done({});
    const url = $request.url;
    if (/\/bazaar\/vip_tab\/header(?:\?|$)/.test(url)) {
      delete obj.activity_banner;
      delete obj.activity_window;
      delete obj.vip_tip;
    } else {
      delete obj.ad_info;
      if (Array.isArray(obj.data)) {
        obj.data = obj.data.filter(item => {
          if (!item || typeof item !== "object") return true;
          return !(Object.prototype.hasOwnProperty.call(item, "ad") && item.ad != null && item.ad !== false);
        });
      }
    }
    $done({ body: JSON.stringify(obj) });
  } catch (_) {
    $done({});
  }
})();
