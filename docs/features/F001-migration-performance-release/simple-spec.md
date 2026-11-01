---
feature: F001-migration-performance-release
mode: simple
status: in_progress
branch: main
---
# SmashEnglish：Work整理、性能改进与发布

## Summary

用户授权将两个完整应用分别纳入Work，保留前后端同仓，检查可启动性和性能，改进后推送GitHub并部署ZGo。原目录和数据保留，当前代理服务保持运行。

## Key Changes

- React与FastAPI英语学习应用。沿用现有协议、数据库结构、域名和前端功能；不做微服务拆分或数据库更换。
- Discord代码取已核验在用JAR对应的新目录DiscordAiBot，保留当前未提交源码；Vue来自robinblog。原Git历史保留原位置，通过提交和清单追溯，不把凭据历史导入新仓。
- SmashEnglish沿用现有Work和Git，核对实际线上前后端再发布。
- 从实测/代码定位内存、阻塞I/O、缓存、日志或连接问题，实施可验证的小范围改进；配置和密钥解耦，GitHub只含可共享源代码。
- 构建、隔离启动、回归后发布，按服务保留原镜像和运行参数，失败回滚；不重建MySQL/Redis/RabbitMQ/Chroma或Marzban。

## 需求清单

- [ ] 源码与线上版本关系、单体/模块架构核验
- [ ] 一个Work包含完整前后端，原件与来源可追溯
- [ ] 性能改进、凭据隔离和必要中文注释
- [ ] 构建及本地/隔离启动与主要只读接口验证
- [ ] GitHub提交推送
- [ ] ZGo备份、发布、回归及代理连续性检查
- [ ] 真实前后对比与部署手册
- [ ] 用户验收反馈

## Test Plan

后端编译/单测或语法检查；前端正式构建；隔离启动健康/静态资源/API只读链路；有针对性的阻塞/缓存测试。服务器先备份运行参数、镜像与必要配置，候选健康后切换同一业务服务；如失败恢复原容器。比较一致口径的容器内存与主要接口，峰值与长期负载另行标明。代理容器ID/启动时间和实际出口前后检查。

## Assumptions

不主动调用付费AI、发送Discord消息或改业务数据；现有账户、域名和底层共享服务继续使用。执行授权已包含提交、GitHub推送和ZGo部署。

设计页：../../design/F001.html。部署入口：../../deployment/README.md。
