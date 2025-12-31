# Git Commit Message 插件 - 设计文档（V1）

## 目标
- 在 VS Code Git 面板提供"生成提交消息"按钮。
- 基于暂存区变更生成 Conventional Commit，并流式写入提交输入框。
- 支持 OpenAI-compatible API（chat completions + streaming）。
- 提供 Webview 设置面板管理多个 Provider 配置。
- 不自动提交，只填入输入框。

## 非目标
- 暂存区为空时不回退到 `git diff`。
- 不支持多仓库并行生成。

## 交互与体验
- 在 SCM 视图标题栏添加图标按钮（sparkle 图标）。
- 自动检测当前活动仓库或使用第一个仓库。
- 生成开始前清空提交输入框。
- 已有内容直接覆盖。
- 暂存区无变更时提示："暂存区没有变更项"。
- 提供命令 "Git Commit Message: Open Settings" 打开设置面板。

## 停止生成 UI
- 使用 `window.withProgress` 的可取消进度条（`ProgressLocation.Notification`）。
- 进度条显示在右下角通知区域，不阻塞其他操作。
- 取消后通过 `AbortController` 立即中止流式请求。
- 不额外增加 SCM 标题栏"停止"按钮。

## 并发策略
- 全局队列，同一时间只允许一个生成任务。
- 所有仓库的请求进入同一队列，按顺序串行执行。
- 入队时提示："已加入队列"。

## Conventional Commits 约束
- 格式：`type(scope): subject`，`scope` 可选。
- 支持 `!` 破坏性变更标记（如 `feat!: breaking change`）。
- 标题长度默认最大 72（可配置）。
- 约束方式：Prompt 强约束 + 生成后轻量后处理：
  - 超长标题截断
- 生成结果直接填入输入框，不验证格式，由用户判断是否使用。

## Prompt 模板与变量
- 提供默认模板，用户可自定义。
- 支持变量：
  - `{diff}`：暂存区 diff
  - `{files}`：暂存文件列表
  - `{branch}`：当前分支
  - `{lang}`：目标语言（来自配置）
- 输出语言由 `{lang}` 控制，模板自身语言不限。

### 默认模板
```
You are a git commit message generator. Based on the staged changes, generate a concise commit message following the Conventional Commits specification.

## Context
Branch: {branch}
Staged files:
{files}

Staged changes:
{diff}

## Requirements
1. Format: `type(scope): subject` where scope is optional
2. Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert
3. Subject: Clear, concise description in {lang}
4. Maximum length: 72 characters for the first line
5. Use `!` for breaking changes if needed (e.g., `feat!: breaking change`)
6. Use imperative mood (e.g., "add" not "added" or "adds")
7. Do NOT include body or footer, only the title line

## Output
Generate ONLY the commit message title, nothing else. No explanations, no markdown, no quotes.
```

## Git 数据来源
- 暂存区 diff：`git -C <root> diff --cached`
- 暂存文件列表：`git -C <root> diff --cached --name-only`
- 当前分支：`git -C <root> rev-parse --abbrev-ref HEAD`

## OpenAI-Compatible 接口
- 端点智能检测：
  - 如果 baseUrl 已包含版本路径（如 `/v4`），则使用 `{baseUrl}/chat/completions`
  - 否则使用 `{baseUrl}/v1/chat/completions`
  - 自动移除 baseUrl 末尾的斜杠
- 请求：
  - `model`，`messages`，`stream: true`
  - Authorization: `Bearer {apiKey}`
- 流式解析：
  - 处理 `data: {json}` 行
  - 读取 `choices[0].delta.content`
  - `data: [DONE]` 结束
  - 支持 AbortSignal 取消请求

## 配置
- 支持多套 Provider，通过 Webview 设置面板管理。
- 全局配置项：
  - `gitCommitMessage.activeProvider`：当前激活的 provider ID
  - `gitCommitMessage.promptTemplate`：Prompt 模板（默认使用上述模板）
  - `gitCommitMessage.language`：目标语言（如 "English"、"中文"）
  - `gitCommitMessage.maxTitleLength`：标题最大长度（默认 72）
