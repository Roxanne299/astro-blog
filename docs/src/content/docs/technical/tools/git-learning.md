---
title: QFC-git学习
pubDate: 2025-07-08
categories: ["技术","git"]
description: "这是一篇基于去哪儿 QFC 培训期间的 Git 学习心得，整理了常用命令、版本管理概念、常见疑难点以及代理配置等实际问题的解决方法。"
---
老旧git笔记可以查看[git笔记](https://roxanne299.github.io/2023/10/30/linux-git/)

# 🧠 Git 学习笔记（2025年7月8日）

---

## 📌 1. Git 三区概念

| 区域名         | 描述                         | 常用命令示例               |
| -------------- | ---------------------------- | -------------------------- |
| 工作区         | 你正在编辑的实际文件位置     | `git diff`                 |
| 暂存区         | 准备提交的内容（已 git add） | `git diff --cached`        |
| HEAD（版本库） | 最近一次提交                 | `git log`, `HEAD~1` 等查看 |

---

## 📌 2. `git commit -am` 的用法

```bash
git commit -am "说明"
```

等价于：

```bash
git add <已被 Git 跟踪的文件>
git commit -m "说明"
```

> ⚠️ 不会添加新文件，必须是已被 Git 跟踪的文件才会生效。

---

## 📌 3. `git reset` 三种模式对比

| 模式      | 是否回退 HEAD | 是否清除暂存区 | 是否改动工作区 | 用途说明                   |
| --------- | ------------- | -------------- | -------------- | -------------------------- |
| `--soft`  | ✅             | ❌              | ❌              | 仅撤销提交，保留暂存和改动 |
| `--mixed` | ✅             | ✅              | ❌              | 撤销提交 + 暂存，保留修改  |
| `--hard`  | ✅             | ✅              | ✅              | 全部撤销（包括文件内容）⚠️  |

---

## 📌 4. `git revert` vs `git reset`

| 命令         | 原理                     | 是否改历史 | 推荐用途           |
| ------------ | ------------------------ | ---------- | ------------------ |
| `git revert` | 新建一个“反向”提交       | ❌ 否       | 协作场景下公开撤销 |
| `git reset`  | 直接修改 HEAD 指向的提交 | ✅ 是       | 本地清理、整理历史 |

---

## 📌 5. `HEAD~1` 和版本号的使用

- `HEAD`：当前分支的最新提交
- `HEAD~1`：倒数第 1 次提交（同 `HEAD^`）
- `HEAD~2`：倒数第 2 次，以此类推

你也可以直接使用 commit 哈希：

```bash
git reset --hard abc1234
git checkout abc1234
git cherry-pick abc1234
```

查看提交历史：

```bash
git log --oneline
```

---

## 📌 6. `git diff` 与 `git diff --cached`

| 命令                | 比较内容                          |
| ------------------- | --------------------------------- |
| `git diff`          | 工作区 ↔ 暂存区（修改未 add）     |
| `git diff --cached` | 暂存区 ↔ HEAD（已 add 未 commit） |

> 💡 `git diff` 默认是从 **后向前比较**：即，“现在的内容” 和 “之前版本（HEAD 或 index）” 进行对比。旧的用 `---` 标记，新的用 `+++` 标记。

---

## 📌 7. `git fetch` / `merge` / `pull` 区别

| 命令        | 说明                                 |
| ----------- | ------------------------------------ |
| `git fetch` | 获取远程最新版本到本地 `origin/分支` |
| `git merge` | 合并某个分支到当前分支               |
| `git pull`  | 相当于 `fetch + merge`               |

建议：使用 `git fetch` + `git log` 或 `git diff` 查看差异再决定是否 merge。

---

## 📌 8. `git cherry-pick` 用法

从其他分支复制某次提交到当前分支：

```bash
git cherry-pick <commit>
```

用于“挑着用”某个改动，而不合整个分支。

如有冲突：

```bash
git add .
git cherry-pick --continue
```

放弃当前操作：

```bash
git cherry-pick --abort
```

---

## 📌 9. `git rebase` vs `merge`

| 对比项     | `git merge`                   | `git rebase`            |
| ---------- | ----------------------------- | ----------------------- |
| 提交结构   | 保留分支结构（有 merge 提交） | 线性历史，无 merge 提交 |
| 是否改历史 | ❌ 否                          | ✅ 是                    |
| 使用场景   | 多人协作（安全）              | 本地整理、个人提交清理  |

---

## 📌 10. 分支图和对比查看命令

### 查看全图：

```bash
git log --oneline --graph --all
```

### 只看两个分支差异：

```bash
git log --oneline --graph master feature
```

### 查看某分支独有提交：

```bash
git log feature --not master --oneline
```

---

## 📌 11. `git checkout` 回退版本的用法

### 切换到历史版本（不会移动 HEAD）：

```bash
git checkout <commit-hash>
```

你会进入 **detached HEAD（游离头指针）** 状态。若想保留并继续开发：

```bash
git checkout -b new-branch
```

### 恢复单个文件内容：

- 恢复文件到最新提交：

```bash
git checkout -- <file>
```

- 恢复文件到历史版本：

```bash
git checkout <commit> -- <file>
```

---

## 📌 12. 常用快捷命令总结

| 操作                  | 命令                     |
| --------------------- | ------------------------ |
| 退出 `git log` 分页器 | 按 `q`                   |
| 不分页显示 log        | `git --no-pager log`     |
| 查看跟踪状态          | `git branch -vv`         |
| 查看远程状态          | `git remote show origin` |
| 放弃未暂存的本地修改  | `git checkout -- <file>` |
| 查看变更文件          | `git status`             |

_时间：2025年7月8日_
---

## 📌 13. Git 代理技巧（代理失效时的解决办法）

### 问题描述：

在使用 Git 克隆或拉取远程仓库时出现如下错误：

```
ssh: connect to host github.com port 22: Connection timed out
```

这是因为某些网络环境（如公司网络）屏蔽了 SSH 的默认 22 端口。

---

### ✅ 解决方法：切换到 HTTPS + 使用 443 端口

编辑 Git 配置，将 `github.com` 走 HTTPS 443 端口：

```bash
git config --global url."https://github.com/".insteadOf git@github.com:
```

或者设置 SSH 使用 443 端口：

编辑 `~/.ssh/config`（Windows 在 `C:\Users\你的用户名\.ssh\config`）添加：

```config
Host github.com
  Hostname ssh.github.com
  Port 443
  User git
```

此后即可通过 SSH 的 443 端口正常使用 Git：

```bash
git clone git@github.com:xxx/your-repo.git
```

---

### ✅ 附加命令：查看当前代理设置

```bash
git config --global --get http.proxy
git config --global --get https.proxy
```

取消代理：

```bash
git config --global --unset http.proxy
git config --global --unset https.proxy
```

---
