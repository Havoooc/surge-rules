// Havoooc: endpoint-scoped SMZDM cleanup.
// Retains shopping content and only removes explicit advertising fields/cards.
(function () {
  try {
    const raw = $response.body;
    if (typeof raw !== "string" || raw.length > 2097152) return $done({});
    const obj = JSON.parse(raw);
    if (!obj || Array.isArray(obj) || typeof obj !== "object") return $done({});
    const data = obj.data && typeof obj.data === "object" ? obj.data : null;
    const url = $request.url;

    if (/\/util\/update(?:\?|$)/.test(url) && data) {
      ["silence_local_push_msg", "video_cache_num_configs", "haojia_widget", "widget", "operation_float"].forEach(k => delete data[k]);
      ["silence_local_push", "baichuan_redirect_switch"].forEach(k => {
        if (Object.prototype.hasOwnProperty.call(data, k)) data[k] = 0;
      });
    } else if (/homepage-api\.smzdm\.com\/v3\/home(?:\?|$)/.test(url) && Array.isArray(data?.component)) {
      data.component = data.component.filter(item => {
        if (!item || typeof item !== "object") return true;
        return item.model_type !== "ads" && item.ad_campaign_id == null;
      });
    } else if (/s-api\.smzdm\.com\/sou\/list_v10(?:\?|$)/.test(url) && Array.isArray(data?.rows)) {
      data.rows = data.rows.filter(item => !(item && item.model_type === "ads"));
      if (Array.isArray(data.top_aladdin)) data.top_aladdin = data.top_aladdin.filter(item => !(item && item.ad));
    } else if (/post\.m\.smzdm\.com\/ajax_app\/ajax_get_footer_list(?:\?|$)/.test(url) && data) {
      delete data.tuiguang_ad;
      delete data.activity_banner;
    } else if (/user-api\.smzdm\.com\/vip(?:\?|$)/.test(url) && data) {
      ["activity_entrance_info", "big_banner", "top_banner", "banner_switch", "yaoqingshaiwu"].forEach(k => delete data[k]);
    }
    $done({ body: JSON.stringify(obj) });
  } catch (_) {
    $done({});
  }
})();
