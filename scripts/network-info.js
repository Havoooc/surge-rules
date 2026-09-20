/**
 * 网络信息面板 (Surge 5 深度定制重构版)
 * 简洁显示网络环境、国内直连、中转入口、代理落地、中文运营商与实际策略。
 * 支持网络变动后台提醒（Event: network-changed）与持久化中转归属地缓存。
 * 
 * 原作者: @xream @keywos
 * 重构优化: Havoooc (无 IP 展示、中文化链路摘要、精确策略识别、网络切换通知与接口超时保护)
 */

const DEFAULT_ARGS = {
  NOTIFY: '1',          // 1: 网络状态切换时发送通知 (默认); 0: 静默
  RTT: '0',             // 1: 测速显示往返延迟; 0: 不测速 (默认)
  'PROXY-POLICY': 'AUTO',
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
      try {
        arg[k] = decodeURIComponent(v);
      } catch (e) {
        arg[k] = v;
      }
    }
  });
}

const showRTT = arg.RTT === '1';
const proxyPolicy = arg['PROXY-POLICY'] && arg['PROXY-POLICY'].toUpperCase() !== 'AUTO'
  ? arg['PROXY-POLICY']
  : '';
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
async function getNodeRTT(policy) {
  const rtt = await testRTT('https://cp.cloudflare.com/generate_204', 2.5, policy);
  if (rtt !== null) return rtt;
  return await testRTT('https://www.google.com/generate_204', 2.5, policy);
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

const GEO_ZH = {
  'united states': '美国', 'california': '加利福尼亚', 'los angeles': '洛杉矶',
  'san jose': '圣何塞', 'seattle': '西雅图', 'new york': '纽约',
  'japan': '日本', 'tokyo': '东京', 'tokyo-to': '东京', 'osaka': '大阪',
  'singapore': '新加坡', 'hong kong': '香港', 'taiwan': '台湾',
  'south korea': '韩国', 'seoul': '首尔', 'germany': '德国',
  'frankfurt': '法兰克福', 'united kingdom': '英国', 'london': '伦敦',
  'netherlands': '荷兰', 'amsterdam': '阿姆斯特丹', 'canada': '加拿大',
  'australia': '澳大利亚'
};

function toChineseGeo(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/[\u3400-\u9fff]/.test(text)) return text;
  return GEO_ZH[text.toLowerCase()] || '';
}

function formatDetailedLoc(country, region, city) {
  const parts = [country, region, city].map(toChineseGeo).filter(Boolean);
  return parts.filter((value, index) => parts.indexOf(value) === index).join(' ');
}

function formatChineseProvider(data) {
  if (!data) return '';
  const source = String(data.org || data.isp || '');
  const mappings = [
    [/China Mobile/i, '中国移动'], [/China Telecom/i, '中国电信'],
    [/China Unicom/i, '中国联通'], [/Cox Communications/i, '考克斯通信'],
    [/Comcast/i, '康卡斯特'], [/SoftBank/i, '软银'],
    [/NTT/i, '日本电信'], [/PCCW/i, '电讯盈科'], [/HKT/i, '香港电讯'],
    [/Amazon|AWS/i, '亚马逊云'], [/Google/i, '谷歌云'],
    [/Microsoft/i, '微软云'], [/Oracle/i, '甲骨文云'],
    [/Cloudflare/i, '云服务商'], [/Akamai/i, '阿卡迈'],
    [/DMIT/i, '海外云服务商'], [/VMISS/i, '海外网络服务商'],
    [/Cogent/i, '国际骨干网络'], [/Hurricane Electric/i, '国际网络服务商'],
    [/Tata/i, '塔塔通信'], [/GTT/i, '国际网络服务商'],
    [/Quadranet|DataCamp/i, '海外数据中心']
  ];
  const matched = mappings.find(([pattern]) => pattern.test(source));
  if (matched) return matched[1];
  const chinese = source.match(/[\u3400-\u9fff]+/g);
  return chinese ? chinese.join('') : '';
}

function formatAccessType(ssid, radio, primaryInterface) {
  if (ssid) return '无线网络';
  const value = String(radio || '').toUpperCase();
  if (value.includes('5G')) return '第五代移动网络';
  if (value.includes('LTE') || value.includes('4G')) return '第四代移动网络';
  if (value.includes('3G')) return '第三代移动网络';
  if (primaryInterface) return '有线网络';
  return '蜂窝网络';
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

// 获取代理落地出口信息；唯一探测标识用于精确匹配本次 Surge 请求记录。
async function getLandingInfo(probeToken, policy) {
  try {
    const options = {
      url: 'https://ipwho.is/?lang=zh-CN&surge_probe=' + encodeURIComponent(probeToken),
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }
    };
    if (policy) options.policy = policy;
    const res = await httpGet(options);
    if (res.body) {
      const json = JSON.parse(res.body);
      if (json.success !== false && json.ip) {
        const connection = json.connection || {};
        return {
          ip: json.ip,
          countryCode: json.country_code,
          country: json.country || '',
          region: json.region || '',
          city: json.city || '',
          type: json.type || '',
          asn: connection.asn || '',
          org: connection.org || '',
          isp: connection.isp || ''
        };
      }
    }
  } catch (e) {}

  return null;
}

