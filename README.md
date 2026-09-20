# surge-rules

从 [Havoooc/loon-rules](https://github.com/Havoooc/loon-rules) 转换并维护的 Surge 规则集与模块。

## 目录

- `rules/`：可通过 Surge `RULE-SET` 引用的远程规则集。
- `modules/`：Surge 模块（`.sgmodule`）。
- `scripts/`：模块使用的 Surge JavaScript。

## 规则集

### 中银香港直连

```ini
RULE-SET,https://raw.githubusercontent.com/Havoooc/surge-rules/main/rules/bochk-direct.list,DIRECT
```

该规则应置于其他香港金融、代理及 `FINAL` 规则之前。

### 富途代理

```ini
RULE-SET,https://raw.githubusercontent.com/Havoooc/surge-rules/main/rules/futu-proxy.list,你的代理策略
```

### 1Password 代理

```ini
RULE-SET,https://raw.githubusercontent.com/Havoooc/surge-rules/main/rules/1password-proxy.list,你的代理策略
```

### NAS 分流

```ini
RULE-SET,https://raw.githubusercontent.com/Havoooc/surge-rules/main/rules/nas-jp-direct.list,DIRECT
```

中国大陆直连，其余固定走日本直连节点。

### YouTube 分流

```ini
RULE-SET,https://raw.githubusercontent.com/Havoooc/surge-rules/main/rules/youtube-proxy.list,▶️ YouTube
```

在 Surge 中指定 `▶️ YouTube` 策略组。

## 模块安装

在 Surge 的模块管理页面使用以下格式安装：

```text
https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/<模块文件名>.sgmodule
```

### 全能合集（推荐）

- Havoc全能去广告合集：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/all-in-one-adblock.sgmodule>

### 独立模块

如仅需对特定 App 生效，可单独安装对应模块（请勿与全能合集同时启用相同模块）：

- 百度网盘去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/baidunetdisk-adblock.sgmodule>
- 百度贴吧去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/tieba-adblock.sgmodule>
- 哔哩哔哩去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/bilibili-adblock.sgmodule>
- 大众点评去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/dianping-adblock.sgmodule>
- 滴滴出行去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/didi-adblock.sgmodule>
- 东方财富去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/eastmoney-adblock.sgmodule>
- 抖音去开屏广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/douyin-splash-adblock.sgmodule>
- 高德地图去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/amap-adblock.sgmodule>
- 国内银行 VPN 兼容：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/bank-vpn-compat.sgmodule>
- 航旅纵横去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/umetrip.sgmodule>
- 盒马去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/hema-adblock.sgmodule>
- HTTPDNS 拦截：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/httpdns-block-safe.sgmodule>
- 京东去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/jd-adblock.sgmodule>
- 金十数据去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/jin10.sgmodule>
- 肯德基去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/kfc-adblock.sgmodule>
- 酷安去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/coolapk-adblock.sgmodule>
- 美团去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/meituan-adblock.sgmodule>
- 米家去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/mijia.sgmodule>
- 拼多多去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/pinduoduo-adblock.sgmodule>
- QQ 音乐去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/qqmusic-adblock.sgmodule>
- 什么值得买去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/smzdm-adblock.sgmodule>
- 淘宝去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/taobao-adblock.sgmodule>
- 淘宝闪购去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/taobao-instant-adblock.sgmodule>
- 唯品会去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/vipshop-adblock.sgmodule>
- 微信公众号去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/wechat-mp-adblock.sgmodule>
- 微信小程序去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/wechat-miniprograms-ads-stable.sgmodule>
- 微博去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/weibo-adblock.sgmodule>
- 闲鱼去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/xianyu-adblock.sgmodule>
- 小红书去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/xiaohongshu-adblock.sgmodule>
- 携程旅行去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/ctrip-adblock.sgmodule>
- 雪球去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/xueqiu-adblock-aggressive.sgmodule>
- 知乎去广告：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/zhihu-adblock.sgmodule>
- YouTube 增强：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/youtube-feed-adblock.sgmodule>

### 工具与面板

- 网络信息面板：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/network-info.sgmodule>


## 注意事项

- 运行 `python3 scripts/build-all-in-one.py` 即可一键将所有独立模块自动解析合并并更新 `all-in-one-adblock.sgmodule`，避免人工同步排版错误。
- YouTube 增强模块包含 `*.googlevideo.com` 解密，为避免影响 Apple TV 及海外流媒体 CDN 视频缓冲，保持为独立可选模块，不强行并入全能合集。
- 合集与独立模块同步范围包括 `[General]` 段（skip-proxy、always-real-ip）；银行 VPN 兼容依赖这些设置生效，仅在独立模块启用时二者不可叠加产生冲突。
- Rewrite、Map Local、Body Rewrite 和脚本模块需要开启 MITM，并在设备上安装及信任 Surge CA。
- 模块启用前请检查其 MITM 主机范围；银行兼容模块本身不解密银行业务流量。
- `Body Rewrite` 中的 JQ 规则需要较新的 Surge iOS/macOS 核心。
- 模块启用状态不会在不同设备间自动同步。

## 转换说明

- Loon `real-ip` 已转换为 Surge `always-real-ip`。
- Loon `mock-response-body` / `reject-dict` / `reject-img` 已转换为 Surge `Map Local`。
- Loon JSON 删除与 JQ 重写已转换为 Surge `Body Rewrite`。
- Loon 脚本声明已转换为 Surge `[Script]` 语法；航旅纵横脚本改为请求阶段返回本地响应。

使用前请自行验证规则是否仍与目标 App 的当前版本兼容。
