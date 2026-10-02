// Havoooc: endpoint-scoped Zhihu cleanup.
// References: QingRex/LoonKissSurge, app2smile, and yjqiang/surge_scripts.
(function () {
  try {
    const raw = $response.body;
    if (typeof raw !== "string" || raw.length > 2097152) return $done({});

    // Never round large integer IDs or reinterpret user strings as number tokens.
    // Scan JSON string/number tokens, consuming complete escaped strings.
    const tokens = raw.match(/"(?:[^"\\]|\\[\s\S])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) || [];
    for (const token of tokens) {
      if (token[0] === '"') continue;
      const value = Number(token);
      if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) return $done({});
    }
    const obj = JSON.parse(raw);
    if (!obj || Array.isArray(obj) || typeof obj !== "object") return $done({});

    const url = $request.url;

    const isAdItem = (item) => {
      if (!item || typeof item !== "object") return false;
      if (item.ad != null && item.ad !== false) return true;
      if (item.ad_info != null || item.commercial_card != null) return true;
      const type = String(item.type || "").toLowerCase();
      if (["market_card", "feed_advert", "commercial", "e_commerce"].includes(type)) return true;
      if (item.extra && typeof item.extra === "object") {
        const extraType = String(item.extra.type || "").toLowerCase();
        if (["ad", "commercial", "market_card"].includes(extraType)) return true;
      }
      return false;
    };

    if (/\/bazaar\/vip_tab\/header(?:\?|$)/.test(url)) {
      delete obj.activity_banner;
      delete obj.activity_window;
      delete obj.vip_tip;
    } else {
      delete obj.ad_info;
      delete obj.header;
      delete obj.sidebar_info;
      if (Array.isArray(obj.data)) {
        obj.data = obj.data.filter((item) => !isAdItem(item));
      }
    }

    const output = JSON.stringify(obj);
    if (output === JSON.stringify(JSON.parse(raw))) return $done({});
    $done({ body: output });
  } catch (_) {
    $done({});
  }
})();