- Provider 配置项：
  - `gitCommitMessage.providers[]`：
    - `id`：唯一标识符（UUID，自动生成）
    - `name`：显示名称（用户可修改）
    - `baseUrl`：API 端点基础 URL（不含 /chat/completions）
    - `model`：模型名称
- API Key 使用 VS Code SecretStorage，按 provider ID 存储（格式：`apiKey_{providerId}`）。
- 首次使用或缺失时提示输入 API Key。

## 设置面板
- 使用 Webview 实现的可视化配置界面。
- 功能：
  - 查看所有 Provider 列表，显示激活状态
  - 添加新 Provider（名称、Base URL、模型、API Key）
  - 编辑现有 Provider
  - 删除 Provider（自动切换激活项）
  - 设置激活的 Provider
  - 配置全局设置（语言、最大标题长度、Prompt 模板）
- 通信机制：
  - Webview 向扩展发送命令：`getConfig`、`addProvider`、`updateProvider`、`deleteProvider`、`setActiveProvider`、`updateGlobalConfig`
  - 扩展向 Webview 发送配置数据：`configData`
- 样式：使用 VS Code 主题变量，支持深色/浅色主题

## 错误处理
- 暂存区为空：提示"暂存区没有变更项"
- Provider 配置缺失：提示"请先配置 Provider"
- API Key 缺失：弹窗输入并保存到 SecretStorage
- 网络/鉴权失败：友好提示 + OutputChannel 记录详情
- 用户取消生成：通过 AbortController 中止请求，记录到 OutputChannel

## 架构模块
- `extension.ts`：插件入口，注册命令和初始化模块
  - `activate()`：创建 OutputChannel、ConfigManager、GitAdapter、PromptBuilder、ScmWriter、GenerationQueue
  - 注册命令：`git-commit-message.generate`、`git-commit-message.openSettings`
  - `generateCommitMessage()`：核心生成流程
- `configManager.ts`：配置管理
  - 读取/更新 workspace configuration
  - 管理 Provider 列表和激活状态
  - 通过 SecretStorage 存取 API Key
  - 提供配置访问接口：`getActiveProvider()`、`getPromptTemplate()`、`getLanguage()`、`getMaxTitleLength()`
- `settingsPanel.ts`：Webview 设置面板
  - 单例模式，避免重复打开
  - 处理 Webview 消息：添加/编辑/删除 Provider、切换激活项、更新全局配置
  - 生成 HTML 内容，包含表单和交互逻辑
- `gitAdapter.ts`：Git 操作封装
  - `getStagedDiff()`：获取暂存区 diff
  - `getStagedFiles()`：获取暂存文件列表
  - `getCurrentBranch()`：获取当前分支名
  - 使用 `child_process.exec` 执行 git 命令
- `promptBuilder.ts`：Prompt 模板处理
  - `build()`：替换模板中的变量 `{diff}`、`{files}`、`{branch}`、`{lang}`
- `openaiClient.ts`：OpenAI-compatible API 客户端
  - `streamChatCompletion()`：流式请求，返回 AsyncGenerator
  - 智能端点检测（处理带版本路径的 baseUrl）
  - 支持 AbortSignal 取消请求
  - 解析 SSE 格式的流式响应
- `scmWriter.ts`：SCM 输入框操作
  - `writeToInputBox()`：写入提交消息
  - `clearInputBox()`：清空输入框
- `generationQueue.ts`：任务队列
  - 单任务串行执行
  - `enqueue()`：添加任务到队列
  - `isRunning()`：检查是否有任务正在执行
  - `getQueueLength()`：获取队列长度

## 命令与菜单
- 命令：
  - `git-commit-message.generate`：生成提交消息（sparkle 图标）
  - `git-commit-message.openSettings`：打开设置面板
- 菜单：
  - `scm/title`：在 Git SCM 标题栏显示生成按钮（仅当 `scmProvider == git` 时）

## 激活事件
- `onStartupFinished`：VS Code 启动完成后激活插件

