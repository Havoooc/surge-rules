# Havoooc Loon 独立插件

本分支为 `loon`，目前按需转换以下三个插件。Surge 原版继续在 [`main` 分支](https://github.com/Havoooc/surge-rules/tree/main)维护。

适用于 **Loon 3.5.1（Build 978）及以上版本**。每个插件可以单独安装，无需安装其他插件或合集。

| 插件 | 功能 | 插件文件 | 一键安装 |
| --- | --- | --- | --- |
| 国内银行 VPN 兼容 | 网络兼容与真实 IP；无需 MitM | [原始链接](https://raw.githubusercontent.com/Havoooc/surge-rules/loon/plugins/bank-vpn-compat.lpx) | [安装到 Loon](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2FHavoooc%2Fsurge-rules%2Floon%2Fplugins%2Fbank-vpn-compat.lpx) |
| 东方财富去广告 | 开屏、活动素材、广告与追踪域名 | [原始链接](https://raw.githubusercontent.com/Havoooc/surge-rules/loon/plugins/eastmoney-adblock.lpx) | [安装到 Loon](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2FHavoooc%2Fsurge-rules%2Floon%2Fplugins%2Feastmoney-adblock.lpx) |
| 米家去广告 | 开屏、首页轮播、“我的”推广 | [原始链接](https://raw.githubusercontent.com/Havoooc/surge-rules/loon/plugins/mijia.lpx) | [安装到 Loon](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2FHavoooc%2Fsurge-rules%2Floon%2Fplugins%2Fmijia.lpx) |

也可以复制“原始链接”，在 Loon → 插件 → 添加插件中导入。三个链接均指向 `loon` 分支，不依赖个人订阅或 VPS。

## 使用说明

- **银行兼容插件**不包含 MitM、不解密银行流量。部分银行直接读取系统 VPN 状态，插件不能保证绕过此类检测。
- **东方财富和米家**需要开启 Loon 的 MitM 与 Rewrite，并在系统中安装、信任自己的 Loon CA 证书。插件只声明需要解密的域名，不包含证书或私钥。
- 已安装同一 App 的其他去广告插件时，先停用对应旧插件，避免重复处理。
- 东方财富启用后如仍显示历史广告，可清理广告缓存并冷启动 App。

## 转换与验证

转换来源为 Surge 合集中的三个独立模块，基准提交 [`03683bf`](https://github.com/Havoooc/surge-rules/commit/03683bf)。实现均为 Loon 原生规则，无远程 JavaScript 依赖。

转换说明及验证边界见 [转换记录](docs/loon-conversion.md)。现阶段完成静态语法与规则对应检查，尚未在 iOS Loon 和相关 App 中完成实际使用验证。

依据：[Loon 插件](https://nsloon.app/docs/Plugin/)、[原生 Rewrite](https://nsloon.app/docs/Rewrite/rewrite_v2/)、[安装 URL Scheme](https://nsloon.app/docs/Scheme/)。
