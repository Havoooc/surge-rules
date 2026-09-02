/**
 * 酷安去广告（稳定增强版）
 * 仅处理已知广告结构，避免影响登录、发帖、评论和正常信息流。
 */

const url = $request.url;
const body = $response.body;

if (!body) {
  $done({});
} else {
  try {
    const payload = JSON.parse(body);
    const data = payload && payload.data;

    const isSponsoredCard = (item) => {
      if (!item || typeof item !== "object") return false;

      const template = String(item.entityTemplate || item.template || "").toLowerCase();
      const title = String(item.title || "");

      return (
        ["sponsorcard", "sponsorarticle", "advertisementcard"].includes(template) ||
        title === "精选配件" ||
        title.includes("值得买") ||
        title.includes("红包")
      );
    };

    if (/\/feed\/detail(?:\?|$)/.test(url) && data && typeof data === "object") {
      if (Array.isArray(data.hotReplyRows)) {
        data.hotReplyRows = data.hotReplyRows.filter((item) => item && item.id);
      }
      if (Array.isArray(data.topReplyRows)) {
        data.topReplyRows = data.topReplyRows.filter((item) => item && item.id);
      }
      data.detailSponsorCard = [];
      data.include_goods = [];
      data.include_goods_ids = [];
    } else if (/\/feed\/replyList(?:\?|$)/.test(url) && Array.isArray(data)) {
      payload.data = data.filter((item) => item && item.id);
    } else if (/\/(?:main\/)?dataList(?:\?|$)/.test(url) && Array.isArray(data)) {
      payload.data = data.filter((item) => !isSponsoredCard(item));
    } else if (/\/main\/indexV\d*(?:\?|$)/.test(url) && Array.isArray(data)) {
      const promotedEntityIds = new Set([8639, 29349, 32557, 33006]);
      payload.data = data.filter(
        (item) => !isSponsoredCard(item) && !promotedEntityIds.has(Number(item && item.entityId))
      );
    } else if (/\/main\/init(?:\?|$)/.test(url) && Array.isArray(data)) {
      payload.data = data
        .filter((item) => ![944, 945].includes(Number(item && item.entityId)))
        .map((item) => {
          if (Number(item && item.entityId) === 20131 && Array.isArray(item.entities)) {
            item.entities = item.entities.filter((entry) => entry && entry.title !== "酷品");
          }
          return item;
        });
    } else if (/\/page\/dataList(?:\?|$)/.test(url) && Array.isArray(data)) {
      payload.data = data.filter((item) => {
        const template = String((item && item.entityTemplate) || "").toLowerCase();
        return !isSponsoredCard(item) && template !== "imagescalecard";
      });
    }

    $done({ body: JSON.stringify(payload) });
  } catch (_) {
    $done({});
  }
}
