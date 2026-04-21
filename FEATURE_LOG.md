# Feature Log

用于记录每次提交对应的功能级改动摘要。要求基于 `git diff` 或 `git diff --cached` 编写，重点说明“这次改进了哪些功能”，而不是简单罗列文件。

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
