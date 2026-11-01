# SmashEnglish Monorepo 开发指南

这个仓库包含 3 个子项目，其中 `smash-english-standalone` + `my-fastapi-app` 是当前功能开发主线。

## 1. 项目介绍 (Project Overview)

### 👨‍💼 产品经理视角 (PM Perspective)

**核心痛点与定位：**
传统背单词软件往往让人陷入“脱离语境、死记硬背”的陷阱。SmashEnglish 致力于打造一个**上下文驱动 (Context-driven)** 的沉浸式英语学习闭环。我们鼓励用户在真实的阅读、视频观看、甚至写作（日记）中遇到生词，而不是对着干瘪的词表死记。

**产品核心价值：**
1. **真实语境构建 (Immersive Context)**：支持精读文章、外部视频（YouTube / SRT 字幕解析）、每日英语随记（输出反馈）等多种形态输入。
2. **极简查词与语境捕获 (Frictionless Lookup)**：无论在阅读还是看视频时，均可无缝查词。系统会自动捕获该词的当前句子作为语境 (Encounter) 存入个人词库。如果一个词在多个地方遇到，语境会被智能聚合。
3. **FSRS 记忆算法 (Smart Spaced Repetition)**：摒弃老旧的艾宾浩斯固定曲线，引入基于用户真实遗忘规律的 **FSRS (Free Spaced Repetition Scheduler)** 调度算法，每天提供最少、最精准的复习任务。
4. **AI 深度赋能 (AI-native Feature)**：提供从底层到高阶的 AI 体验：翻译、整句语法解析、英文日记润色与打分、每日笔记智能摘要，以及**独家首创：将今日待复习的所有生词喂给 AI，自动生成一篇极具逻辑的「复习文章」，在连贯阅读中完成单词复习。**

### 👨‍💻 开发者视角 (Developer Perspective)

**架构设计与工程化：**
这是一个典型的现代全栈应用，设计理念为**前后端彻底分离、API 优先、AI 深度解耦**。
- **全栈隔离与演进**：通过 Monorepo 统一管理。前端基于最新的 React 19 和 Vite 7 追求极致的构建与渲染速度；后端则选择 Python 的 FastAPI，利用其原生异步能力极大提升了对 LLM（Gemini）接口调用的吞吐率。
- **透明的存储层**：采用 MySQL 作为自建存储，放弃沉重的 ORM，使用原生 PyMySQL + Python Dictionaries，对复杂的单词来源（视频、阅读、日记等多对多追溯）与 FSRS 调度状态保持最细粒度的控制力。
- **AI 业务编排**：后端的 `gemini.py` 扮演 AI Agent 角色，将复杂的 Prompt 工程（如语法分析模板、写作润色模板、词频串写文章模板）封装为标准的 RESTful API 供前端直接消费。

## 2. 完整功能清单 (Feature List)

以下是当前系统已实现的完整功能矩阵：

