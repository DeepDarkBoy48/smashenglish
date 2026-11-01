# Feature Log

## 2026-11-01

- Commit: fcc3001
- Summary: 将既有前后端统一纳入Work维护，避免慢MySQL请求阻塞英语学习接口，并补齐安全可回滚发布。

### Features

- 24个纯数据库接口交由FastAPI线程池执行，默认8个工作线程；查词保存显式在线程中等待完成。
- 每日摘要先读取词条并关闭连接，异步生成AI内容后再保存，模型等待期间不占用数据库连接。
- 数据库连接配置从main.py独立到database.py，密码从环境变量读取，迁移工具同步去掉硬编码密码；加入连接与读写超时。
- 增加进程健康、数据库就绪检查；前端哈希资源长期缓存，HTML重新验证。
- 补齐WORK、F001、设计中心及部署说明，保留既有Git历史、前后端同仓、旧数据和原域名；已完成服务器备份、四容器候选验证及正式发布，保留旧容器以便回滚。

### Files

- my-fastapi-app/main.py / database.py / tests/test_performance.py
- my-fastapi-app/docker-compose.yml / Dockerfile.runtime / .env.example
- my-fastapi-app/migrate_db.py / scripts/
- smash-english-standalone/nginx.conf / Dockerfile.runtime
- WORK.md / docs/ / README.md / FEATURE_LOG.md


用于记录每次提交对应的功能级改动摘要。要求基于 `git diff` 或 `git diff --cached` 编写，重点说明“这次改进了哪些功能”，而不是简单罗列文件。

## 2026-08-26 09:30:00 +0800

- Commit: 8696c17
- Summary: 按 Linear/Notion 的紧凑设计语言重做词典结果卡片，提升信息密度，首屏可见释义从 1.5 条提升到 5 条。

### Features

- 单词卡头部从「5xl 大字 + 独立音标行 + 56px 圆形朗读按钮 + 40px 内边距」改为一行：`text-2xl` 单词与音标基线对齐，朗读改为 32px 幽灵图标按钮。
- 词性标签从黑底阴影大徽章改为 Notion 式小标签（`text-xs` 灰底），COCA 词频改为描边小胶囊，去掉装饰性延伸线。
- 释义条目间距 `space-y-8` → `space-y-4`，序号缩小降色，释义正文统一 `text-sm`；例句从大圆角灰底盒（`rounded-xl p-5`）改为左边线引用样式，组间距改为 `divide-y` 细分割线。
- 常用搭配区去掉大图标徽章和卡中套卡，改为小标题行 + 两列紧凑条目（`px-3 py-2.5`），短语与释义同行展示。
- 卡片整体从 `rounded-[2rem] shadow-xl` 收敛为 `rounded-xl border shadow-sm`。

### Files

- `smash-english-standalone/src/components/DictionaryPage.tsx`
- `FEATURE_LOG.md`

## 2026-08-26 02:15:00 +0800

- Commit: 9645d22
- Summary: 压缩句法、词典、写作三个功能页占满首屏的 Hero 头部为单行紧凑页头，打开页面即可看到输入区与内容。

### Features

- 句法页移除居中大标题 Hero（徽章 + text-5xl 标题 + 两行副标题），改为左对齐单行页头（图标 + 标题 + 一句话说明），输入卡片上移并左对齐，分析结果首屏可见。
- 词典页标题区与搜索区合并压缩，搜索框加粗留白与字号收窄（`py-4 text-lg` → `py-3 text-base`），单词结果首屏可见多个释义。
- 写作页居中标题堆叠改为左右单行页头：左侧标题 + 说明，右侧模式选择器；下拉菜单锚点从居中改为右对齐，避免右移后溢出。
- 全局容器顶部留白 `md:py-8` 收紧为 `md:py-5`，句法输入卡片内部留白同步收窄，「试一试」示例词改为左对齐。
- 翻译、视频/精读笔记本、词库管理页原本已是紧凑页头，未改动。

### Files

- `smash-english-standalone/src/App.tsx`
- `smash-english-standalone/src/components/DictionaryPage.tsx`
- `smash-english-standalone/src/components/InputArea.tsx`
- `smash-english-standalone/src/components/WritingPage.tsx`
- `FEATURE_LOG.md`

## 2026-08-26 01:25:00 +0800

- Commit: 3106073
- Summary: 部署目标从已退役的 ClawCloud 迁移到 ZgoCloud 服务器，后端端口收紧为本机回环，仅经网关反代对外。

### Features

