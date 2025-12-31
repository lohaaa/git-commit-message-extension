# Commit Message Auto

English | [简体中文](./README.zh-CN.md)

Generate conventional commit messages using AI in VS Code.

## Features

- Generate commit messages based on staged changes
- Support for OpenAI-compatible APIs
- Streaming generation with cancellation support
- Multiple provider configurations
- Customizable prompt templates

## Usage

1. Stage your changes in the Git panel
2. Click the sparkle icon (✨) in the SCM title bar to generate an AI commit message
3. Wait for the AI to generate a commit message
4. Review and edit the message if needed
5. Commit as usual

## Configuration

### Add a Provider

1. Run command `Commit Message Auto: Open Settings` to open the settings panel
2. Click the "Add Provider" button
3. Fill in the following information:
   - Name: Display name for the provider
   - Base URL: API endpoint (e.g., `https://api.openai.com`)
   - Model: Model name (e.g., `gpt-4`)
   - API Key: Your API key (optional, can be entered on first use)
4. Click "Save" to save

### Configure Prompt Template

Customize the prompt template in the settings panel under "Global Settings". Available variables:
- `{diff}`: Staged changes diff
- `{files}`: Staged file list
- `{branch}`: Current branch name
- `{lang}`: Target language

### Set Language

Configure the target language for commit messages in the settings panel (default: English).

### Set Max Title Length

Configure the maximum length for commit message titles in the settings panel (default: 72).

## Security & Privacy

**API Key Storage**
- API keys are securely stored using VS Code's SecretStorage API
- Keys are encrypted and never stored in plain text
- Keys are stored locally on your machine, not in workspace settings

**Data Transmission**
- Your staged changes (diff, file names, branch name) are sent to the configured AI provider
- No data is sent to any third party except your chosen AI provider
- This extension does not collect, store, or transmit any data to its developers

**Recommendations**
- Only use trusted AI providers
- Review generated commit messages before committing
- Be cautious when working with sensitive or proprietary code
- Consider using self-hosted AI models for sensitive projects

## Requirements

- VS Code 1.85.0 or higher
- Git extension enabled
- OpenAI-compatible API access

## License

MIT