// 查询中转入口 IP 的详细归属信息（带 1 小时持久化缓存）
async function getRelayInfo(ip) {
  if (!ip) return null;

  const CACHE_KEY = 'network_info_relay_cache';
  const ONE_HOUR = 3600 * 1000;
  let cache = {};

  try {
    const raw = $persistentStore.read(CACHE_KEY);
    if (raw) cache = JSON.parse(raw);
    if (cache[ip] && (Date.now() - cache[ip].time < ONE_HOUR)) {
      if (cache[ip].data) return { ...cache[ip].data, ip };
      return { ip, loc: cache[ip].loc || '' };
    }
  } catch (e) {}

  let data = null;
  try {
    const res = await httpGet({
      url: 'https://ipwho.is/' + encodeURIComponent(ip) + '?lang=zh-CN',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (res.body) {
      const json = JSON.parse(res.body);
      if (json.success !== false && json.ip) {
        const connection = json.connection || {};
        data = {
          ip,
          countryCode: json.country_code || '',
          country: json.country || '',
          region: json.region || '',
          city: json.city || '',
          loc: formatDetailedLoc(json.country, json.region, json.city),
          type: json.type || '',
          asn: connection.asn || '',
          org: connection.org || '',
          isp: connection.isp || ''
        };
      }
    }
  } catch (e) {}


  if (data) {
    try {
      cache[ip] = { data, time: Date.now() };
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

  return data || { ip, loc: '' };
}

function extractProxyAddress(remoteAddress) {
  if (!remoteAddress || !remoteAddress.includes('(Proxy)')) return '';
  const raw = remoteAddress.replace(/\s*\(Proxy\)\s*/, '').trim();
  const bracketed = raw.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) return bracketed[1];
  if (/^[^:]+:\d+$/.test(raw)) return raw.replace(/:\d+$/, '');
  return raw;
}

// 精确匹配本次探测请求；内部接口无响应时在 1.2 秒后降级。
function getRecentPolicy(probeToken) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = result => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    if (typeof $httpAPI === 'undefined') {
      return finish({ policy: '', entrance: '' });
    }

    setTimeout(() => finish({ policy: '', entrance: '' }), 1200);

    $httpAPI('GET', '/v1/requests/recent', null, (res) => {
      try {
        const reqs = (res && res.requests) || [];
        const proxyReq = reqs.find(r => String(r.URL || '').includes(probeToken));
        if (proxyReq) {
          return finish({
            policy: proxyReq.policyName || '',
            entrance: extractProxyAddress(proxyReq.remoteAddress)
          });
        }
        finish({ policy: '', entrance: '' });
      } catch (e) {
        finish({ policy: '', entrance: '' });
      }
    });
  });
}