| 模块类别 | 功能名称 | 产品描述 | 开发者/技术备注 |
| :--- | :--- | :--- | :--- |
| **💡 核心查词与词汇库** | **极速上下文查词** | 在任意阅读场景一键查词，返回释义并自动保存该词及其所在原句（语境 / Encounter）。 | `quick_lookup`：请求包含前后文，自动解析来源 (url/note_id 等) 并执行 DB Upsert。 |
| | **轻量级瞬时查词** | 最快速度查词，仅显示释义，不保存进个人词库。 | `rapid_lookup`：无状态查词，跳过 DB 存储开销。 |
| | **生词语境自动化聚合** | 用户在不同文章/视频遇到同一个生词时，生词本内将展示该词的所有出处（聚合多条遭遇记录）。 | `append_or_get_encounter` 采用 JSON payload 追加和查重策略。 |
| | **词库全维管护 (CRUD)** | 生词本总览支持新增、编辑、删除整个单词或单独删除某一条语境来源。 | 支持 `batch_delete_words` 操作；词条编辑完全覆盖复习调度参数。 |
| **🧠 沉浸式输入源** | **双语精读笔记本** | 输入任意长文或 URL，系统支持带封面图的卡片管理。在此页面无缝阅读并查词。 | `reading_notebooks` CRUD 操作，支持前端无限拉取与渲染长文本。 |
| | **视频全托管学习** | 支持填入 YouTube 等视频链接，并导入/解析对应的 SRT 英语字幕，一边看一边交互式查词。 | `video_notebooks` 表设计分离 `video_url` 和巨大的 `srt_content`。 |
| | **每日英语随伴 (日记)** | 以天为单位的 Markdown 笔记/日记。记录当天的想法与所见所闻，系统自动计算词数并记录轨迹。 | `daily_notes` 以 `day` 字段作为唯一键，支持文本富文本渲染。 |
| **🤖 AI 智能工具集** | **AI 极速 / 高级翻译** | 支持选中任意长短文本一键极速翻译；支持补充自定 Prompt 实现语气定制翻译。 | 提供 `translate_endpoint` 与 `translate_advanced_endpoint` 分离逻辑。 |
| | **长句语法深度拆解** | 对于看不懂的长难句，AI 提供包含主谓宾、从句、时态等细颗粒度的结构分析。 | `analyze_sentence` 利用 Gemini structured outputs (Pydantic models)。 |
| | **英文写作润色与评估** | 在每日笔记中写完英文，可呼出 AI，从词汇、语法、地道程度进行打分并给出修改建议。 | `evaluate_writing` 能够结构化输出评语和润色对比。 |
| | **AI 自由对话** | 基于当前语境随时唤起 ChatGPT 风格的自由侧边栏对话以探讨英语问题。 | 简单的 `chat` 接口，透传 System Prompt + User Query。 |
| | **每日笔记全自动摘要** | 当用户写完很长的笔记/摘录后，一键生成全局摘要与标题。 | `summarize_daily_note`：更新日记的 title 与 summary 字段。 |
| **🔁 科学算法复习链** | **FSRS 记忆调度器** | 基于国际著名的首张卡片记忆算法动态调整每个单词的下次复习时间。 | 在 Python 后端接入/实现 `FSRS` 核心逻辑（重置与提权 `state`, `due`, `reps` 等）。 |
| | **自动生成今日复习队列** | 系统每天根据 Due Date 自动锁定并捞出当天必须复习的遗忘临界单词。 | `get_today_review` 每天为用户生成一个只读的排期快照。 |
| | **AI 场景复习文章生成** | 突破传统抽认卡（Flashcard）限制。AI 把今日的几十个生词编纂成一篇连贯的有逻辑的小故事/文章，在故事中复习词汇！ | `get_review_prompt` / `import_review_article`：将 JSON 词库转译并喂给大模型产出创意文章。 |
| | **官方四档学习反馈机制** | 用户阅读复习后，对单词点击「忘了/很难/还行/太简单」，系统底层重算周期。 | 映射前端 1-4 档分数至 `submit_review_feedback` 获取最新调度矩阵。 |

## 3. 技术栈（框架）

- 前端（主线）: React 19 + TypeScript + Vite 7 + Tailwind CSS 4
- 前端（旧版）: React 18 + TypeScript + Vite 6 + Tailwind CSS 4
- 后端: FastAPI + Pydantic + PyMySQL
- AI: Google Gemini（`@google/genai` / `google-genai`）
- 数据库: MySQL（远程或 Docker 网络内 MySQL）

## 4. 仓库结构

```text
smashenglish/
├── .agents/
│   └── skills/
│       ├── startup_dev/              # 启动开发环境 Skill
│       └── project-dev-guide/        # 本次新增：功能开发必读 Skill
├── my-fastapi-app/                   # FastAPI 后端
│   ├── main.py                       # API 入口
│   ├── schemas.py                    # 请求/响应模型
│   ├── gemini.py                     # AI 业务逻辑
│   ├── migrate_db.py                 # 数据库迁移脚本
│   └── requirements.txt
├── smash-english-standalone/         # 当前主线前端（推荐）
│   ├── src/components/               # 页面与业务组件
│   ├── src/services/                 # API/AI 服务层
│   ├── src/utils/                    # 工具函数
│   └── package.json
└── smash-english-purefrontend/       # 旧版纯前端实现（参考用）
```

## 5. 数据库表结构（`smashenglish`）

当前数据库包含 5 张核心表：

- `daily_notes`
- `reading_notebooks`
- `review_articles`
- `saved_words`
- `video_notebooks`

### 5.1 `daily_notes`

| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| id | int | NO | PRI |  | auto_increment |
| title | varchar(100) | YES |  |  |  |
| day | date | NO | UNI |  |  |
| summary | text | YES |  |  |  |
| content | mediumtext | YES |  |  |  |
| word_count | int | YES |  | 0 |  |
| created_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### 5.2 `reading_notebooks`

| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| id | int | NO | PRI |  | auto_increment |
| title | varchar(255) | NO | MUL |  |  |
| content | longtext | NO |  |  |  |
| source_url | varchar(1024) | YES |  |  |  |
| cover_image_url | varchar(1024) | YES |  |  |  |
| description | text | YES |  |  |  |
| word_count | int | YES |  | 0 |  |
| created_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

### 5.3 `review_articles`

| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| id | int | NO | PRI |  | auto_increment |
| review_date | date | NO | UNI |  |  |
| title | varchar(255) | NO |  |  |  |
| content | mediumtext | NO |  |  |  |
| article_type | varchar(50) | NO |  |  |  |
| words_json | json | NO |  |  |  |
| created_at | timestamp | YES | MUL | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### 5.4 `saved_words`

| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| id | int | NO | PRI |  | auto_increment |
| note_id | int | YES | MUL |  |  |
| word | varchar(100) | NO | MUL |  |  |
| context | text | YES |  |  |  |
| data | json | YES |  |  |  |
| created_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| url | varchar(200) | YES |  |  |  |
| stability | double | YES |  | 0 |  |
| difficulty | double | YES |  | 0 |  |
| elapsed_days | int | YES |  | 0 |  |
| scheduled_days | int | YES |  | 0 |  |
| last_review | timestamp | YES | MUL |  |  |
| due | timestamp | YES | MUL |  |  |
| reps | int | YES |  | 0 |  |
| state | int | YES |  | 0 |  |
| reading_id | int | YES | MUL |  |  |
| video_id | int | YES | MUL |  |  |

### 5.5 `video_notebooks`

| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| id | int | NO | PRI |  | auto_increment |
| title | varchar(255) | NO |  |  |  |
| video_url | varchar(1024) | NO |  |  |  |
| video_id | varchar(50) | YES | MUL |  |  |
| srt_content | longtext | YES |  |  |  |
| thumbnail_url | varchar(1024) | YES |  |  |  |
| created_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

### 5.6 部署配置

连接信息和密钥通过环境变量提供。参见[运行与部署](docs/deployment/README.md)，进度见[WORK](WORK.md)。

## 6. 本地开发（推荐流程）

### 6.1 启动后端

```bash
cd my-fastapi-app
source .venv/bin/activate
fastapi dev main.py
```

默认服务地址: `http://127.0.0.1:8000`（以本机实际输出为准）。

### 6.2 启动前端（主线）

```bash
cd smash-english-standalone
npm run dev
```

### 6.3 可选：旧版前端

```bash
cd smash-english-purefrontend
npm run dev
```

## 7. 基于当前架构怎么开发功能

建议按这 6 步执行，每次改动都遵循：

1. 明确功能边界  
   - 属于前端展示、后端接口、还是两端联动。
2. 先改类型和数据模型  
   - 后端先改 `schemas.py` 与 `main.py` 的接口约定；前端同步 `src/types.ts`。
3. 再改服务层  
   - 前端统一在 `src/services/` 或 `src/utils/request.ts` 调接口，不在组件里散落请求逻辑。
4. 最后改页面/组件  
   - 页面负责编排，通用能力下沉到 `components` 和 `utils`。
5. 本地联调  
   - 至少验证：成功路径、空状态、异常路径（接口失败/超时）。
6. 构建检查  
   - 前端执行 `npm run build`，后端至少保证 `fastapi dev` 无启动错误。

## 8. 开发约束（避免踩坑）

- 不在代码中硬编码密钥、数据库密码或私有地址；统一走环境变量。
- 新增接口时保持响应结构稳定，避免前端隐式依赖被破坏。
- 对高频调用（查词、翻译）优先关注延迟和失败重试策略。
- 组件不要直接耦合第三方 SDK，统一通过 service 层隔离。

## 9. 推荐开发目标

- 新功能优先落在 `smash-english-standalone` 与 `my-fastapi-app`。
- `smash-english-purefrontend` 仅做历史参考或迁移对照，不作为主线迭代目标。

## 10. 每次开发前必做

开发前先阅读：

- `README.md`（本文件）
- `.agents/skills/project-dev-guide/SKILL.md`

如果你使用 Codex/Agent 协作，直接在需求里提到 `project-dev-guide`，让 Agent 按统一流程执行。
