// 京东广告与运营推广响应清理。
// 仅由 jd-adblock.sgmodule 中列出的广告/运营接口调用。

const blockedKeys = new Set([
  "ad", "ads", "adinfo", "ad_info", "adlist", "ad_list", "addata", "ad_data",
  "advert", "advertise", "advertisement", "advertisementlist", "advertisement_list",
  "splash", "splashad", "splash_ad", "launchad", "launch_ad",
  "popup", "popwindow", "pop_window", "poplayer", "pop_layer",
  "promotion", "promotioninfo", "promotion_info", "promotionlist", "promotion_list"
]);

let changed = false;

function normalizedKey(key) {
  return String(key).replace(/[-_]/g, "").toLowerCase();
}

function isAdRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return value.isAd === true || value.is_ad === true ||
    value.isAdvert === true || value.is_advert === true ||
    value.adId != null || value.ad_id != null ||
    value.adInfo != null || value.ad_info != null ||
    value.advertisement != null || value.advert != null;
}

function clean(value, depth = 0) {
  if (depth > 24 || value == null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    const result = [];
    for (const item of value) {
      if (isAdRecord(item)) {
        changed = true;
        continue;
      }
      result.push(clean(item, depth + 1));
    }
    return result;
  }

  for (const key of Object.keys(value)) {
    if (blockedKeys.has(normalizedKey(key))) {
      delete value[key];
      changed = true;
      continue;
    }
    value[key] = clean(value[key], depth + 1);
  }
  return value;
}

try {
  const body = JSON.parse($response.body);
  clean(body);
  $done(changed ? { body: JSON.stringify(body) } : {});
} catch (error) {
  // 响应格式变更或非 JSON 时原样放行，避免影响京东正常使用。
  $done({});
}
