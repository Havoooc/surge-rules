# 规则与脚本维护

稳定合集由 `modules/collection.json` 明确列出模块、版本号与版本日期。合集描述自动显示 `版本 v2026.10.02.1`，便于在 Surge 中确认安装版本。
每次发布合集时更新清单的 `version`（`YYYY.MM.DD.N`）和 `date`；同日发布递增末尾序号，新日期从 1 开始。构建不自动递增版本，以保证重复构建结果一致。新增文件不会自动进入合集。
雪球激进版独立保留，不并入稳定合集；要使用其业务副作用规则需单独选择。

修改独立模块后运行：

```
python3 scripts/build-all-in-one.py
python3 scripts/build-all-in-one.py --check
python3 scripts/validate.py
node scripts/test-responses.cjs
```

版本日期属于发布元数据，不能在构建时取系统日期。生成器对未知 section、未支持的 General/MITM 键、重复 section 和未映射模块参数拒绝构建，避免静默丢配置。

第三方 GitHub/Gist 脚本及贴吧规则集已锁定到完整 revision。
`scripts/external-scripts.lock.json` 记录 URL、版本固定状态和内容 SHA256；更新需在 PR 中重新取源、核对哈希并验证广告与正常业务样例。
网络资源检查不能替代设备实际响应验证，离线 CI 不依赖上游服务可用性。

12306 的 kelee.one 外部脚本目前返回 HTTP 403，且未找到经确认的不可变同源副本。
为保留现有功能暂不替换该引用；锁文件列明例外，该部分仍有可变上游风险。
需上游提供不可变版本或允许分发的源码，再审查后收录。没有凭空生成哈希或复制未知来源脚本。

设备刷新远程合集后才会使用新规则；合集与独立去广告模块不应同时启用。
MITM 私钥、ca-p12、ca-passphrase、控制器密码、Token 和订阅地址不得写入仓库或测试样例。

2026.10.02.2：酷安详情/评论原样放行，仅按明确赞助模板过滤首页；知乎不安全整数响应原样放行。语义检查归并为单一入口，检查括号、端口区间与规则选项。B 站动态 Protobuf 大响应处理仍需设备测量后确定上限。
