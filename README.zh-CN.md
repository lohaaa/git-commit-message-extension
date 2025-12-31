# Git Commit Message Generator

[English](./README.md) | 简体中文

使用 AI 在 VS Code 中生成符合 Conventional Commits 规范的提交消息。

## 功能特性

- 基于暂存区变更自动生成提交消息
- 支持 OpenAI 兼容 API
- 流式生成，支持取消
- 多 Provider 配置管理
- 可自定义 Prompt 模板

## 使用方法

1. 在 Git 面板中暂存你的变更
2. 点击 SCM 标题栏的 ✨ 图标生成 AI 提交消息
3. 等待 AI 生成提交消息
4. 根据需要审查和编辑消息
5. 正常提交即可

## 配置说明

### 添加 Provider

1. 运行命令 `Git Commit Message: Open Settings` 打开设置面板
2. 点击 "Add Provider" 按钮
3. 填写以下信息：
   - Name：Provider 显示名称
   - Base URL：API 端点（例如：`https://api.openai.com`）
   - Model：模型名称（例如：`gpt-4`）
   - API Key：你的 API 密钥（可选，也可以在首次使用时输入）
4. 点击 "Save" 保存

### 配置 Prompt 模板

在设置面板的 "Global Settings" 部分可以自定义 Prompt 模板。支持以下变量：
- `{diff}`：暂存区变更的 diff
- `{files}`：暂存文件列表
- `{branch}`：当前分支名
- `{lang}`：目标语言

### 设置语言

在设置面板中配置提交消息的目标语言（默认：English）。

### 设置标题最大长度

在设置面板中配置提交消息标题的最大长度（默认：72）。

## 安全与隐私

**API 密钥存储**
- API 密钥使用 VS Code 的 SecretStorage API 安全存储
- 密钥经过加密，不会以明文形式存储
- 密钥存储在本地计算机上，不会保存在工作区设置中

**数据传输**
- 你的暂存变更（diff、文件名、分支名）会发送到配置的 AI 提供商
- 除了你选择的 AI 提供商外，不会向任何第三方发送数据
- 本扩展不会收集、存储或向开发者传输任何数据

**安全建议**
- 仅使用可信的 AI 提供商
- 提交前请审查生成的提交消息
- 处理敏感或专有代码时请谨慎
- 对于敏感项目，建议使用自托管的 AI 模型

## 系统要求

- VS Code 1.85.0 或更高版本
- Git 扩展已启用
- OpenAI 兼容 API 访问权限

## 许可证

MIT
