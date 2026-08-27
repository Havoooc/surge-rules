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
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(2)} TB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
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

function nextMonthlyReset(timestamp) {
  const date = new Date(timestamp * 1000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  let year = Number(value.year);
  let month = Number(value.month);
  // 25 日 00:00（Asia/Shanghai）等于前一日 16:00 UTC。
  let reset = Date.UTC(year, month - 1, 24, 16, 0) / 1000;
  if (timestamp >= reset) {
    month += 1;
    if (month === 13) {
      year += 1;
      month = 1;
    }
    reset = Date.UTC(year, month - 1, 24, 16, 0) / 1000;
  }
  return reset;
}

function headerValue(headers, expectedName) {
  const key = Object.keys(headers).find(
    (name) => name.toLowerCase() === expectedName.toLowerCase()
  );
  return key ? headers[key] : "";
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

    if (response.status && (response.status < 200 || response.status >= 300)) {
      finishError(`更新失败：HTTP ${response.status}`);
      return;
    }

    const headers = response.headers || {};
    const raw = headerValue(headers, "subscription-userinfo");
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
    const remainingPercent = total > 0 ? Math.max(100 - percent, 0) : 0;
    const updatedAt = Number(headerValue(headers, "x-traffic-updated-at"));
    const referenceTime = Number.isFinite(updatedAt) && updatedAt > 0
      ? updatedAt
      : Math.floor(Date.now() / 1000);

    if (![upload, download, total].every(Number.isFinite)) {
      finishError("订阅未返回流量信息");
      return;
    }

    $done({
      title,
      content: [
        `剩余：${formatSize(remaining)} (${remainingPercent.toFixed(2)}%)`,
        `已用：${formatSize(used)} (${percent.toFixed(2)}%)`,
        `上传：${formatSize(upload)}  下载：${formatSize(download)}`,
        `月总量：${formatSize(total)}`,
        `下次重置：${formatTime(nextMonthlyReset(referenceTime))}`,
        `服务到期：${formatTime(expire)}`,
        Number.isFinite(updatedAt) && updatedAt > 0
          ? `数据更新：${formatTime(updatedAt)}`
          : "",
      ].filter(Boolean).join("\n"),
      icon: "chart.pie.fill",
      "icon-color": remaining / total < 0.2 ? "#FF3B30" : "#34C759",
    });
  });
}
