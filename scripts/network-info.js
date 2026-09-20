/**
 * 网络信息面板 (Surge 5 深度定制重构版)
 * 实时监测网络环境、SSID/内网IP、国内直连、中转入口、代理落地出口、ISP运营商与真实往返延迟。
 * 支持网络变动后台提醒（Event: network-changed）与持久化中转归属地缓存。
 * 
 * 原作者: @xream @keywos
 * 重构优化: Havoooc (隐私默认保护、国内探测固定直连、双通道延迟容灾、健康状态灯、离线即时侦测、中转1小时缓存、呼吸感两段排版)
 */

const DEFAULT_ARGS = {
  MASK: '1',            // 1: 开启 IP 打码保护 (默认); 0: 显示完整 IP
  IPv6: '0',            // 1: 显示 IPv6; 0: 不显示
  NOTIFY: '0',          // 1: 网络变动时发送通知; 0: 静默 (默认)
  RTT: '0',             // 1: 测速显示往返延迟; 0: 不测速 (默认)
  ICON: 'globe.asia.australia',
  'ICON-COLOR': '#007AFF'
};

// 解析 $argument 键值对参数
let arg = { ...DEFAULT_ARGS };
if (typeof $argument !== 'undefined' && $argument) {
  $argument.split('&').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx !== -1) {
      const k = pair.substring(0, idx).trim();
      const v = pair.substring(idx + 1).trim();
      arg[k] = v;
    }
  });
}

const isMask = arg.MASK === '1';
const showIPv6 = arg.IPv6 === '1';
const showRTT = arg.RTT === '1';
const isEvent = typeof $argument !== 'undefined' && arg.TYPE === 'EVENT';

// 基础网络请求封装
function httpGet(options) {
  return new Promise((resolve) => {
    const opts = typeof options === 'string' ? { url: options } : options;
    opts.timeout = opts.timeout || 3;
    $httpClient.get(opts, (err, resp, data) => {
      if (err) return resolve({ error: err });
      resolve({ response: resp, body: data, statusCode: resp ? resp.status : 0 });
    });
  });
}

// 延迟测速基础函数
function testRTT(url, timeout = 2.5, policy) {
  const start = Date.now();
  return new Promise((resolve) => {
    const options = { url, timeout };
    if (policy) options.policy = policy;
    $httpClient.get(options, (err) => {
      if (err) return resolve(null);
      resolve(Date.now() - start);
    });
  });
}

// 双通道国内延迟测速：百度优先，华为 204 备选
async function getDomesticRTT() {
  const rtt = await testRTT('https://www.baidu.com', 2, 'DIRECT');
  if (rtt !== null) return rtt;
  return await testRTT('https://connectivitycheck.platform.hicloud.com/generate_204', 2, 'DIRECT');
}

// 双通道国外/节点延迟测速：Cloudflare 204 优先，Google 204 备选
async function getNodeRTT() {
  const rtt = await testRTT('https://cp.cloudflare.com/generate_204', 2.5);
  if (rtt !== null) return rtt;
  return await testRTT('https://www.google.com/generate_204', 2.5);
}

// 延迟健康指示灯
function getHealthDot(ms) {
  if (ms === null || ms === undefined) return '❌';
  if (ms < 100) return '🟢';
  if (ms <= 250) return '🟡';
  return '🔴';
}

// 地区名称智能去重格式化（如避免直辖市出现“北京 北京”）
function formatLoc(p, c) {
  const prov = (p || '').replace(/省|市/g, '').trim();
  const city = (c || '').replace(/省|市/g, '').trim();
  if (!prov) return city;
  if (!city || prov === city) return prov;
  return `${prov} ${city}`;
}

// 落地地区名称去重（如避免“香港 香港”、“新加坡 新加坡”）
function formatLandingLoc(country, city) {
  const cnt = (country || '').trim();
  const ct = (city || '').trim();
  if (!cnt) return ct;
  if (!ct || cnt === ct || ct.includes(cnt)) return cnt;
  return `${cnt} ${ct}`;
}

