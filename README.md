# rule 分支

独立维护的分流规则分支，供 Surge、Loon 等客户端按支持的规则语法引用。此分支不包含节点、订阅凭据、插件、脚本或证书。

## 规则链接

| 用途 | 独立链接 |
| --- | --- |
| 1Password 代理 | [1password-proxy.list](https://raw.githubusercontent.com/Havoooc/surge-rules/rule/1password-proxy.list) |
| AI 服务代理 | [ai-proxy.list](https://raw.githubusercontent.com/Havoooc/surge-rules/rule/ai-proxy.list) |
| 中银香港直连 | [bochk-direct.list](https://raw.githubusercontent.com/Havoooc/surge-rules/rule/bochk-direct.list) |
| 自定义直连 | [custom-direct.list](https://raw.githubusercontent.com/Havoooc/surge-rules/rule/custom-direct.list) |
| 富途代理 | [futu-proxy.list](https://raw.githubusercontent.com/Havoooc/surge-rules/rule/futu-proxy.list) |
| 香港及美国券商代理 | [hk-broker-proxy.list](https://raw.githubusercontent.com/Havoooc/surge-rules/rule/hk-broker-proxy.list) |
| NAS 中国大陆直连（Surge 专用） | [nas-jp-direct.list](https://raw.githubusercontent.com/Havoooc/surge-rules/rule/nas-jp-direct.list) |
| PT 站点代理 | [pt-proxy.list](https://raw.githubusercontent.com/Havoooc/surge-rules/rule/pt-proxy.list) |
| Red Pocket AT&T Wi-Fi Calling | [redpocket-att-wificalling.list](https://raw.githubusercontent.com/Havoooc/surge-rules/rule/redpocket-att-wificalling.list) |
| TikTok 代理 | [tiktok-proxy.list](https://raw.githubusercontent.com/Havoooc/surge-rules/rule/tiktok-proxy.list) |
| YouTube 代理 | [youtube-proxy.list](https://raw.githubusercontent.com/Havoooc/surge-rules/rule/youtube-proxy.list) |

## 引用方法

Surge 示例：

```ini
RULE-SET,https://raw.githubusercontent.com/Havoooc/surge-rules/rule/custom-direct.list,DIRECT
RULE-SET,https://raw.githubusercontent.com/Havoooc/surge-rules/rule/ai-proxy.list,你的AI策略
```

Loon 示例（放在 `[Remote Rule]` 下）：

```ini
https://raw.githubusercontent.com/Havoooc/surge-rules/rule/custom-direct.list, policy=DIRECT, enabled=true
https://raw.githubusercontent.com/Havoooc/surge-rules/rule/ai-proxy.list, policy=你的AI策略, enabled=true
```

策略名称须与自己的配置一致；规则优先级由配置中的引用顺序决定。

`nas-jp-direct.list` 含 Surge 的逻辑组合、源 IP、嵌套 RULE-SET 及显式 DIRECT 策略，绑定 NAS 地址 192.168.5.5；其余流量的日本出口须在主配置另设。本文件不得作为通用 Loon 规则直接导入。其余列表保留原始语法，使用其他客户端前应确认兼容性；Clash 不可将这些链接直接作为节点订阅使用。

## 迁移与维护

规则从 [Havoooc/surge-rules](https://github.com/Havoooc/surge-rules) 的 `rules/` 独立迁入，首次迁移内容逐字保留。来源版本及 SHA-256 见 `migration.json`。

本分支为后续规则维护入口。main 分支原规则链接暂保留兼容，现有客户端不会自动切换到新链接；Surge 模块仍在 main 分支、Loon 插件仍在 loon 分支维护。
