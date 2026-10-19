> Loon 插件已迁移至 https://github.com/Havoooc/loon-rule ，本分支不再提供插件文件。

# Loon 转换记录

日期：2026-10-20。分支：`loon`。仅转换用户选择的银行兼容、东方财富、米家，其他 Surge 模块不生成 Loon 插件。

## 对应关系

| Surge 源文件 | Loon 插件 | 规则对应 |
| --- | --- | --- |
| `modules/bank-vpn-compat.sgmodule` | `plugins/bank-vpn-compat.lpx` | 9 个 HTTP Proxy 绕过项、5 个真实 IP 项、1 条拒绝规则 |
| `modules/eastmoney-adblock.sgmodule` | `plugins/eastmoney-adblock.lpx` | 7 条域名拒绝、4 条 URL 响应、3 个 MitM 域名 |
| `modules/mijia.sgmodule` | `plugins/mijia.lpx` | 1 条域名拒绝、2 条 URL 响应、1 个 MitM 域名 |

## 语义转换

- Loon 插件的 `skip-proxy` 列表会与主配置合并，移除 Surge `%APPEND%` 标记。
- Surge `always-real-ip` 转为 Loon `real-ip`，仅改变 DNS 返回值，不增加 DIRECT 分流或扩大 TUN 绕过范围。
- `[Rule]` 的 `DOMAIN,...,REJECT` 原样保留。
- `[Map Local]` 的空对象响应转为 `request if ${url} ~= /.../ then reject_dict(200)`，保留原 URL 正则和空对象正文，并明确使用 JSON Content-Type。
- `tiny-gif` 转为 `reject_img(200)`，返回 Loon 原生 1×1 GIF。
- `[MITM]` 转为 `[Mitm]`，去掉 `%APPEND%`，域名范围不变。
- 插件无需外部脚本、个人节点、订阅令牌或 CA 私钥。

## 验证边界

离线检查涵盖源文件与插件的域名、正则、响应类型、200 状态码、MitM 范围和 General 列表对应关系；仓库原有校验继续运行。

本地没有 Loon 官方离线配置编译器。静态检查不能替代在 Loon 中导入及在 App 中验证，尤其不能保证所有银行的 VPN 检测都可绕过。没有改动用户 iCloud 配置，也没有自动安装插件。