// 国旗 Emoji 转换
function getFlag(countryCode) {
  if (!countryCode || typeof countryCode !== 'string') return '🌐';
  try {
    const upper = countryCode.toUpperCase();
    if (upper === 'TW') return '🇨🇳';
    const codePoints = upper.split('').map(c => 127397 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return '🌐';
  }
}

// IP 隐私脱敏打码 (默认关闭，直接返回完整 IP)
function maskIP(ip) {
  if (!ip) return '-';
  if (!isMask) return ip;
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 2).join(':') + ':*:*';
  }
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  return ip;
}

// 运营商与服务商名称精简美化 (国内直连使用)
function cleanISP(isp) {
  if (!isp) return '';
  return isp
    .replace(/Shenzhen Tencent.*/i, '腾讯云')
    .replace(/Tencent.*/i, '腾讯云')
    .replace(/Alibaba.*/i, '阿里云')
    .replace(/Aliyun.*/i, '阿里云')
    .replace(/Huawei.*/i, '华为云')
    .replace(/Baidu.*/i, '百度云')
    .replace(/Ucloud.*/i, 'UCloud')
    .replace(/China Telecom.*/i, '中国电信')
    .replace(/China Unicom.*/i, '中国联通')
    .replace(/China Mobile.*/i, '中国移动');
}

// 获取国内直连出口信息（网易权威接口 + B站移动端接口容灾，包含运营商 ISP）
async function getDomesticInfo() {
  try {
    const res = await httpGet({
      url: 'https://dashi.163.com/fgw/mailsrv-ipdetail/detail',
      policy: 'DIRECT',
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }
    });
    if (res.body) {
      const json = JSON.parse(res.body);
      const r = json.result;
      if (r && r.ip) {
        return {
          ip: r.ip,
          country: r.country || '中国',
          province: (r.province || '').replace('省', ''),
          city: (r.city || '').replace('市', ''),
          isp: cleanISP(r.isp || r.org || '')
        };
      }
    }
  } catch (e) {}

  try {
    const res = await httpGet({
      url: 'https://api.live.bilibili.com/ip_service/v1/ip_service/get_ip_addr',
      policy: 'DIRECT',
      headers: { 'User-Agent': 'bili-universal/65100300' }
    });
    if (res.body) {
      const json = JSON.parse(res.body);
      const d = json.data;
      if (d && d.addr) {
        return {
          ip: d.addr,
          country: d.country || '中国',
          province: (d.province || '').replace('省', ''),
          city: (d.city || '').replace('市', ''),
          isp: cleanISP(d.isp || '')
        };
      }
    }
  } catch (e) {}

  return null;
}

// 获取代理落地出口信息（仅显示国家与城市，不显示服务商/机房）
async function getLandingInfo() {
  try {
    const res = await httpGet({
      url: 'https://ipwho.is/?lang=zh-CN',
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }
    });
    if (res.body) {
      const json = JSON.parse(res.body);
      if (json.success !== false && json.ip) {
        return {
          ip: json.ip,
          countryCode: json.country_code,
          country: json.country || '',
          city: json.city || ''
        };
      }
    }
  } catch (e) {}

  return null;
}

