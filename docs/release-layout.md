# 发布资源与维护依赖

本仓库 `main` 是发布来源，使用 `https://raw.githubusercontent.com/Havoooc/surge-rules/main/` 作为 URL 前缀。目录和文件名是客户端接口；移动或删除前先核查设备和间接依赖，并提供迁移期。

| 路径 | 用途 |
| --- | --- |
| `rules/*.list` | Mac、iPhone、TV 配置引用的分流规则；策略由客户端指定 |
| `modules/all-in-one-adblock.sgmodule` | 从清单生成的去广告合集发布文件 |
| `modules/collection.json` 和清单内的 `.sgmodule` | 合集的构建清单与源文件 |
| `modules/network-info.sgmodule` | 网络信息面板 |
| `modules/ultra-paygo-wifi-calling.sgmodule` | Red Pocket AT&T Wi-Fi Calling 模块 |
| `scripts/*.js` | 模块引用的运行脚本 |
| `scripts/build-all-in-one.py`、`scripts/validate.py`、`scripts/test-responses.cjs` | 构建和验证工具 |
| `scripts/external-scripts.lock.json` | 上游资源版本和校验记录 |
| `.github/workflows/` | 自动验证 |

## 发布检查

1. 确认三份设备配置和设备实际启用的模块；不要把模块源文件误认成无依赖文件。
2. 变更合集源时按 `security-maintenance.md` 更新版本，重新构建并检查生成文件。
3. 执行 `python3 scripts/build-all-in-one.py --check`、`python3 scripts/validate.py` 和 `node scripts/test-responses.cjs`。
4. 核对公开文件没有凭据，提交并运行 CI。确认发布 URL 可取回后，再修改设备引用并验证；保留回滚入口。

2026-11-01 盘点：Mac 和 iPhone 的在线状态已检查，iPhone 使用合集、网络信息面板和 Wi-Fi Calling；TV 以 iCloud 配置及用户此前确认的无模块情况为依据。三份配置目前已引用 `main/rules/`；请勿恢复已不存在的 `rule` 分支链接。
