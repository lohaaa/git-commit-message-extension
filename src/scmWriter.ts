import * as vscode from 'vscode';

export class ScmWriter {
  async writeToInputBox(repository: any, message: string): Promise<void> {
    repository.inputBox.value = message;
  }

  async clearInputBox(repository: any): Promise<void> {
    repository.inputBox.value = '';
  }
}
