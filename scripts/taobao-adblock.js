/** 淘宝去广告（稳定增强版）：仅处理开屏视频与 PopLayer 营销弹窗。 */

const url = $request.url;
const body = $response.body;

if (!body) {
  $done({});
} else {
  try {
    const payload = JSON.parse(body);

    if (url.includes("mtop.taobao.cloudvideo.video.query")) {
      if (payload.data && typeof payload.data === "object") {
        payload.data.duration = "0";
        payload.data.resources = [];
        payload.data.caches = [];
        payload.data.respTimeInMs = "3818332800000";
      }
    } else if (url.includes("mtop.taobao.wireless.home.splash.awesome.get")) {
      const sections = payload.data?.containers?.splash_home_base?.base?.sections;
      if (Array.isArray(sections)) {
        for (const section of sections) {
          const ads = section?.bizData?.["taobao-splash"]?.data;
          if (!Array.isArray(ads)) continue;
          for (const ad of ads) {
            Object.assign(ad, {
              waitTime: "0",
              times: "0",
              hotStart: "false",
              coldStart: "false",
              startTime: "3818332800000",
              endTime: "3818419199000",
              gmtStart: "2090-12-31 00:00:00",
              gmtEnd: "2090-12-31 23:59:59",
              imgUrl: "",
              videoUrl: "",
            });
          }
        }
      }
    } else if (url.includes("poplayer.template.alibaba.com")) {
      if (payload.res) {
        payload.res.images = [];
        payload.res.videos = [];
      }
      if (payload.mainRes) payload.mainRes.images = [];
      payload.enable = false;
    }

    $done({ body: JSON.stringify(payload) });
  } catch (_) {
    $done({});
  }
}
