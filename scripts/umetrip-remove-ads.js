/*
 * 航旅纵横广告请求拦截
 * 仅根据请求头 Rpid 判断已知广告位，不修改正常业务响应。
 */

const headers = $request.headers || {};
const rpid = headers.rpid || headers.Rpid || headers.RPID || "";

const blockedRpids = new Set([
  "1000002",
  "1000019",
  "1430064",
  "1120002",
  "1130016"
]);

if (blockedRpids.has(String(rpid))) {
  $done({
    response: {
      status: 404,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: "{}"
    }
  });
} else {
  $done({});
}
