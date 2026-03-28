# Feature Log

用于记录每次提交对应的功能级改动摘要。要求基于 `git diff` 或 `git diff --cached` 编写，重点说明“这次改进了哪些功能”，而不是简单罗列文件。

## 2026-03-28 17:24:54 +0800

- Commit: pending
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

- Commit: pending
- Summary: 初始化功能日志维护规范，并新增基于 git diff 生成日志骨架的仓库技能。

### Features

- 新增 `git-diff-feature-log` skill，用于在提交前后根据 diff 更新功能日志。
- 新增日志骨架脚本，自动输出日期、分支、diff 来源和改动文件列表，方便后续补写功能摘要。
- 初始化仓库级 `FEATURE_LOG.md`，统一后续功能变更记录入口。

### Files

- `.agents/skills/git-diff-feature-log/SKILL.md`
- `.agents/skills/git-diff-feature-log/scripts/prepare_feature_log_entry.sh`
- `FEATURE_LOG.md`