- 部署 Skill 的目标服务器切换为 ZgoCloud（`23.169.184.243`，`ssh zgocloud` 密钥登录），旧 ClawCloud 服务器标记为退役；数据库 host 检查规则改为禁止任何启用中的直连 IP。
- 后端 `docker-compose.yml` 端口绑定改为 `127.0.0.1:8001:8001`：生产环境经 main-gateway nginx 反代访问，后端不再直接暴露公网。
- `main.py` 本地开发数据库注释更新为 SSH 隧道方式（`ssh -L 3306:127.0.0.1:3306 -N zgocloud`），替换已失效的旧服务器 IP。

### Files

- `.agents/skills/git-commit-deploy/SKILL.md`
- `my-fastapi-app/docker-compose.yml`
- `my-fastapi-app/main.py`
- `FEATURE_LOG.md`

## 2026-08-26 01:10:00 +0800

- Commit: 43e1d57
- Summary: 优化查词 AI 解析的讲解质量，增强生词本导出能力，重构复习页头部布局，并完成仓库迁入 CrazyHub 后的部署配置更新。

### Features

- 查词「AI 深度解析」提示词改版：输出固定为【全文翻译】+【用法解析】两个小节，只讲目标词在原句中的真实用法，引用原句搭配说明词义，去除套话与百科式扩展，控制在 2-4 句有现场讲解感的中文。
- 生词本导出升级：导出菜单支持「全部生词 / 当前笔记」两种范围，新增复制到剪贴板（Markdown / JSON），并修复单词含正则特殊字符时语境高亮报错的问题。
- 复习页头部重构为卡片式紧凑布局：模式切换（AI 文章 / 单词卡片）与完成进度整合进同一容器，文章类型直接以文字标签展示。
- 视频笔记本卡片标题由单行截断改为两行，长标题不再被切断。
- 仓库迁入 CrazyHub `codebases/` 并更新部署 Skill 内的本地路径；`.gitignore` 新增排除 CrazyHub 登记文件 `code.md`；提交前按部署规范将数据库 host 保持为 `mysql-container`。

### Files

- `my-fastapi-app/gemini.py`
- `smash-english-standalone/src/components/SavedWordsPage.tsx`
- `smash-english-standalone/src/components/ReviewPage.tsx`
- `smash-english-standalone/src/components/VideoNotebookPage.tsx`
- `.gitignore`
- `.agents/skills/git-commit-deploy/SKILL.md`
- `FEATURE_LOG.md`

## 2026-04-21 11:38:00 +0800

- Commit: 982ad68
- Summary: 为正式部署切回后端容器数据库地址，避免服务器继续连接本地开发用远程 MySQL。

### Features

- 将后端数据库 host 从本地开发时使用的 `47.79.43.73` 切回部署环境使用的 `mysql-container`，保证服务器内 FastAPI 容器走同一 Docker 网络访问数据库。

### Files

- `FEATURE_LOG.md`
- `my-fastapi-app/main.py`

## 2026-04-21 11:32:00 +0800

- Commit: b69c7ab
- Summary: 优化复习页卡片阅读节奏与字幕工具引导，同时提升 YouTube 字幕悬停高亮体验并补强提交日志规范。

### Features

- 重做复习页单词卡片布局，补上更清晰的当前进度、上下文高亮、展开后的释义分区和底部评分区，让“先回忆再看答案”的节奏更自然。
- 视频字幕笔记创建面板新增外部字幕下载入口和三步引导，帮助用户先拿到 `.srt` 再回到站内上传，降低导入门槛。
- 浏览器插件的 YouTube 字幕交互新增悬停高亮层，拖动时自动关闭悬停效果，并修正点击后高亮定位，减少字幕区域误闪和选词错位。
- 提交日志技能补充“提交后必须回填真实 commit hash”的约束，部署技能也新增 agent 配置，便于后续把日志维护和提交流程串起来。

### Files

- `FEATURE_LOG.md`
- `.agents/skills/git-diff-feature-log/SKILL.md`
- `.agents/skills/git-commit-deploy/agents/openai.yaml`
- `chrome-sidepanel-translator/content-script.js`
- `my-fastapi-app/main.py`
- `smash-english-standalone/src/components/ReviewPage.tsx`
- `smash-english-standalone/src/components/VideoNotebookPage.tsx`

## 2026-04-08 11:38:00 +0800

- Commit: c3cdd90
- Summary: 收紧精读页与浏览器插件的已有释义复用条件，避免同词不同句时错配旧解析。