// 查询中转入口 IP 的归属地（仅显示地区，不显示服务商；带 1 小时持久化缓存）
async function getRelayInfo(ip) {
  if (!ip) return null;

  const CACHE_KEY = 'network_info_relay_cache';
  const ONE_HOUR = 3600 * 1000;
  let cache = {};

  try {
    const raw = $persistentStore.read(CACHE_KEY);
    if (raw) cache = JSON.parse(raw);
    if (cache[ip] && (Date.now() - cache[ip].time < ONE_HOUR)) {
      return { ip, loc: cache[ip].loc };
    }
  } catch (e) {}

  let loc = '';
  try {
    const res = await httpGet({
      url: `https://ipwho.is/${encodeURIComponent(ip)}?lang=zh-CN`,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (res.body) {
      const json = JSON.parse(res.body);
      if (json.success !== false && json.ip) {
        loc = formatLoc(json.region, json.city) || json.country || '';
      }
    }
  } catch (e) {}


  if (loc) {
    try {
      cache[ip] = { loc, time: Date.now() };
      const entries = Object.keys(cache);
      if (entries.length > 32) {
        entries
          .sort((a, b) => (cache[a].time || 0) - (cache[b].time || 0))
          .slice(0, entries.length - 32)
          .forEach(key => delete cache[key]);
      }
      $persistentStore.write(JSON.stringify(cache), CACHE_KEY);
    } catch (e) {}
  }

  return { ip, loc };
}

// 从 Surge 最近请求中提取代理策略名与中转/专线入口 IP
function getRecentPolicy() {
  return new Promise((resolve) => {
    if (typeof $httpAPI === 'undefined') {
      return resolve({ policy: '', entrance: '' });
    }
    $httpAPI('GET', '/v1/requests/recent', null, (res) => {
      try {
        const reqs = (res && res.requests) || [];
        const proxyReq = reqs.find(r => /ipwho\.is|ip-api\.com|cloudflare\.com|generate_204/.test(r.URL));
        if (proxyReq) {
          let entrance = '';
          if (proxyReq.remoteAddress && proxyReq.remoteAddress.includes('(Proxy)')) {
            const rawEntrance = proxyReq.remoteAddress.replace(/\s*\(Proxy\)\s*/, '').trim();
            entrance = rawEntrance.replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
          }
          return resolve({
            policy: proxyReq.policyName || '',
            entrance: entrance
          });
        }
        resolve({ policy: '', entrance: '' });
      } catch (e) {
        resolve({ policy: '', entrance: '' });
      }
    });
  });
}

// 主流程
!(async () => {
  // 1. 获取本地网络接口与 Wi-Fi SSID
  let ssid = '';
  let lanIP = '';
  let lanIPv6 = '';

  if (typeof $network !== 'undefined' && $network) {
    if ($network.wifi && $network.wifi.ssid) {
      ssid = $network.wifi.ssid;
    }
    if ($network.v4 && $network.v4.primaryAddress) {
      lanIP = $network.v4.primaryAddress;
    }
    if ($network.v6 && $network.v6.primaryAddress) {
      lanIPv6 = $network.v6.primaryAddress;
    }
  }

  // 离线 / 飞行模式即时检测
  const isOffline = !lanIP && !lanIPv6 && !ssid;
  if (isOffline) {
    if (isEvent) {
      $done();
      return;
    }
    $done({
      title: '✈️ 飞行模式 / 暂无网络连接',
      content: '设备未接入任何网络\n请检查 Wi-Fi 或蜂窝移动数据设置',
      icon: 'airplane',
      'icon-color': '#FF9500'
    });
    return;
  }

  // 通知关闭时，网络变化事件无需访问外部接口，避免后台产生额外流量。
  if (isEvent && arg.NOTIFY !== '1') {
    $done();
    return;
  }

  // 2. 并发拉取出口信息与双通道延迟测速
  const tasks = [
    getDomesticInfo(),
    getLandingInfo(),
    showRTT ? getDomesticRTT() : Promise.resolve(null),
    showRTT ? getNodeRTT() : Promise.resolve(null)
  ];

  const [direct, landing, baiduRTT, nodeRTT] = await Promise.all(tasks);
  const { policy, entrance } = await getRecentPolicy();

  // 3. 研判并查询中转入口节点
  let relayData = null;
  const isDirectMode = !policy || policy === 'DIRECT';
  const hasDistinctEntrance = entrance && 
                              landing && 
                              entrance !== landing.ip && 
                              (!direct || entrance !== direct.ip);

  if (!isDirectMode && hasDistinctEntrance) {
    relayData = await getRelayInfo(entrance);
  }

  // 4. 组装格式化文本
  const flag = landing ? getFlag(landing.countryCode) : '🌐';
  
  // 国内直连行（保留 ISP 运营商）
  const directLoc = direct ? formatLoc(direct.province, direct.city) : '';
  const directIPStr = direct 
    ? `${maskIP(direct.ip)}  ${directLoc}${direct.isp ? ' · ' + direct.isp : ''}`.trim()
    : '获取失败';

  // 中转入口行（不显示 ISP，仅显示 IP + 地区）
  let relayIPStr = '';
  if (isDirectMode) {
    relayIPStr = '全局直连 (未启用代理)';
  } else if (relayData && relayData.loc) {
    relayIPStr = `${maskIP(relayData.ip)}  ${relayData.loc}`.trim();
  } else if (relayData && relayData.ip) {
    relayIPStr = `${maskIP(relayData.ip)}`;
  } else {
    relayIPStr = '直连出海 (无需中转)';
  }

  // 代理落地行（不显示 ISP，仅显示 IP + 国家/城市）
  let landingIPStr = '获取失败';
  if (landing) {
    if (direct && landing.ip === direct.ip) {
      landingIPStr = `${maskIP(landing.ip)}  与直连相同 (未走代理)`;
    } else {
      const landingLoc = formatLandingLoc(landing.country, landing.city);
      landingIPStr = `${maskIP(landing.ip)}  ${landingLoc}`.trim();
    }
  }

  // 策略行
  const policyStr = policy ? policy : 'DIRECT';

  // 5. 层次化分段排版（两段式，中间空行，呼吸感更足）
  let routeSection = [];
  if (isDirectMode || (landing && direct && landing.ip === direct.ip)) {
    routeSection = [
      `🇨🇳 直连: ${directIPStr}`,
      `🔀 代理: 全局直连 (未走代理)`
    ];
  } else {
    routeSection = [
      `🇨🇳 直连: ${directIPStr}`,
      `🔀 中转: ${relayIPStr}`,
      `${flag} 落地: ${landingIPStr}`
    ];
  }

  const infoSection = [
    `🧭 策略: ${policyStr}`
  ];

  if (showRTT) {
    const baiduStr = baiduRTT !== null ? `${baiduRTT}ms` : '超时';
    const nodeStr = nodeRTT !== null ? `${nodeRTT}ms` : '超时';
    const baiduDot = getHealthDot(baiduRTT);
    const nodeDot = getHealthDot(nodeRTT);
    infoSection.push(`🐾 百度延迟: ${baiduStr} ${baiduDot}`);
    infoSection.push(`☁️ 节点延迟: ${nodeStr} ${nodeDot}`);
  }

  if (showIPv6 && lanIPv6) {
    infoSection.push(`🌐 IPv6: ${maskIP(lanIPv6)}`);
  }

  // 链路信息与策略测速之间空一行分隔
  const panelContent = [routeSection.join('\n'), infoSection.join('\n')].join('\n\n');
  const panelTitle = `📶 ${ssid ? ssid : '蜂窝移动网络'}${lanIP ? ` (${lanIP})` : ''}`;

  // 6. 网络变动事件处理 (Event: network-changed)
  if (isEvent) {
    const currentState = {
      ssid: ssid,
      directIP: direct ? direct.ip : '',
      entrance: entrance || '',
      landingIP: landing ? landing.ip : '',
      policy: policy
    };

    let lastState = null;
    try {
      const saved = $persistentStore.read('network_info_last_state');
      if (saved) lastState = JSON.parse(saved);
    } catch (e) {}

    const isChanged = !lastState || 
                      lastState.ssid !== currentState.ssid || 
                      lastState.directIP !== currentState.directIP || 
                      lastState.landingIP !== currentState.landingIP ||
                      lastState.entrance !== currentState.entrance ||
                      lastState.policy !== currentState.policy;

    if (isChanged) {
      $persistentStore.write(JSON.stringify(currentState), 'network_info_last_state');
      if (arg.NOTIFY === '1') {
        const subTitle = `${ssid ? `WiFi: ${ssid}` : '蜂窝网络'} ｜ ${policyStr}`;
        const notifyLines = [`直连: ${directIPStr}`];
        if (isDirectMode) {
          notifyLines.push(`代理: 全局直连`);
        } else {
          notifyLines.push(`中转: ${relayIPStr}`);
          notifyLines.push(`落地: ${landingIPStr}`);
        }
        notifyLines.push(`策略: ${policyStr}`);
        if (showRTT) {
          notifyLines.push(`延迟: 🐾 ${baiduRTT !== null ? `${baiduRTT}ms` : '-'}  ☁️ ${nodeRTT !== null ? `${nodeRTT}ms` : '-'}`);
        }
        $notification.post('网络环境已变动', subTitle, notifyLines.join('\n'));
      }
    }
    $done();
    return;
  }

  // 7. 面板正常展示
  $done({
    title: panelTitle,
    content: panelContent,
    icon: ssid ? 'wifi' : (arg.ICON || 'network'),
    'icon-color': arg['ICON-COLOR'] || '#007AFF'
  });
})().catch((e) => {
  $done({
    title: '网络信息面板',
    content: `查询出错: ${e.message || e}`,
    icon: 'exclamationmark.triangle',
    'icon-color': '#FF3B30'
  });
});
