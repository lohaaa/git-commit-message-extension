import * as vscode from 'vscode';
import { ConfigManager } from './configManager';

export class SettingsPanel {
  private static currentPanel: SettingsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly configManager: ConfigManager
  ) {
    this.panel = panel;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.html = this.getHtmlContent();
    this.setupMessageHandling();
  }

  public static show(context: vscode.ExtensionContext, configManager: ConfigManager) {
    if (SettingsPanel.currentPanel) {
      SettingsPanel.currentPanel.panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'gitCommitMessageSettings',
      'Git Commit Message Settings',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    SettingsPanel.currentPanel = new SettingsPanel(panel, configManager);
  }

  private setupMessageHandling() {
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'getConfig':
            await this.sendConfig();
            break;
          case 'addProvider':
            await this.addProvider(message.data);
            break;
          case 'updateProvider':
            await this.updateProvider(message.data);
            break;
          case 'deleteProvider':
            await this.deleteProvider(message.data.id);
            break;
          case 'setActiveProvider':
            await this.configManager.setActiveProvider(message.data.id);
            await this.sendConfig();
            break;
          case 'updateGlobalConfig':
            await this.updateGlobalConfig(message.data);
            break;
        }
      },
      null,
      this.disposables
    );
  }

  private async sendConfig() {
    const providers = this.configManager.getProviders();
    const activeProviderId = this.configManager.getActiveProviderId();
    const promptTemplate = this.configManager.getPromptTemplate();
    const language = this.configManager.getLanguage();
    const maxTitleLength = this.configManager.getMaxTitleLength();

    this.panel.webview.postMessage({
      command: 'configData',
      data: {
        providers,
        activeProviderId,
        promptTemplate,
        language,
        maxTitleLength
      }
    });
  }

  private async addProvider(data: { name: string; baseUrl: string; model: string; apiKey?: string }) {
    const provider = await this.configManager.addProvider(data.name, data.baseUrl, data.model);
    if (this.configManager.getProviders().length === 1) {
      await this.configManager.setActiveProvider(provider.id);
    }
    if (data.apiKey) {
      await this.configManager.setApiKey(provider.id, data.apiKey);
    }
    await this.sendConfig();
    vscode.window.showInformationMessage(`Provider "${data.name}" added`);
  }

  private async updateProvider(data: { id: string; name: string; baseUrl: string; model: string; apiKey?: string }) {
    const providers = this.configManager.getProviders();
    const index = providers.findIndex(p => p.id === data.id);
    if (index === -1) return;

    providers[index] = {
      id: data.id,
      name: data.name,
      baseUrl: data.baseUrl,
      model: data.model
    };

    await vscode.workspace.getConfiguration('gitCommitMessage').update('providers', providers, vscode.ConfigurationTarget.Global);

    if (data.apiKey) {
      await this.configManager.setApiKey(data.id, data.apiKey);
    }

    await this.sendConfig();
    vscode.window.showInformationMessage(`Provider "${data.name}" updated`);
  }

  private async deleteProvider(id: string) {
    const providers = this.configManager.getProviders().filter(p => p.id !== id);
    await vscode.workspace.getConfiguration('gitCommitMessage').update('providers', providers, vscode.ConfigurationTarget.Global);

    let activeProviderId = this.configManager.getActiveProviderId();
    if (activeProviderId === id) {
      activeProviderId = providers[0]?.id || '';
      await this.configManager.setActiveProvider(activeProviderId);
    }

    this.panel.webview.postMessage({
      command: 'configData',
      data: {
        providers,
        activeProviderId,
        promptTemplate: this.configManager.getPromptTemplate(),
        language: this.configManager.getLanguage(),
        maxTitleLength: this.configManager.getMaxTitleLength()
      }
    });

    vscode.window.showInformationMessage('Provider deleted');
  }

  private async updateGlobalConfig(data: { promptTemplate: string; language: string; maxTitleLength: number }) {
    await vscode.workspace.getConfiguration('gitCommitMessage').update('promptTemplate', data.promptTemplate, vscode.ConfigurationTarget.Global);
    await vscode.workspace.getConfiguration('gitCommitMessage').update('language', data.language, vscode.ConfigurationTarget.Global);
    await vscode.workspace.getConfiguration('gitCommitMessage').update('maxTitleLength', data.maxTitleLength, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage('Settings saved');
  }

  private getHtmlContent(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { padding: 20px; font-family: var(--vscode-font-family); color: var(--vscode-foreground); }
    h2 { margin-top: 30px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 10px; }
    .section { margin-bottom: 30px; }
    .provider-card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); padding: 15px; margin-bottom: 10px; border-radius: 4px; }
    .provider-card.active { border-color: var(--vscode-focusBorder); }
    .provider-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .provider-name { font-weight: bold; font-size: 16px; }
    .provider-info { font-size: 12px; color: var(--vscode-descriptionForeground); margin: 5px 0; }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 16px; cursor: pointer; border-radius: 2px; margin-right: 5px; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    input, textarea { width: 100%; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); margin: 5px 0; box-sizing: border-box; }
    textarea { min-height: 200px; font-family: monospace; }
    label { display: block; margin-top: 10px; font-weight: bold; }
    .form-group { margin-bottom: 15px; }
    .badge { display: inline-block; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 10px; }
  </style>
