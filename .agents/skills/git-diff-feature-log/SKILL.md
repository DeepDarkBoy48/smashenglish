---
name: git-diff-feature-log
description: 在提交代码前后维护功能日志。适用于用户要求“记录这次改了哪些功能”“基于 git diff 写功能日志”“每次 commit 更新变更说明”时使用。先看 git diff --cached，没有暂存改动时看 git diff，再把改动归纳为面向功能的日志并更新仓库根目录 FEATURE_LOG.md。
---

# Git Diff Feature Log

这个 Skill 用于在提交前后维护仓库里的功能日志，目标不是罗列文件，而是说明“这次改进了哪些功能”。

## 默认日志位置

- 仓库根目录：`FEATURE_LOG.md`

## 工作流程

1. 先确认本次日志应基于哪份 diff：
   - 优先使用 `git diff --cached`
   - 如果暂存区为空，使用 `git diff`
   - 如果用户明确要记录上一提交，使用 `git show --stat --patch --summary HEAD`

2. 读取并理解改动：
   - 关注新增接口、交互、数据结构、模型配置、行为变化
   - 将多个文件的协同改动合并成一个“功能点”
   - 不要把纯重命名、格式化、无行为变化的改动包装成功能

3. 更新 `FEATURE_LOG.md`：
   - 追加一条新的日志记录到最上方
   - 每条记录必须写清楚日期
   - 如果尚未提交，`Commit` 字段写 `pending`
   - 如果已经提交，填入短 commit hash

4. 每条日志至少包含：
   - `Date`
   - `Commit`
   - `Summary`
   - `Features`
   - `Files`

## 写作要求

- 用“功能语言”写，不按文件顺序抄 diff
- 先写用户能感知的改进，再写必要的技术补充
- 一个功能点尽量覆盖一组相关文件
- 每个功能点说明：
  - 改了什么能力
  - 从哪里触发
  - 涉及哪些关键文件

## 建议格式

```md
## 2026-03-28

- Commit: pending
- Summary: 为复习页新增单词朗读能力，并补齐前后端模型配置联动。

### Features

- 新增复习页朗读按钮与播放/停止状态，支持对单词原型发起朗读请求。
- 新增 `/fastapi/review/read-aloud` 接口，返回 `audio/wav` 音频流。
- 为 LLM 配置面板补充 feature 可选模型范围，允许朗读功能固定使用 live 模型。

### Files

- `smash-english-standalone/src/components/ReviewPage.tsx`
- `smash-english-standalone/src/services/geminiService.ts`
- `smash-english-standalone/src/components/ApiKeyModal.tsx`
- `smash-english-standalone/src/utils/llmConfig.ts`
- `smash-english-standalone/src/types.ts`
- `my-fastapi-app/main.py`
- `my-fastapi-app/gemini.py`
- `my-fastapi-app/schemas.py`
```

## 辅助脚本

如果只需要快速生成日志骨架，先运行：

```bash
bash .agents/skills/git-diff-feature-log/scripts/prepare_feature_log_entry.sh
```

脚本会输出一段 Markdown 模板，包含日期、分支、建议使用的 diff 来源和变更文件列表。然后再根据 diff 补写 `Summary` 和 `Features`，并更新到 `FEATURE_LOG.md`。

## 注意事项

- 如果同时存在多组不相关改动，要拆成多个功能点，不要混成一句话。
- 如果本次只有配置切换、启动修复、测试脚本调整，也可以记日志，但要明确标成“开发环境/工程化改进”，不要写成功能发布。
- 提交前如果已经写了 `pending`，提交完成后应再把对应条目的 `Commit` 更新成真实 hash。
