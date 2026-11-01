# 开发日记

2026-11-01：开始来源核验、迁移和发布。Git分支main。原目录保留，生产配置尚未改变。

## 实现和验证

线上main.py、gemini.py、schemas.py的SHA256与本地修改前完全一致；沿用原Work。24个无await的数据库接口改为def，FastAPI按官方机制放入线程池；AI接口保留async，显式await run_in_threadpool(save_word_to_db, ...)保证保存完成后返回且不堵事件循环。默认并发工作线程8，连接/读写超时5/30/30秒。

摘要链路拆为load_summary_words → await AI → save_daily_summary；每个DB函数finally关闭连接。两个词条全部传给AI且生成前连接已关闭的回归测试通过。旧表结构和API返回主体保持。

三项离线测试通过：慢DB等待300ms期间健康请求仍可在200ms内完成、摘要保留全部词条且AI等待不持连接、查词保存不在事件循环线程执行。无生产DB/AI写入。React tsc正式构建通过，原始JS入口加vendor约750KB，当前主要瓶颈修正放在后端。生产YAML/.env不进入镜像上下文或Git，当前源码detect-secrets扫描零发现（无密钥占位和localStorage键名明确标注）。

服务器备份已完成；GitHub和隔离/生产部署待验证。生产MySQL及代理未变更。

## GitHub发布与生产验收

2026-11-01：GitHub代码已拉取到服务器并核对完整commit。构建产物逐文件SHA256校验后使用同机已验证的Java/依赖/NGINX镜像构建，未拉取新运行时或更新生产数据库。Dockerfile不能直接把sha256:镜像ID用作FROM，首次构建在任何服务切换前失败；改用本机已有镜像的明确标签后，四个候选构建及启动通过。私有Discord仓库配了服务器只读deploy key，未复制个人GitHub令牌。

四个候选依次在临时回环端口启动，机器人与消息消费关闭；Java健康/图库、FastAPI SELECT1就绪/每日笔记、前端静态页面均通过。候选清理后正式逐项替换容器，原容器停止并保留为before-release名称。三个NGINX先检查再平滑reload，以重新解析应用新IP；原网关配置、Marzban容器ID和启动时间未变。主Mac代理出口末次复核通过。

Java连接Discord WebSocket且Finished Loading，未见OutOfMemoryError，未发送测试消息或调用付费AI。正式Java与Python的健康/图库/笔记，以及两个站点通过各自NGINX转发的新健康/就绪接口均HTTP200。浏览器实际加载SmashEnglish、NanoPixel并切换词典，Vue灵感库路由也实际加载；AI示例展示不算真实生成验收。重启计数均0。

生产备份目录：/root/work-app-releases/20261101T052024Z，含原容器inspect、Java JAR/私密配置、应用数据库快照、执行器与每阶段输入/结果。凭据与SQL备份仅在服务器root-only目录，不提交仓库。正式代码revision分别为Discord `99bd6054f93b16d90a00991aee0adbdaf2eae2bd`、SmashEnglish `3c4425b627a0db7bd44e3154b14f68d4d7144b06`；后续文档提交不改变该运行代码。

发布前快照Java719.2MiB（较早还采到约452MiB），发布后约280.6MiB；Python82.91→75.41MiB，前端分别约4MiB。两者是不同运行时长的前后快照，冷/热状态、重启与配置变化混在一起，不将差额全部归因于某一代码改动，不保证大文件高并发或长期占用。Java堆上限384MiB、容器768MiB；Python容器512MiB。底层MySQL未重启、未削减监控或更换数据库。

用户验收反馈待收集。本期工程、GitHub推送和生产发布已执行，原littleWebsite代码未删除。代理网络本身的出网故障不因应用内存下降而视为已修复。

设计中心已实际通过浏览器从首页卡片进入F001，中文、当前提交、7/8清单和发布结果可读；两站生产页面及词典切换、Vue图库完成加载已核对。临时预览结束清理。

补充收口：四个before-release容器已确认停止且restart=no，避免开机后与新服务争抢端口。最后源码扫描仅有catalog.json中的已核验Git提交哈希被标为高熵字符串，属于版本标识误报；源代码没有新增凭据发现。开发/部署入口改为当前database.py与环境变量流程，不依赖本机未跟踪的旧说明。
