# 开发日记

2026-11-01：开始来源核验、迁移和发布。Git分支main。原目录保留，生产配置尚未改变。

## 实现和验证

线上main.py、gemini.py、schemas.py的SHA256与本地修改前完全一致；沿用原Work。24个无await的数据库接口改为def，FastAPI按官方机制放入线程池；AI接口保留async，显式await run_in_threadpool(save_word_to_db, ...)保证保存完成后返回且不堵事件循环。默认并发工作线程8，连接/读写超时5/30/30秒。

摘要链路拆为load_summary_words → await AI → save_daily_summary；每个DB函数finally关闭连接。两个词条全部传给AI且生成前连接已关闭的回归测试通过。旧表结构和API返回主体保持。

三项离线测试通过：慢DB等待300ms期间健康请求仍可在200ms内完成、摘要保留全部词条且AI等待不持连接、查词保存不在事件循环线程执行。无生产DB/AI写入。React tsc正式构建通过，原始JS入口加vendor约750KB，当前主要瓶颈修正放在后端。生产YAML/.env不进入镜像上下文或Git，当前源码detect-secrets扫描零发现（无密钥占位和localStorage键名明确标注）。

服务器备份已完成；GitHub和隔离/生产部署待验证。生产MySQL及代理未变更。
