const params = Object.fromEntries(
  String($argument || "").split("&").filter(Boolean).map((item) => {
    const index = item.indexOf("=");
    return [
      decodeURIComponent(index === -1 ? item : item.slice(0, index)),
      decodeURIComponent(index === -1 ? "" : item.slice(index + 1)),
    ];
  })
);

const title = params.title || "🇺🇸 Vmiss 流量";
const url = params.url;
const resetDay = Number(params.reset_day || 22);
const resetHour = Number(params.reset_hour || 15);
const resetMinute = Number(params.reset_minute || 35);

function header(headers, expected) {
  const key = Object.keys(headers || {}).find((name) => name.toLowerCase() === expected.toLowerCase());
  return key ? headers[key] : "";
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return "未知";
  if (bytes >= 1000 ** 4) return `${(bytes / 1000 ** 4).toFixed(2)} TB`;
  return `${(bytes / 1000 ** 3).toFixed(2)} GB`;
}

function formatTime(timestamp) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(timestamp * 1000)).map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

function nextReset(now) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "numeric",
  }).formatToParts(new Date(now * 1000)).map((part) => [part.type, part.value]));
  let year = Number(values.year);
  let month = Number(values.month);
  let target = Date.UTC(year, month - 1, resetDay, resetHour - 8, resetMinute) / 1000;
  if (now >= target) {
    month += 1;
    if (month === 13) { year += 1; month = 1; }
    target = Date.UTC(year, month - 1, resetDay, resetHour - 8, resetMinute) / 1000;
  }
  return target;
}

function fail(message) {
  $done({ title, content: `更新失败：${message}`, icon: "exclamationmark.triangle.fill", "icon-color": "#FF9500" });
}

if (!url) {
  fail("未配置数据地址");
} else {
  $httpClient.get({ url, timeout: 10 }, (error, response) => {
    if (error || !response) return fail(error || "无响应");
    if (response.status < 200 || response.status >= 300) return fail(`HTTP ${response.status}`);
    const data = Object.fromEntries(header(response.headers, "subscription-userinfo").split(";").map((item) => item.trim().split("=")).filter((item) => item.length === 2));
    const upload = Number(data.upload);
    const download = Number(data.download);
    const total = Number(data.total);
    const updatedAt = Number(header(response.headers, "x-traffic-updated-at"));
    if (![upload, download, total, updatedAt].every(Number.isFinite) || total <= 0) return fail("数据不完整");
    const used = upload + download;
    const remaining = Math.max(total - used, 0);
    const percentage = Math.min(100, used / total * 100);
    $done({
      title,
      content: [
        `🟢 剩余：${formatSize(remaining)} (${(100 - percentage).toFixed(2)}%)`,
        `📊 已用：${formatSize(used)} (${percentage.toFixed(2)}%)`,
        `↑ ${formatSize(upload)}  ↓ ${formatSize(download)}`,
        `🔄 下次重置：${formatTime(nextReset(updatedAt))}`,
        `🕒 更新：${formatTime(updatedAt)}`,
      ].join("\n"),
      icon: "server.rack",
      "icon-color": remaining / total < 0.2 ? "#FF3B30" : "#34C759",
    });
  });
}
