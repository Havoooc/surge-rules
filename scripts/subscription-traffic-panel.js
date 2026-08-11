const params = Object.fromEntries(
  String($argument || "")
    .split("&")
    .filter(Boolean)
    .map((item) => {
      const index = item.indexOf("=");
      const key = index === -1 ? item : item.slice(0, index);
      const value = index === -1 ? "" : item.slice(index + 1);
      return [decodeURIComponent(key), decodeURIComponent(value)];
    })
);

const title = params.title || "套餐流量";
const url = params.url;

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return "未知";
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(2)} TB`;
  return `${(bytes / 1e9).toFixed(2)} GB`;
}

function formatTime(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "未知";
  const date = new Date(timestamp * 1000);
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day} ${value.hour}:${value.minute}`;
}

function finishError(message) {
  $done({
    title,
    content: message,
    icon: "exclamationmark.triangle.fill",
    "icon-color": "#FF9500",
  });
}

if (!url) {
  finishError("未配置订阅地址");
} else {
  $httpClient.get({ url, timeout: 10 }, (error, response) => {
    if (error || !response) {
      finishError(`更新失败：${error || "无响应"}`);
      return;
    }

    const headers = response.headers || {};
    const key = Object.keys(headers).find(
      (name) => name.toLowerCase() === "subscription-userinfo"
    );
    const raw = key ? headers[key] : "";
    const values = Object.fromEntries(
      raw
        .split(";")
        .map((item) => item.trim().split("="))
        .filter((item) => item.length === 2)
    );

    const upload = Number(values.upload);
    const download = Number(values.download);
    const total = Number(values.total);
    const expire = Number(values.expire);
    const used = upload + download;
    const remaining = Math.max(total - used, 0);
    const percent = total > 0 ? (used / total) * 100 : 0;

    if (![upload, download, total].every(Number.isFinite)) {
      finishError("订阅未返回流量信息");
      return;
    }

    $done({
      title,
      content: [
        `剩余：${formatSize(remaining)}`,
        `已用：${formatSize(used)} (${percent.toFixed(2)}%)`,
        `上传：${formatSize(upload)}  下载：${formatSize(download)}`,
        `总量：${formatSize(total)}`,
        `重置：${formatTime(expire)}`,
      ].join("\n"),
      icon: "chart.pie.fill",
      "icon-color": remaining / total < 0.2 ? "#FF3B30" : "#34C759",
    });
  });
}
