// Havoooc: endpoint-scoped Zhihu cleanup.
// References: QingRex/LoonKissSurge, app2smile, and yjqiang/surge_scripts.
(function () {
  try {
    const raw = $response.body;
    if (typeof raw !== "string" || raw.length > 2097152) return $done({});

    // Preserve numeric precision for 64-bit IDs without precision loss.
    // Wrap raw integers >= 16 digits into sentinel strings before parsing.
    function safeWrapBigInt(str) {
      let inString = false;
      let result = "";
      let i = 0;
      const len = str.length;
      while (i < len) {
        const ch = str[i];
        if (ch === "\"" && (i === 0 || str[i - 1] !== "\\")) {
          inString = !inString;
          result += ch;
          i++;
        } else if (!inString && (ch === ":" || ch === "," || ch === "[")) {
          result += ch;
          i++;
          while (i < len && (str[i] === " " || str[i] === "\t" || str[i] === "\n" || str[i] === "\r")) {
            result += str[i];
            i++;
          }
          const m = str.slice(i).match(/^(-?\d{16,})\b/);
          if (m) {
            result += "\"__BIGINT__" + m[1] + "\"";
            i += m[1].length;
          }
        } else {
          result += ch;
          i++;
        }
      }
      return result;
    }

    function safeUnwrapBigInt(str) {
      return str.replace(/"__BIGINT__(-?\d{16,})"/g, "$1");
    }

    const wrapped = safeWrapBigInt(raw);
    const obj = JSON.parse(wrapped);
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

    const output = safeUnwrapBigInt(JSON.stringify(obj));
    $done({ body: output });
  } catch (_) {
    $done({});
  }
})();
