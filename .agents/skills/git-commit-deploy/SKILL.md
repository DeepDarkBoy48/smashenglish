---
name: git-commit-deploy
description: "在 SmashEnglish 项目需要提交并部署到服务器时使用。当前 Git 提交与推送统一走 monorepo `git@github.com:DeepDarkBoy48/smashenglish.git`；部署前先检查后端数据库 host；只要本次部署流程里使用了 git 提交或推送，必须先调用仓库内 `git-diff-feature-log` skill 维护 `FEATURE_LOG.md`；然后优先用 `sshpass` 登录 `47.79.43.73`，按服务器实际目录执行后端与前端部署，并做容器校验。"
---

# Git Commit Deploy

用于 SmashEnglish 的固定提交与部署流程。目标是减少判断成本，直接按当前 monorepo 和服务器新目录执行，不再兼容旧的双仓库服务器布局。

## 0. 项目边界

本地工作区根目录：

`/Users/robin/Programming/littleWebsite/smashenglish`

当前 Git 仓库只有一个，就是工作区根目录本身。提交和推送默认都在根目录执行，不再分别进入 `my-fastapi-app` 和 `smash-english-standalone` 作为独立仓库处理。

主要子项目：

- 后端：`/Users/robin/Programming/littleWebsite/smashenglish/my-fastapi-app`
- 前端：`/Users/robin/Programming/littleWebsite/smashenglish/smash-english-standalone`
- 浏览器扩展：`/Users/robin/Programming/littleWebsite/smashenglish/chrome-sidepanel-translator`

默认部署对象仍然只有：

- `my-fastapi-app`
- `smash-english-standalone`

除非用户明确点名，否则不要默认部署 `chrome-sidepanel-translator`。

唯一远端仓库：

- `git@github.com:DeepDarkBoy48/smashenglish.git`

服务器固定信息：

- Host: `47.79.43.73`
- User: `root`
- Password: `Hl5M;0feB+64zZ`

## 1. 本机工具选择规则

优先级固定如下：

1. 若本机有 `sshpass`，优先使用 `sshpass`
2. 若没有 `sshpass`，再退回 `expect`
3. 不要先尝试纯 `ssh` 再等待失败，除非你明确知道本机已配置可用密钥

快速检查：

```bash
which sshpass
which expect
```

推荐连接方式：

```bash
sshpass -p 'Hl5M;0feB+64zZ' ssh -o StrictHostKeyChecking=no root@47.79.43.73
```

注意：服务器上不保证安装了 `rg`，远程检查默认使用 `grep`、`find`、`test`。

## 2. 强制检查后端数据库 host

检查文件：

`/Users/robin/Programming/littleWebsite/smashenglish/my-fastapi-app/main.py`

必须满足：

- 存在并启用：`'host': 'mysql-container',`
- 存在并注释：`# 'host': '47.79.43.73',`

检查命令：

```bash
rg -n "47\.79\.43\.73|mysql-container" /Users/robin/Programming/littleWebsite/smashenglish/my-fastapi-app/main.py
```

如果不满足，先修正配置，再继续提交和部署。

## 3. 提交与推送规则

提交、推送都在根仓库执行：

```bash
cd /Users/robin/Programming/littleWebsite/smashenglish
git status --short
git add <相关文件>
git commit -m "<message>"
git push origin main
```

执行规则：

- 只要本次部署流程里涉及 `git add`、`git commit`、`git push` 中任意一步，必须先执行仓库内 [`git-diff-feature-log`](/Users/robin/Programming/littleWebsite/smashenglish/.agents/skills/git-diff-feature-log/SKILL.md) 的流程，更新根目录 `FEATURE_LOG.md`
- 维护功能日志时，优先基于 `git diff --cached`；如果还没暂存，则基于 `git diff`
- 只要有本地改动，统一在根仓库提交
- 提交信息应该概括本次后端、前端或扩展的变更范围
- 如果没有本地改动，不要为了部署制造空提交
- 如果这次只是远程服务器拉最新代码、重建容器，但本地不做 git 提交或推送，可以跳过功能日志更新

如果用户只想部署、不想提交，先确认本地工作区是否干净；不干净时不要擅自把未确认改动推上远端。

## 4. 服务器固定目录

服务器现在固定使用 monorepo 目录：

- 根目录：`/root/smashenglish/`
- 后端目录：`/root/smashenglish/my-fastapi-app/`
- 前端目录：`/root/smashenglish/smash-english-standalone/`

旧目录 ` /root/FastApi/ ` 和 ` /root/SmashEnglishStandalone/ ` 不再作为部署入口。后续部署不要再进入旧目录执行 `git pull`、`docker compose` 或 `docker build`。

先连接服务器：

```bash
sshpass -p 'Hl5M;0feB+64zZ' ssh -o StrictHostKeyChecking=no root@47.79.43.73
```

## 5. 服务器部署

### 5.1 先更新服务器代码

```bash
cd /root/smashenglish/
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git fetch origin "$BRANCH"

if git diff --quiet HEAD "origin/$BRANCH"; then
  echo "[repo] no updates, skip git pull"
  REPO_UPDATED=0
else
  git pull --ff-only origin "$BRANCH"
  REPO_UPDATED=1
fi
```

### 5.2 后端部署

```bash
cd /root/smashenglish/my-fastapi-app/
docker compose up -d --build
```

后端不依赖单独仓库更新判断，因为 monorepo 下代码已经在根目录统一拉取。

### 5.3 前端部署

```bash
cd /root/smashenglish/smash-english-standalone/
docker rm smash-english-container -f || true
docker rmi smash-english-app || true
docker build -t smash-english-app .
docker run -d -p 8083:80 --network appnet --name smash-english-container smash-english-app
```

如果用户明确说只部署后端或只部署前端，就只执行对应部分。

## 6. 部署后校验

默认先看容器状态：

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "smash-english-container|my-fastapi-container|fastapi|api|smash"
```

期望至少看到：

- `smash-english-container`
- `my-fastapi-container`，或名称中带 `fastapi` / `api` 的后端容器

如果前端容器不存在、退出、反复重启，立刻补日志：

```bash
docker logs --tail=100 smash-english-container
```

如果后端容器异常，再查看后端 compose 相关容器日志，例如：

```bash
docker logs --tail=100 my-fastapi-container
```

不要只汇报“部署失败”，要附上容器状态或日志关键信息。

## 7. 推荐执行顺序

标准顺序固定如下：

1. 检查 `my-fastapi-app/main.py` 的数据库 host
2. 在根仓库执行 `git status`
3. 如果准备提交或推送，先执行 `git-diff-feature-log`，更新 `FEATURE_LOG.md`
4. 在根仓库完成 `git add`、`git commit`、`git push origin main`
5. 用 `sshpass` 登录服务器
6. 在 `/root/smashenglish` 拉取最新代码
7. 在新目录下执行后端、前端部署
8. 用 `docker ps ... | grep -E ...` 做校验
9. 如果异常，立刻拉对应容器日志

## 8. 输出要求

部署完成后，回复里至少明确写出：

- 根仓库是否已提交并推送
- 如果本次用了 git 提交/推送，是否已更新 `FEATURE_LOG.md`
- 提交哈希，或“无更新跳过”
- 服务器根目录是否为 `/root/smashenglish`
- 后端是否重建成功，还是 `skip`
- 前端是否重建成功，还是 `skip`
- 容器校验结果和端口

不要只说“已部署”，要把提交对象、新部署目录和部署结果说清楚。
