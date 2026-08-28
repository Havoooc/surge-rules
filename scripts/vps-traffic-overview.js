const params = Object.fromEntries(
  String($argument || "").split("&").filter(Boolean).map((item) => {
    const index = item.indexOf("=");
    return [decodeURIComponent(index === -1 ? item : item.slice(0, index)), decodeURIComponent(index === -1 ? "" : item.slice(index + 1))];
  })
);

const title = params.title || "双 VPS 流量";

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return "未知";
  return bytes >= 1000 ** 4 ? `${(bytes / 1000 ** 4).toFixed(2)} TB` : `${(bytes / 1000 ** 3).toFixed(2)} GB`;
}

function formatDate(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "未知";
  const parts = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit" }).formatToParts(new Date(timestamp * 1000));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.month}/${values.day}`;
}

function nextMonthlyReset(timestamp) {
  const date = new Date(timestamp * 1000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  let year = Number(values.year);
  let month = Number(values.month);
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

function get(url) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error("缺少地址"));
    $httpClient.get({ url, timeout: 10 }, (error, response, body) => {
      if (error || !response) return reject(new Error(error || "无响应"));
      if (response.status && (response.status < 200 || response.status >= 300)) return reject(new Error(`HTTP ${response.status}`));
      resolve({ response, body });
    });
  });
}

function header(headers, name) {
  const key = Object.keys(headers || {}).find((key) => key.toLowerCase() === name);
  return key ? headers[key] : "";
}

function qqg(result) {
  const values = Object.fromEntries(header(result.response.headers, "subscription-userinfo").split(";").map((item) => item.trim().split("=")).filter((item) => item.length === 2));
  const used = Number(values.upload) + Number(values.download);
  const total = Number(values.total);
  if (![used, total].every(Number.isFinite) || total <= 0) throw new Error("QQG 未返回流量信息");
  const updatedAt = Number(header(result.response.headers, "x-traffic-updated-at"));
  const referenceTime = Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : Math.floor(Date.now() / 1000);
  return { name: "QQG", emoji: "🇺🇸", used, total, reset: nextMonthlyReset(referenceTime) };
}

function dmit(result) {
  const data = JSON.parse(result.body);
  const used = Number(data.used_bytes);
  const total = Number(data.total_bytes);
  if (![used, total].every(Number.isFinite) || total <= 0) throw new Error("DMIT 统计数据不完整");
  return { name: "DMIT", emoji: "🇺🇸", used, total, reset: Number(data.reset_at) };
}

Promise.all([get(params.qqg_url), get(params.dmit_url)])
  .then(([qqgResult, dmitResult]) => {
    const items = [dmit(dmitResult), qqg(qqgResult)];
    const content = items.map((item) => {
      const remaining = Math.max(item.total - item.used, 0);
      const usedPercent = item.used / item.total * 100;
      const remainingPercent = Math.max(100 - usedPercent, 0);
      const status = remainingPercent <= 20 ? "🔴" : remainingPercent <= 40 ? "🟡" : "🟢";
      return [
        `${item.emoji} ${item.name}`,
        `${status} 剩余：${formatSize(remaining)} (${remainingPercent.toFixed(1)}%)`,
        `📊 已用：${formatSize(item.used)} / ${formatSize(item.total)}`,
        `🔄 重置：${formatDate(item.reset)}`,
      ].join("\n");
    }).join("\n\n");
    const highest = Math.max(...items.map((item) => item.used / item.total));
    $done({ title, content, icon: "chart.bar.xaxis", "icon-color": highest >= 0.8 ? "#FF3B30" : "#34C759" });
  })
  .catch((error) => $done({ title, content: `更新失败：${error.message}`, icon: "exclamationmark.triangle.fill", "icon-color": "#FF9500" }));
