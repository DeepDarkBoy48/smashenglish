---
status: active
scope: personal
description: React19前端＋FastAPI后端；已统一Work、优化并发布ZGo。
created: 2026-08-26
updated: 2026-11-01
---
# SmashEnglish 工作记录

## 目标和当前进度

完整前后端同一Work维护。F001已完成工程验证、GitHub推送和ZGo发布，等待用户真实使用反馈（7/8项）；没有再拆分Work或微服务。

## 生命周期

2026-08-26已有英语前后端monorepo；2026-09-10迁入work/repos；既有功能与原提交历史全部沿用。2026-11-01补齐WORK与F001，确认本地三份后端源文件与线上SHA256一致后改进并发布。

## 验证状态

| 项目 | 当前证据 | 最近验证 |
| --- | --- | --- |
| 构建/离线测试 | 前后端通过；详见F001日记 | 2026-11-01 |
| 当前运行 | ZGo正式前后端运行，健康/只读API和浏览器切页通过 | 2026-11-01 |
| 性能实测 | FastAPI约75 MiB；前端约4 MiB。24个纯DB接口移入工作线程，3项离线并发/连接生命周期测试通过。 短时结果 | 2026-11-01 |
| GitHub与部署 | 部署代码`3c4425b627a0`，原容器/配置/数据库备份保留 | 2026-11-01 |
| 完整AI业务与长期负载 | 未发送测试消息/付费调用，待真实使用反馈 | 2026-11-01 |

## 运行入口

- GitHub：https://github.com/DeepDarkBoy48/smashenglish
- 站点：https://learn.nanopixel.uk
- 服务器源码：/root/smashenglish
- [部署和回滚](docs/deployment/README.md)
- [设计中心](docs/design/index.html)
- [本期Spec](docs/features/F001-migration-performance-release/simple-spec.md)
- [实现与验证日记](docs/features/F001-migration-performance-release/development-log.md)

## 后续

正常使用并收集反馈；大文件AI并发和长期资源另行按需验证，保留原数据库与代理运行链路。
