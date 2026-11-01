# 运行与部署

## 本地开发

前提：Python3.11+、Node22+，按requirements.txt安装后端依赖、前端使用npm ci。复制my-fastapi-app/.env.example为私密.env，填入自己的Gemini和MySQL凭据。生产默认DB_HOST=mysql-container；本地用独立开发库，或只读检查时使用SSH隧道并设置DB_HOST=127.0.0.1、DB_PORT为隧道端口，不改源码。

在后端目录执行`.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001`；前端目录执行`npm run dev -- --host 127.0.0.1`，地址以输出为准。用Ctrl+C停止自己的实例。

## 检查与构建

后端目录`.venv/bin/python -m unittest discover -s tests -v`；前端目录`npm ci --no-audit --no-fund && npm run build`。本期测试不访问真实AI或修改生产数据。标准Dockerfile提供全依赖构建；依赖锁完全相同时，可用Dockerfile.runtime从当前已验证运行镜像复用依赖。

## ZGo发布与回滚

源码单仓GitHub DeepDarkBoy48/smashenglish，服务器/root/smashenglish。先更新FEATURE_LOG、提交并推送；服务器核对工作副本并git pull --ff-only到同一commit。服务器私密.env和数据库不进入Git。GEMINI_API_KEY、DB_PASSWORD等从root-only运行环境文件提供，不能回填Python默认值。

发布前保留旧容器docker inspect、镜像和业务数据库快照。先启动临时FastAPI候选：/fastapi/health确认事件循环可用，/fastapi/ready执行SELECT 1确认连接，再检查每日笔记和词库只读接口。正式替换my-fastapi-container，回环8001；前端smash-english-container，回环8083。两者都接入已有appnet，网关继续使用原域名learn.nanopixel.uk。

新容器失败时停止候选、恢复旧容器名称并启动，不删除旧镜像。替换导致IP改变时，对引用这些容器名的Nginx先nginx -t再平滑reload；不重启数据库、代理或整台机器。不自动执行migrate_db.py或scripts/中的数据库改表工具。

## 性能变化

同步PyMySQL接口由FastAPI线程池执行，默认8个工作线程；AI调用保持async，保存与读写段通过run_in_threadpool执行。摘要读取结束立即释放连接，AI生成完后再开连接保存。DB连接有连接/读写超时。新增健康与就绪检查，Vite带哈希资源使用浏览器长期缓存。

当前版本、线上结果和性能边界见WORK及F001。
