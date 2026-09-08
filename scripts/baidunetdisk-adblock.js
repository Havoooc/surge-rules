// Havoooc: Baidu Netdisk home-entry cleanup.
// Removes non-storage promotional entries only.
(function () {
  try {
    const raw = $response.body;
    if (typeof raw !== "string" || raw.length > 1048576) return $done({});
    const obj = JSON.parse(raw);
    const list = obj?.data?.data;
    if (Array.isArray(list)) {
      const promotional = new Set(["novel", "shortplay", "print", "job_hunt"]);
      obj.data.data = list.filter(item => !(item && promotional.has(item.type)));
    }
    $done({ body: JSON.stringify(obj) });
  } catch (_) {
    $done({});
  }
})();
