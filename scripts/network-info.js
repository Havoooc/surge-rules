/**
 * 网络信息面板 (Surge 5 现代化定制版)
 * 实时监测当前网络环境、SSID、内网IP、国内直连与代理落地出口、ISP运营商及真实延迟测速。
 * 支持网络变动后台提醒（Event: network-changed）与隐私打码保护。
 * 
 * 原作者: @xream @keywos
 * 重构优化: Havoooc (移除多余胶水层，内化高可用双接口并发，优化排版与延迟测速)
 */

const DEFAULT_ARGS = {
  MASK: '1',            // 1: 开启 IP 打码保护; 0: 显示完整 IP
  IPv6: '0',            // 1: 显示 IPv6; 0: 不显示
  NOTIFY: '1',          // 1: 网络变动时发送通知; 0: 静默
  RTT: '1',             // 1: 测速显示往返延迟; 0: 不测速
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

// 基础工具函数
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

function testRTT(url) {
  const start = Date.now();
  return new Promise((resolve) => {
    $httpClient.get({ url, timeout: 2.5 }, (err) => {
      if (err) return resolve(null);
      resolve(Date.now() - start);
    });
  });
}

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

// 获取国内直连出口信息（网易高可用主接口 + B站客制化接口备选）
async function getDomesticInfo() {
  try {
    const res = await httpGet({
      url: 'https://dashi.163.com/fgw/mailsrv-ipdetail/detail',
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
          isp: r.isp || r.org || ''
        };
      }
    }
  } catch (e) {}

  try {
    const res = await httpGet({
      url: 'https://api.live.bilibili.com/ip_service/v1/ip_service/get_ip_addr',
      headers: { 'User-Agent': 'bili-universal/65100300' }
    });
    if (res.body) {
      const json = JSON.parse(res.body);
      const d = json.data;
      if (d && d.addr) {
        return {
          ip: d.addr,
          country: d.country || '中国',
          province: d.province || '',
          city: d.city || '',
          isp: d.isp || ''
        };
      }
    }
  } catch (e) {}

  return null;
}

// 获取代理落地出口信息（ipwho.is 权威主接口 + ip-api 备选）
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
          city: json.city || '',
          isp: (json.connection && (json.connection.isp || json.connection.org)) || ''
        };
      }
    }
  } catch (e) {}

  try {
    const res = await httpGet({
      url: 'http://ip-api.com/json?lang=zh-CN',
      headers: { 'User-Agent': 'curl/8.0' }
    });
    if (res.body) {
      const json = JSON.parse(res.body);
      if (json.status === 'success' && json.query) {
        return {
          ip: json.query,
          countryCode: json.countryCode,
          country: json.country || '',
          city: json.city || json.regionName || '',
          isp: json.isp || json.org || ''
        };
      }
    }
  } catch (e) {}

  return null;
}

// 从 Surge 最近请求中识别代理策略名与中转/专线入口 IP
function getRecentPolicy() {
  return new Promise((resolve) => {
    if (typeof $httpAPI === 'undefined') {
      return resolve({ policy: '', entrance: '' });
    }
    $httpAPI('GET', '/v1/requests/recent', null, (res) => {
      try {
        const reqs = (res && res.requests) || [];
        const proxyReq = reqs.find(r => /ipwho\.is|ip-api\.com|cloudflare\.com/.test(r.URL));
        if (proxyReq) {
          let entrance = '';
          if (proxyReq.remoteAddress && proxyReq.remoteAddress.includes('(Proxy)')) {
            entrance = proxyReq.remoteAddress.replace(/\s*\(Proxy\)\s*/, '');
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
  // 1. 获取本地网络接口与 SSID
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

  // 2. 并发拉取出口信息与延迟测速
  const tasks = [
    getDomesticInfo(),
    getLandingInfo(),
    showRTT ? testRTT('https://connectivitycheck.platform.hicloud.com/generate_204') : Promise.resolve(null),
    showRTT ? testRTT('https://cp.cloudflare.com/generate_204') : Promise.resolve(null)
  ];

  const [direct, landing, directRTT, proxyRTT] = await Promise.all(tasks);
  const { policy, entrance } = await getRecentPolicy();

  // 格式化展示文本
  const flag = landing ? getFlag(landing.countryCode) : '🌐';
  const directIPStr = direct ? `${maskIP(direct.ip)} ${direct.province}${direct.city ? ' ' + direct.city : ''} · ${direct.isp}` : '获取失败';
  
  let landingIPStr = '获取失败';
  if (landing) {
    if (direct && landing.ip === direct.ip) {
      landingIPStr = `${maskIP(landing.ip)} 与直连相同 (未走代理)`;
    } else {
      landingIPStr = `${maskIP(landing.ip)} ${landing.country}${landing.city ? ' ' + landing.city : ''} · ${landing.isp}`;
    }
  }

  // 策略行格式化
  let policyStr = policy ? policy : 'DIRECT';
  if (entrance && direct && entrance !== direct.ip && landing && entrance !== landing.ip) {
    policyStr += ` [中转: ${maskIP(entrance)}]`;
  }

  // 延迟测速
  let rttSummary = '';
  if (showRTT) {
    const dStr = directRTT !== null ? `${directRTT}ms` : '超时';
    const pStr = proxyRTT !== null ? `${proxyRTT}ms` : '超时';
    rttSummary = `国内 ${dStr} | 节点 ${pStr}`;
  }

  // 构建面板内容
  const lines = [
    `🇨🇳 直连: ${directIPStr}`,
    `${flag} 落地: ${landingIPStr}`,
    `🧭 策略: ${policyStr}`
  ];

  if (showRTT && rttSummary) {
    lines.push(`⚡ 延迟: ${rttSummary}`);
  }

  if (showIPv6 && lanIPv6) {
    lines.push(`🌐 IPv6: ${maskIP(lanIPv6)}`);
  }

  const panelTitle = `📶 ${ssid ? ssid : '蜂窝移动网络'}${lanIP ? ` (${lanIP})` : ''}`;
  const panelContent = lines.join('\n');

  // 3. 网络变动事件处理 (Event: network-changed)
  if (isEvent) {
    const currentState = {
      ssid: ssid,
      directIP: direct ? direct.ip : '',
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
                      lastState.policy !== currentState.policy;

    if (isChanged) {
      $persistentStore.write(JSON.stringify(currentState), 'network_info_last_state');
      if (arg.NOTIFY === '1') {
        const subTitle = `${ssid ? `WiFi: ${ssid}` : '蜂窝网络'} | 直连 ➟ ${flag} 落地`;
        const notifyBody = `直连: ${directIPStr}\n落地: ${landingIPStr}\n策略: ${policyStr}`;
        $notification.post('网络环境已变动', subTitle, notifyBody);
      }
    }
    $done();
    return;
  }

  // 4. 面板正常展示
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