### Features

- 精读页点击单词时，面板内已有词条结果现在会同时校验“单词 + 原句上下文”，只有命中同一句时才复用，避免把别的句子的解析直接拿来展示。
- 词库 encounter 复用逻辑抽成公共匹配函数，统一按规范化后的上下文句子做精确匹配，并优先复用当前精读笔记对应的 encounter。
- 浏览器侧边栏插件的“已有释义”命中也同步收紧为“单词相同且原句一致”才返回缓存卡片，未命中时会继续走 AI 生成，避免截图里那类原句与深度解析不配套的问题。

### Files

- `FEATURE_LOG.md`
- `smash-english-standalone/src/components/IntensiveReadingPage.tsx`
- `smash-english-standalone/src/utils/savedWords.ts`
- `chrome-sidepanel-translator/service-worker.js`

## 2026-03-29 11:17:54 +0800

- Commit: 3f2922c
- Summary: 让浏览器侧边栏单词卡片接入后端朗读音频，并收紧词汇详情卡片顶部排版。

### Features

- 浏览器插件的单词卡片朗读从浏览器内建语音切换为请求后端 `/api/fastapi/review/read-aloud`，支持生成中状态、播放/停止控制，以及按单词缓存音频避免重复请求。
- 当插件切换后端地址或清空卡片时，会同步清理朗读缓存与播放状态，减少旧音频串用和并发点击带来的状态错乱。
- 收紧单词卡片头部区域的边距、标题字号、高亮胶囊和朗读按钮尺寸，让“原型 + 当前词形 + 朗读按钮”这一块更紧凑。

### Files

- `FEATURE_LOG.md`
- `chrome-sidepanel-translator/sidepanel.js`
- `chrome-sidepanel-translator/sidepanel.css`

## 2026-03-28 17:24:54 +0800

- Commit: bb39eed
- Summary: 为复习页新增英文朗读能力，并把“基于 git diff 维护功能日志”接入提交流程与部署流程。

### Features

- 复习页新增朗读按钮、生成中状态与播放/停止控制，优先按单词原型发起朗读请求，并在前端缓存返回的音频 URL 以减少重复请求。
- 后端新增 `/fastapi/review/read-aloud` 接口，调用 Gemini Live 生成朗读音频并以 `audio/wav` 返回；同时补充对应的请求模型和 feature 配置。
- LLM 配置面板补充 feature 级可选模型范围，允许复习朗读功能固定使用 live 模型，并让前端类型与配置常量保持一致。
- 新增 `git-diff-feature-log` skill 与 `FEATURE_LOG.md`，并要求部署 skill 在本地使用 git 提交或推送前，先基于 diff 维护功能日志。

### Files

- `.gitignore`
- `.agents/skills/git-commit-deploy/SKILL.md`
- `.agents/skills/git-diff-feature-log/SKILL.md`
- `.agents/skills/git-diff-feature-log/scripts/prepare_feature_log_entry.sh`
- `FEATURE_LOG.md`
- `my-fastapi-app/gemini.py`
- `my-fastapi-app/main.py`
- `my-fastapi-app/schemas.py`
- `smash-english-standalone/src/components/ApiKeyModal.tsx`
- `smash-english-standalone/src/components/ReviewPage.tsx`
- `smash-english-standalone/src/services/geminiService.ts`
- `smash-english-standalone/src/types.ts`
- `smash-english-standalone/src/utils/llmConfig.ts`

## 2026-03-28 10:20:00 +0800

- Commit: bb39eed
- Summary: 初始化功能日志维护规范，并新增基于 git diff 生成日志骨架的仓库技能。

### Features

- 新增 `git-diff-feature-log` skill，用于在提交前后根据 diff 更新功能日志。
- 新增日志骨架脚本，自动输出日期、分支、diff 来源和改动文件列表，方便后续补写功能摘要。
- 初始化仓库级 `FEATURE_LOG.md`，统一后续功能变更记录入口。

### Files

- `.agents/skills/git-diff-feature-log/SKILL.md`
- `.agents/skills/git-diff-feature-log/scripts/prepare_feature_log_entry.sh`
- `FEATURE_LOG.md`

### 发布记录补充（2026-11-01 13:33）

- 中断续接误重复切换导致应用短暂中断，已恢复到相同的已验证运行版本3c4425b；数据库就绪、网关链路和代理连续性复核通过。
- 发布执行器增加互斥锁与stop前身份/备份名称预检，更新服务器留档，不再次执行发布。完整事件见F001开发日记。
