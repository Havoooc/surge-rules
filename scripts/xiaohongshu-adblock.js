/** 小红书去广告（稳定增强版）：只过滤明确广告对象，不修改下载权限或正常内容。 */

const url = $request.url;
const body = $response.body;

if (!body) {
  $done({});
} else {
  try {
    const payload = JSON.parse(body);
    const data = payload && payload.data;

    const isAdvertisement = (item) => {
      if (!item || typeof item !== "object") return false;
      const modelType = String(item.model_type || item.modelType || "").toLowerCase();
      return Boolean(item.ads_info || item.ad_info || item.adInfo) || ["ad", "ads", "advertisement", "sponsor"].includes(modelType);
    };

    if (/\/system_service\/config(?:\?|$)/.test(url) && data && typeof data === "object") {
      delete data.loading_img;
      delete data.splash;
    } else if (/\/system_service\/splash_config(?:\?|$)/.test(url) && Array.isArray(data?.ads_groups)) {
      for (const group of data.ads_groups) {
        group.start_time = 3818332800;
        group.end_time = 3818419199;
        if (Array.isArray(group.ads)) {
          for (const ad of group.ads) {
            ad.start_time = 3818332800;
            ad.end_time = 3818419199;
          }
        }
      }
    } else if (/\/homefeed(?:\?|$)/.test(url) && Array.isArray(data)) {
      payload.data = data.filter((item) => !isAdvertisement(item));
    } else if (/\/search\/notes(?:\?|$)/.test(url) && Array.isArray(data?.items)) {
      data.items = data.items.filter((item) => !isAdvertisement(item) && (!item.model_type || item.model_type === "note"));
    }

    $done({ body: JSON.stringify(payload) });
  } catch (_) {
    $done({});
  }
}
