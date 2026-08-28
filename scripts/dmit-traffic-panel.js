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

const title = params.title || "DMIT 流量";
const url = params.url;

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return "未知";
  if (bytes >= 1000 ** 4) return `${(bytes / 1000 ** 4).toFixed(2)} TB`;
  return `${(bytes / 1000 ** 3).toFixed(2)} GB`;
}

function formatTime(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "未知";
  const date = new Date(timestamp * 1000);
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

function finishError(message) {
  $done({ title, content: message, icon: "exclamationmark.triangle.fill", "icon-color": "#FF9500" });
}

if (!url) {
  finishError("未配置 DMIT 统计地址");
} else {
  $httpClient.get({ url, timeout: 10 }, (error, response, body) => {
    if (error || !response) return finishError(`更新失败：${error || "无响应"}`);
    if (response.status && (response.status < 200 || response.status >= 300)) {
      return finishError(`更新失败：HTTP ${response.status}`);
    }

    try {
      const data = JSON.parse(body);
      const used = Number(data.used_bytes);
      const total = Number(data.total_bytes);
      const remaining = Math.max(total - used, 0);
      const percent = total > 0 ? used / total * 100 : 0;
      const updated = Number(data.updated_at);
      if (![used, total, updated].every(Number.isFinite) || total <= 0) throw new Error("统计数据不完整");

      $done({
        title,
        content: [
          `🟢 剩余：${formatSize(remaining)} (${Math.max(100 - percent, 0).toFixed(2)}%)`,
          `📊 已用：${formatSize(used)} (${percent.toFixed(2)}%)`,
          data.calibrated ? "↕️ 双向计费 · 已按 DMIT 后台校准" : "↕️ 双向计费 · 服务器侧近实时统计",
          `🔄 下次重置：${formatTime(Number(data.reset_at))}`,
          `🕒 更新：${formatTime(updated)}`,
        ].join("\n"),
        icon: "server.rack",
        "icon-color": remaining / total < 0.2 ? "#FF3B30" : "#34C759",
      });
    } catch (parseError) {
      finishError(`解析失败：${parseError.message}`);
    }
  });
}
