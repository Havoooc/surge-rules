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

## 模块安装

在 Surge 的模块管理页面使用以下格式安装：

```text
https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/<模块文件名>.sgmodule
```

当前包含：

- 国内银行 VPN 兼容
- HTTPDNS 拦截（稳妥版）
- 携程旅行去广告
- 东方财富去广告
- 滴滴出行去广告
- 抖音去开屏广告（稳定版）：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/douyin-splash-adblock.sgmodule>
- 金十数据去广告
- 京东去广告
- 拼多多去广告（稳定增强版）：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/pinduoduo-adblock.sgmodule>
- 米家去广告
- 美团去广告（稳定增强版）：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/meituan-adblock.sgmodule>
- QQ 音乐去广告
- 航旅纵横去广告
- 微信小程序去广告
- 闲鱼去广告
- 雪球去广告（激进版）：<https://raw.githubusercontent.com/Havoooc/surge-rules/main/modules/xueqiu-adblock-aggressive.sgmodule>
- YouTube 推荐去广告（不含视频贴片广告）

## 注意事项

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
