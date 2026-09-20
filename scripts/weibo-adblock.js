// 微博时间线与推荐流去广告
const url = $request.url;
const body = $response.body;

if (!body) {
  $done({});
} else {
  try {
    const obj = JSON.parse(body);
    if (!obj || typeof obj !== "object") {
      $done({});
    } else {
      delete obj.advertises;
      delete obj.ad;
      delete obj.trends;
      delete obj.head_cards;

      const isAdStatus = (s) => {
        if (!s || typeof s !== "object") return false;
        if (s.promotion || s.is_ad || s.ad_state || s.ad_type != null) return true;
        const typeName = String(s.mblogtypename || "");
        if (typeName === "广告" || typeName === "热推") return true;
        if (typeof s.cardid === "string" && s.cardid.startsWith("ad_")) return true;
        return false;
      };

      if (Array.isArray(obj.statuses)) {
        obj.statuses = obj.statuses.filter((s) => !isAdStatus(s));
      }

      if (Array.isArray(obj.cards)) {
        obj.cards = obj.cards.filter((c) => {
          if (!c || typeof c !== "object") return true;
          if (c.card_type === 22 || c.card_type === 118) return false;
          if (c.card_group && Array.isArray(c.card_group)) {
            c.card_group = c.card_group.filter((sub) => !isAdStatus(sub?.mblog));
          }
          if (c.mblog && isAdStatus(c.mblog)) return false;
          return true;
        });
      }

      $done({ body: JSON.stringify(obj) });
    }
  } catch (_) {
    $done({});
  }
}
