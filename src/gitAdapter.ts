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
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: repoRoot });
    return stdout.trim();
  }
}
