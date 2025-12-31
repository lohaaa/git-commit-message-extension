import * as vscode from 'vscode';
import { randomUUID } from 'crypto';

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
}

export class ConfigManager {
  constructor(private context: vscode.ExtensionContext) {}

  private readonly PRESET_PROMPTS = {
    low: `You are a git commit message generator. Based on the staged changes, generate a concise commit message following the Conventional Commits specification.

## Context
Branch: {branch}
Staged files:
{files}

Staged changes:
{diff}

## Requirements
1. Format: \`type(scope): subject\` where scope is optional
2. Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert
3. Subject: Clear, concise description in {lang}
4. Maximum length: 72 characters for the first line
5. Use \`!\` for breaking changes if needed (e.g., \`feat!: breaking change\`)
6. Use imperative mood (e.g., "add" not "added" or "adds")
7. Do NOT include body or footer, only the title line

## Output
Generate ONLY the commit message title, nothing else. No explanations, no markdown, no quotes.`,

    medium: `You are a git commit message generator. Based on the staged changes, generate a commit message with title and body following the Conventional Commits specification.

## Context
Branch: {branch}
Staged files:
{files}

Staged changes:
{diff}

## Requirements
1. Title format: \`type(scope): subject\` where scope is optional
2. Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert
3. Title: Clear, concise description in {lang}, max 72 characters
4. Use \`!\` for breaking changes if needed (e.g., \`feat!: breaking change\`)
5. Use imperative mood (e.g., "add" not "added" or "adds")
6. Body: Group changes by module/component, use bullet points in {lang}
7. Each bullet point should summarize related changes in that module

## Output Format
\`\`\`
type(scope): subject

- module1: summary of changes
- module2: summary of changes
\`\`\`

Generate the commit message following this format. No extra explanations.`,

    high: `You are a git commit message generator. Based on the staged changes, generate a detailed commit message with title and body following the Conventional Commits specification.

## Context
Branch: {branch}
Staged files:
{files}

Staged changes:
{diff}

## Requirements
1. Title format: \`type(scope): subject\` where scope is optional
2. Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert
3. Title: Clear, concise description in {lang}, max 72 characters
4. Use \`!\` for breaking changes if needed (e.g., \`feat!: breaking change\`)
5. Use imperative mood (e.g., "add" not "added" or "adds")
6. Body: Organize changes by file, use bullet points in {lang}
7. For each file, summarize the key changes
8. If there are special/breaking changes, list them separately under "Breaking Changes" or "Special Notes"

## Output Format
\`\`\`
type(scope): subject

- path/to/file1: summary of changes
- path/to/file2: summary of changes

Breaking Changes:
- description of breaking change if any
\`\`\`

Generate the commit message following this format. No extra explanations.`
  };

  getActiveProviderId(): string {
    return vscode.workspace.getConfiguration('commitMessageAuto').get('activeProvider', '');
  }

  getProviders(): Provider[] {
    return vscode.workspace.getConfiguration('commitMessageAuto').get('providers', []);
  }

  getActiveProvider(): Provider | undefined {
    const activeId = this.getActiveProviderId();
    return this.getProviders().find(p => p.id === activeId);
  }

  async addProvider(name: string, baseUrl: string, model: string): Promise<Provider> {
    const provider: Provider = {
      id: randomUUID(),
      name,
      baseUrl,
      model
    };
    const providers = this.getProviders();
    providers.push(provider);
    await vscode.workspace.getConfiguration('commitMessageAuto').update('providers', providers, vscode.ConfigurationTarget.Global);
    return provider;
  }

  async setActiveProvider(id: string): Promise<void> {
    await vscode.workspace.getConfiguration('commitMessageAuto').update('activeProvider', id, vscode.ConfigurationTarget.Global);
  }

  async getApiKey(providerId: string): Promise<string | undefined> {
    return await this.context.secrets.get(`apiKey_${providerId}`);
  }

  async setApiKey(providerId: string, apiKey: string): Promise<void> {
    await this.context.secrets.store(`apiKey_${providerId}`, apiKey);
  }

  getPromptTemplate(): string {
    const mode = this.getPromptMode();

    if (mode === 'custom') {
      return vscode.workspace.getConfiguration('commitMessageAuto').get('promptTemplate', this.PRESET_PROMPTS.low);
    }

    return this.PRESET_PROMPTS[mode as keyof typeof this.PRESET_PROMPTS] || this.PRESET_PROMPTS.low;
  }

  getPromptMode(): string {
    return vscode.workspace.getConfiguration('commitMessageAuto').get('promptMode', 'low');
  }

  getLanguage(): string {
    return vscode.workspace.getConfiguration('commitMessageAuto').get('language', 'English');
  }

  getMaxTitleLength(): number {
    return vscode.workspace.getConfiguration('commitMessageAuto').get('maxTitleLength', 72);
  }
}
