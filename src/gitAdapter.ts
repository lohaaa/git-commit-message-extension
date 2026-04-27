import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitAdapter {
  async getStagedDiff(repoRoot: string): Promise<string> {
    const { stdout } = await execAsync('git diff --cached', { cwd: repoRoot });
    return stdout;
  }

  async getStagedFiles(repoRoot: string): Promise<string> {
    const { stdout } = await execAsync('git diff --cached --name-only', { cwd: repoRoot });
    return stdout;
  }

  async getCurrentBranch(repoRoot: string): Promise<string> {
    try {
      // 空仓库首个提交前 HEAD 仍是符号引用，但不能通过 rev-parse 解析提交。
      const { stdout } = await execAsync('git symbolic-ref --quiet --short HEAD', { cwd: repoRoot });
      const branch = stdout.trim();
      if (branch) {
        return branch;
      }
    } catch {
      // Detached HEAD 没有符号分支名，继续沿用旧逻辑返回 HEAD。
    }

    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: repoRoot });
    return stdout.trim();
  }
}
