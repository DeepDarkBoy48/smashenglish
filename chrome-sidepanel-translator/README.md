# SmashEnglish Side Panel (Chrome Extension)

一个独立的 Chrome 插件侧边栏实现，统一走 SmashEnglish 后端服务。双击网页中的英文单词，或在 YouTube 视频页直接点击字幕单词后，插件都会请求后端分析并自动写入数据库；翻译页也通过后端接口完成。

## 功能

- Chrome Side Panel 形态
- 翻译页：通过后端 `/api/fastapi/translate-advanced` 翻译
- 单词卡片页：通过后端 `/api/fastapi/quick-lookup` 分析并自动写库
- 双击选中网页单词后自动抓取所在句子
- YouTube 视频页可直接点击字幕中的英文单词，右侧生成单词卡片
- 右侧生成上下文单词卡片，视觉风格贴近主站精读页的 AI 卡片
- 后端地址与触发开关本地存储（`chrome.storage.local`）

## 安装（开发者模式）

1. 打开 Chrome，进入 `chrome://extensions/`
2. 打开右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择目录：
   - `/Users/robinmacmini/Programming/littleWebsite/smashenglish/chrome-sidepanel-translator`

## 使用

1. 点击扩展图标，打开 Side Panel。
2. 首次使用点击右上角 `API 设置`，确认：
   - 后端基地址（默认 `https://learn.nanopixel.uk`）
   - 自动触发开关
3. 返回侧边栏，保持面板打开。
4. 在网页里双击选中一个英文单词。
5. 右侧会自动生成单词卡片。
6. 在 YouTube 视频页开启字幕后，可直接点击字幕中的英文单词生成卡片。
7. 如需网页内快捷触发，在 `API 设置` 中开启：
   - `选中后触发当前面板`
   - `双击后触发当前面板`

补充说明：
- 插件不再单独配置 Gemini API Key，AI 能力统一走你部署的后端。
- `quick-lookup` 后端接口会在返回单词卡片的同时自动写入 `saved_words`。

## 备注

- 默认后端地址：
  - `https://learn.nanopixel.uk`
- 插件请求的是前端域名下公开出来的 `/api/fastapi/*` 代理路径，而不是直接访问 Docker 容器网络。
