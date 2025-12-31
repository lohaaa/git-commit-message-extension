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
    return vscode.workspace.getConfiguration('commitMessageAuto').get('promptTemplate', '');
  }

  getLanguage(): string {
    return vscode.workspace.getConfiguration('commitMessageAuto').get('language', 'English');
  }

  getMaxTitleLength(): number {
    return vscode.workspace.getConfiguration('commitMessageAuto').get('maxTitleLength', 72);
  }
}
