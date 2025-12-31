import * as vscode from 'vscode';
import { GitAdapter } from './gitAdapter';
import { PromptBuilder } from './promptBuilder';
import { OpenAIClient } from './openaiClient';
import { ScmWriter } from './scmWriter';
import { GenerationQueue } from './generationQueue';
import { ConfigManager } from './configManager';
import { SettingsPanel } from './settingsPanel';

let outputChannel: vscode.OutputChannel;
const queue = new GenerationQueue();

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Git Commit Message');
  const configManager = new ConfigManager(context);
  const gitAdapter = new GitAdapter();
  const promptBuilder = new PromptBuilder();
  const scmWriter = new ScmWriter();

  const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
  if (!gitExtension) {
    vscode.window.showErrorMessage('Git extension not found');
    return;
  }

  const git = gitExtension.getAPI(1);

  const generateCommand = vscode.commands.registerCommand('git-commit-message.generate', async () => {
    const repository = git.repositories.find((repo: any) => {
      return vscode.window.activeTextEditor?.document.uri.fsPath.startsWith(repo.rootUri.fsPath) ||
             vscode.workspace.workspaceFolders?.some(folder => folder.uri.fsPath === repo.rootUri.fsPath);
    }) || git.repositories[0];

    if (!repository) {
      vscode.window.showErrorMessage('No git repository found');
      return;
    }

    if (queue.isRunning()) {
      vscode.window.showInformationMessage('已加入队列');
    }

    await queue.enqueue(async () => {
      await generateCommitMessage(repository, configManager, gitAdapter, promptBuilder, scmWriter);
    });
  });

  const settingsCommand = vscode.commands.registerCommand('git-commit-message.openSettings', () => {
    SettingsPanel.show(context, configManager);
  });

  context.subscriptions.push(generateCommand, settingsCommand);
}

async function generateCommitMessage(
  repository: any,
  configManager: ConfigManager,
  gitAdapter: GitAdapter,
  promptBuilder: PromptBuilder,
  scmWriter: ScmWriter
) {
  try {
    const repoRoot = repository.rootUri.fsPath;

    // Check staged changes
    const stagedDiff = await gitAdapter.getStagedDiff(repoRoot);
    if (!stagedDiff.trim()) {
      vscode.window.showWarningMessage('暂存区没有变更项');
      return;
    }

    // Get provider
    const provider = configManager.getActiveProvider();
    if (!provider) {
      vscode.window.showErrorMessage('请先配置 Provider');
      return;
    }

    // Get API key
    let apiKey = await configManager.getApiKey(provider.id);
    if (!apiKey) {
      apiKey = await vscode.window.showInputBox({
        prompt: `请输入 ${provider.name} 的 API Key`,
        password: true
      });
      if (!apiKey) {
        return;
      }
      await configManager.setApiKey(provider.id, apiKey);
    }

    // Get git data
    const stagedFiles = await gitAdapter.getStagedFiles(repoRoot);
    const branch = await gitAdapter.getCurrentBranch(repoRoot);

    // Build prompt
    const template = configManager.getPromptTemplate();
    const language = configManager.getLanguage();
    const prompt = promptBuilder.build(template, {
      diff: stagedDiff,
      files: stagedFiles,
      branch,
      lang: language
    });

    // Clear input box
    await scmWriter.clearInputBox(repository);

    // Generate with progress
    const abortController = new AbortController();
    let generatedMessage = '';

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: '正在生成提交消息...',
        cancellable: true
      },
      async (progress, token) => {
        token.onCancellationRequested(() => {
          abortController.abort();
        });

        const client = new OpenAIClient(provider.baseUrl, apiKey!, provider.model);

        try {
          for await (const chunk of client.streamChatCompletion(prompt, abortController.signal)) {
            generatedMessage += chunk;
            await scmWriter.writeToInputBox(repository, generatedMessage);
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            outputChannel.appendLine('Generation cancelled by user');
            return;
          }
          throw error;
        }
      }
    );

    // Post-process: truncate if too long
    if (generatedMessage) {
      const maxLength = configManager.getMaxTitleLength();
      const lines = generatedMessage.split('\n');
      const firstLine = lines[0];

      if (firstLine.length > maxLength) {
        const truncated = firstLine.substring(0, maxLength);
        await scmWriter.writeToInputBox(repository, truncated);
      }
    }

  } catch (error: any) {
    outputChannel.appendLine(`Error: ${error.message}`);
    outputChannel.appendLine(error.stack || '');
    vscode.window.showErrorMessage(`生成失败: ${error.message}`);
  }
}

export function deactivate() {}
