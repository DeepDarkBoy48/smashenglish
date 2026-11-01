---
name: git-commit-deploy
description: SmashEnglish单仓提交、GitHub推送、ZGo候选验证与可回滚部署；先更新FEATURE_LOG，数据库凭据从环境提供。
---
# SmashEnglish提交与部署

仓库为 `git@github.com:DeepDarkBoy48/smashenglish.git`，本地Work是 `/Users/robin/Programming/gkxt/CrazyHub/work/repos/smashenglish`，服务器源码 `/root/smashenglish`，SSH别名 `zgocloud`。以WORK和实际服务状态为准，不去已退役目录部署。

1. 按当前会话授权执行提交、推送和部署；已有授权时不重复询问。先核对工作副本、main分支、origin与服务器身份。
2. 数据库配置在 `my-fastapi-app/database.py`，DB_HOST默认mysql-container，密码必须来自DB_PASSWORD。开发环境用DB_HOST/DB_PORT切换SSH隧道，不改源码。不得把.env或生产配置加入提交。
3. 调用本仓 `git-diff-feature-log`，依据暂存差异更新FEATURE_LOG；提交并推送同一monorepo，回填真实实现commit。确认远端commit后再发布。
4. 先读 `docs/deployment/README.md`：备份原镜像、容器inspect、私密配置和业务数据库；服务器在/root/smashenglish核对工作副本并fetch、ff-only到指定commit。原容器继续运行时先构建并启动候选。
5. 后端验证/fastapi/health、/fastapi/ready与笔记只读接口，前端构建并验证静态页面。只有锁定依赖与旧镜像完全一致时才使用Dockerfile.runtime，依赖变化用标准Dockerfile重建。
6. 候选通过后逐个替换my-fastapi-container（回环8001）和smash-english-container（回环8083），均使用现有appnet和root-only环境配置。保留旧容器为before-release名称，禁用其自动重启，避免下次开机争抢端口或重复消费。不要先删除旧镜像或修改数据库结构。
7. 新容器失败时恢复旧名称并启动，按原inspect恢复重启策略；新IP生效后，对引用容器名的NGINX先nginx -t再平滑reload。禁止把整机或主代理重启当成常规步骤。
8. 验证容器、健康、API反代、网页切换、缓存、日志和内存，并确认主代理仍可用。不要自动调用付费AI或发送测试消息。

结果需区分：源码提交、GitHub远端、实际运行revision、回滚位置及真实验证；文档提交可晚于运行代码提交，不因此重建无变化的应用。