// 主流程
!(async () => {
  // 1. 获取本地网络接口与无线网络名称
  let ssid = '';
  let lanIP = '';
  let lanIPv6 = '';
  let primaryInterface = '';
  let radio = '';

  if (typeof $network !== 'undefined' && $network) {
    if ($network.wifi && $network.wifi.ssid) {
      ssid = $network.wifi.ssid;
    }
    if ($network.v4 && $network.v4.primaryAddress) {
      lanIP = $network.v4.primaryAddress;
      primaryInterface = $network.v4.primaryInterface || '';
    }
    if ($network.v6 && $network.v6.primaryAddress) {
      lanIPv6 = $network.v6.primaryAddress;
    }
    const cellular = $network['cellular-data'] || {};
    radio = cellular.radio || '';
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
      content: '设备未接入任何网络\n请检查无线网络或蜂窝移动数据设置',
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
  const probeToken = 'network-info-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const tasks = [
    getDomesticInfo(),
    getLandingInfo(probeToken, proxyPolicy),
    showRTT ? getDomesticRTT() : Promise.resolve(null),
    showRTT ? getNodeRTT(proxyPolicy) : Promise.resolve(null)
  ];

  const [direct, landing, baiduRTT, nodeRTT] = await Promise.all(tasks);
  const { policy, entrance } = await getRecentPolicy(probeToken);

  // 3. 研判并查询中转入口节点
  let relayData = null;
  const sameExit = Boolean(landing && direct && landing.ip === direct.ip);
  const isDirectMode = policy === 'DIRECT' || sameExit;
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
  const directSummary = direct
    ? `${directLoc || '中国大陆'}${direct.isp ? ' · ' + direct.isp : ''}`.trim()
    : '信息获取失败';

  // 中转入口仅保留中文地区与可识别的中文运营商
  let relaySummary = '';
  let relayProvider = '';
  if (isDirectMode) {
    relaySummary = '未启用代理';
  } else if (relayData && relayData.loc) {
    relaySummary = relayData.loc;
    relayProvider = formatChineseProvider(relayData);
  } else {
    relaySummary = '未检测到独立中转';
  }

  // 代理落地仅保留中文地区与可识别的中文运营商
  let landingSummary = '信息获取失败';
  let landingProvider = '';
  if (landing) {
    if (direct && landing.ip === direct.ip) {
      landingSummary = '与直连相同';
    } else {
      const landingLoc = formatDetailedLoc(landing.country, landing.region, landing.city);
      landingSummary = landingLoc || '境外出口';
      landingProvider = formatChineseProvider(landing);
    }
  }

  // 策略行
  const policyStr = policy || proxyPolicy || (sameExit ? 'DIRECT' : '未识别');

  // 5. 层次化分段排版（两段式，中间空行，呼吸感更足）
  let routeSection = [];
  if (isDirectMode) {
    routeSection = [
      `🇨🇳 直连：${directSummary}`,
      `🔀 代理：未启用代理`
    ];
  } else {
    routeSection = [
      `🇨🇳 直连：${directSummary}`,
      `🔀 中转：${relaySummary}`
    ];
    if (relayProvider) routeSection.push(`　　运营商：${relayProvider}`);
    routeSection.push(`${flag} 落地：${landingSummary}`);
    if (landingProvider) routeSection.push(`　　运营商：${landingProvider}`);
  }

  const accessType = formatAccessType(ssid, radio, primaryInterface);
  const infoSection = [
    `🧭 策略：${policyStr}`,
    `📡 接入：${accessType}`
  ];

  if (showRTT) {
    const baiduStr = baiduRTT !== null ? `${baiduRTT} 毫秒` : '超时';
    const nodeStr = nodeRTT !== null ? `${nodeRTT} 毫秒` : '超时';
    const baiduDot = getHealthDot(baiduRTT);
    const nodeDot = getHealthDot(nodeRTT);
    infoSection.push(`🐾 国内延迟：${baiduStr} ${baiduDot}`);
    infoSection.push(`☁️ 代理延迟：${nodeStr} ${nodeDot}`);
  }

  // 链路信息与策略测速之间空一行分隔
  const panelContent = [routeSection.join('\n'), infoSection.join('\n')].join('\n\n');
  const panelTitle = `📶 ${accessType}`;

  // 6. 网络变动事件处理 (Event: network-changed)
  if (isEvent) {
    let lastState = null;
    try {
      const saved = $persistentStore.read('network_info_last_state');
      if (saved) lastState = JSON.parse(saved);
    } catch (e) {}

    const currentState = {
      ssid: ssid,
      interface: primaryInterface,
      directIP: direct ? direct.ip : (lastState ? lastState.directIP : ''),
      entrance: entrance || (lastState ? lastState.entrance : ''),
      landingIP: landing ? landing.ip : (lastState ? lastState.landingIP : ''),
      policy: policyStr
    };

    const isChanged = Boolean(lastState) && (
                      lastState.ssid !== currentState.ssid || 
                      lastState.interface !== currentState.interface ||
                      lastState.directIP !== currentState.directIP || 
                      lastState.landingIP !== currentState.landingIP ||
                      lastState.entrance !== currentState.entrance ||
                      lastState.policy !== currentState.policy);

    $persistentStore.write(JSON.stringify(currentState), 'network_info_last_state');
    if (isChanged && arg.NOTIFY === '1') {
        const subTitle = `${accessType} ｜ ${policyStr}`;
        const notifyLines = [`直连：${directSummary}`];
        if (isDirectMode) {
          notifyLines.push('代理：未启用代理');
        } else {
          notifyLines.push(`中转：${relaySummary}`);
          if (relayProvider) notifyLines.push(`中转运营商：${relayProvider}`);
          notifyLines.push(`落地：${landingSummary}`);
          if (landingProvider) notifyLines.push(`落地运营商：${landingProvider}`);
        }
        notifyLines.push(`策略：${policyStr}`);
        if (showRTT) {
          notifyLines.push(`延迟：国内 ${baiduRTT !== null ? `${baiduRTT} 毫秒` : '超时'}，代理 ${nodeRTT !== null ? `${nodeRTT} 毫秒` : '超时'}`);
        }
        $notification.post('网络环境已变动', subTitle, notifyLines.join('\n'));
    }
    $done();
    return;
  }

  // 面板刷新时同步当前基线，后续网络切换只通知真实变化。
  try {
    $persistentStore.write(JSON.stringify({
      ssid,
      interface: primaryInterface,
      directIP: direct ? direct.ip : '',
      entrance: entrance || '',
      landingIP: landing ? landing.ip : '',
      policy: policyStr
    }), 'network_info_last_state');
  } catch (e) {}

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