</head>
<body>
  <h1>Git Commit Message Settings</h1>

  <div class="section">
    <h2>Providers</h2>
    <div id="providers"></div>
    <button onclick="showAddProviderForm()">Add Provider</button>
  </div>

  <div id="providerForm" style="display:none;" class="section">
    <h3 id="providerFormTitle">Add New Provider</h3>
    <input type="hidden" id="providerFormId">
    <div class="form-group">
      <label>Name:</label>
      <input type="text" id="providerFormName" placeholder="e.g., OpenAI">
    </div>
    <div class="form-group">
      <label>Base URL:</label>
      <input type="text" id="providerFormBaseUrl" placeholder="e.g., https://api.openai.com">
      <small style="color: var(--vscode-descriptionForeground);">
        Enter the base URL without /chat/completions. Examples:<br>
        • OpenAI: https://api.openai.com<br>
        • GLM: https://open.bigmodel.cn/api/coding/paas/v4<br>
        • Azure OpenAI: https://your-resource.openai.azure.com<br>
        • Other compatible APIs: https://your-api-endpoint.com
      </small>
    </div>
    <div class="form-group">
      <label>Model:</label>
      <input type="text" id="providerFormModel" placeholder="e.g., gpt-4, GLM-4.7">
    </div>
    <div class="form-group">
      <label>API Key (optional, leave empty to keep existing):</label>
      <input type="password" id="providerFormApiKey" placeholder="Enter your API key">
    </div>
    <button onclick="saveProvider()">Save</button>
    <button class="secondary" onclick="hideProviderForm()">Cancel</button>
  </div>

  <div class="section">
    <h2>Global Settings</h2>
    <div class="form-group">
      <label>Language:</label>
      <input type="text" id="language" placeholder="e.g., English, 中文">
    </div>
    <div class="form-group">
      <label>Max Title Length:</label>
      <input type="number" id="maxTitleLength">
    </div>
    <div class="form-group">
      <label>Prompt Template:</label>
      <textarea id="promptTemplate"></textarea>
    </div>
    <button onclick="saveGlobalSettings()">Save Global Settings</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let config = null;

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'configData') {
        config = message.data;
        renderConfig();
      }
    });

    vscode.postMessage({ command: 'getConfig' });

    function renderConfig() {
      if (!config) return;

      // Render providers
      const providersDiv = document.getElementById('providers');
      providersDiv.innerHTML = config.providers.map(p => \`
        <div class="provider-card \${p.id === config.activeProviderId ? 'active' : ''}">
          <div class="provider-header">
            <div>
              <span class="provider-name">\${p.name}</span>
              \${p.id === config.activeProviderId ? '<span class="badge">Active</span>' : ''}
            </div>
            <div>
              \${p.id !== config.activeProviderId ? \`<button class="secondary" onclick="setActive('\${p.id}')">Set Active</button>\` : ''}
              <button class="secondary" onclick="editProvider('\${p.id}')">Edit</button>
              <button class="secondary" onclick="deleteProvider('\${p.id}')">Delete</button>
            </div>
          </div>
          <div class="provider-info">Base URL: \${p.baseUrl}</div>
          <div class="provider-info">Model: \${p.model}</div>
        </div>
      \`).join('');

      // Render global settings
      document.getElementById('language').value = config.language;
      document.getElementById('maxTitleLength').value = config.maxTitleLength;
      document.getElementById('promptTemplate').value = config.promptTemplate;
    }

    function showAddProviderForm() {
      document.getElementById('providerFormTitle').textContent = 'Add New Provider';
      document.getElementById('providerFormId').value = '';
      document.getElementById('providerFormName').value = '';
      document.getElementById('providerFormBaseUrl').value = '';
      document.getElementById('providerFormModel').value = '';
      document.getElementById('providerFormApiKey').value = '';
      document.getElementById('providerForm').style.display = 'block';
    }

    function hideProviderForm() {
      document.getElementById('providerForm').style.display = 'none';
    }

    function editProvider(id) {
      const provider = config.providers.find(p => p.id === id);
      if (!provider) return;

      document.getElementById('providerFormTitle').textContent = 'Edit Provider';
      document.getElementById('providerFormId').value = provider.id;
      document.getElementById('providerFormName').value = provider.name;
      document.getElementById('providerFormBaseUrl').value = provider.baseUrl;
      document.getElementById('providerFormModel').value = provider.model;
      document.getElementById('providerFormApiKey').value = '';
      document.getElementById('providerForm').style.display = 'block';
    }

    function saveProvider() {
      const id = document.getElementById('providerFormId').value;
      const name = document.getElementById('providerFormName').value;
      const baseUrl = document.getElementById('providerFormBaseUrl').value;
      const model = document.getElementById('providerFormModel').value;
      const apiKey = document.getElementById('providerFormApiKey').value;

      if (!name || !baseUrl || !model) {
        alert('Please fill all required fields');
        return;
      }

      if (id) {
        vscode.postMessage({
          command: 'updateProvider',
          data: { id, name, baseUrl, model, apiKey }
        });
      } else {
        vscode.postMessage({
          command: 'addProvider',
          data: { name, baseUrl, model, apiKey }
        });
      }

      hideProviderForm();
    }

    function deleteProvider(id) {
      vscode.postMessage({
        command: 'deleteProvider',
        data: { id }
      });
    }

    function setActive(id) {
      vscode.postMessage({
        command: 'setActiveProvider',
        data: { id }
      });
    }

    function saveGlobalSettings() {
      const language = document.getElementById('language').value;
      const maxTitleLength = parseInt(document.getElementById('maxTitleLength').value);
      const promptTemplate = document.getElementById('promptTemplate').value;

      vscode.postMessage({
        command: 'updateGlobalConfig',
        data: { language, maxTitleLength, promptTemplate }
      });
    }
  </script>
</body>
</html>`;
  }

  private dispose() {
    SettingsPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
