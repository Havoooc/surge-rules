// Only explicit sponsored cards in startup/home lists are removed.
(function () {
  try {
    const url = $request.url;
    const body = $response.body;
    if (!body || !/\/(?:main\/(?:init|dataList)|dataList)(?:\?|$)/.test(url)) return $done({});
    const payload = JSON.parse(body);
    if (!payload || !Array.isArray(payload.data)) return $done({});
    const sponsored = new Set(["sponsorcard", "sponsorarticle", "advertisementcard"]);
    const cleaned = payload.data.filter((item) => {
      if (!item || typeof item !== "object") return true;
      return !sponsored.has(String(item.entityTemplate || item.template || "").toLowerCase());
    });
    if (cleaned.length === payload.data.length) return $done({});
    payload.data = cleaned;
    $done({ body: JSON.stringify(payload) });
  } catch (_) {
    $done({});
  }
})();
