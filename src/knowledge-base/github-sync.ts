import { Octokit } from '@octokit/rest';
import fs from 'fs/promises';
import path from 'path';
import { KnowledgeBaseStorage } from './storage.js';
import { IndexedDocument } from '../schemas/knowledge-base.js';

/**
 * GitHub Sync Manager
 * Handles fetching and caching content from GitHub repositories
 */
export class GitHubSync {
  private octokit: Octokit;
  private storage: KnowledgeBaseStorage;

  constructor(githubToken: string, storage: KnowledgeBaseStorage) {
    this.octokit = new Octokit({ auth: githubToken });
    this.storage = storage;
  }

  /**
   * Discover all user repositories with .claude/ directories
   */
  async discoverUserRepos(username?: string): Promise<Array<{ owner: string; repo: string }>> {
    try {
      const { data: user } = username
        ? await this.octokit.users.getByUsername({ username })
        : await this.octokit.users.getAuthenticated();

      const { data: repos } = await this.octokit.repos.listForUser({
        username: user.login,
        per_page: 100,
        type: 'owner',
      });

      const reposWithClaude: Array<{ owner: string; repo: string }> = [];

      for (const repo of repos) {
        if (await this.hasCludeDirectory(repo.owner.login, repo.name)) {
          reposWithClaude.push({
            owner: repo.owner.login,
            repo: repo.name,
          });
        }
      }

      return reposWithClaude;
    } catch (error) {
      console.error('Error discovering user repos:', error);
      return [];
    }
  }

  /**
   * Check if a repository has a .claude directory
   */
  private async hasCludeDirectory(owner: string, repo: string): Promise<boolean> {
    try {
      await this.octokit.repos.getContent({
        owner,
        repo,
        path: '.claude',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetch files matching patterns from a repository
   */
  async fetchFilesFromRepo(
    owner: string,
    repo: string,
    branch: string = 'main',
    includePatterns: string[] = ['.claude/**/*.md'],
    excludePatterns: string[] = ['**/node_modules/**']
  ): Promise<IndexedDocument[]> {
    console.error(`Fetching files from ${owner}/${repo}...`);

    try {
      const repoPath = this.storage.getRepoPath(owner, repo);
      await this.storage.ensureRepoDir(owner, repo);
      const documents: IndexedDocument[] = [];

      // Get repository tree
      const { data: tree } = await this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: 'true',
      });

      // Filter files by patterns
      const matchingFiles = tree.tree.filter((item) => {
        if (item.type !== 'blob') return false;
        if (!item.path) return false;

        // Check if matches include patterns
        const includeMatch = includePatterns.some((pattern) =>
          this.matchPattern(item.path!, pattern)
        );
        if (!includeMatch) return false;

        // Check if matches exclude patterns
        const excludeMatch = excludePatterns.some((pattern) =>
          this.matchPattern(item.path!, pattern)
        );
        if (excludeMatch) return false;

        return true;
      });

      console.error(`Found ${matchingFiles.length} matching files`);

      // Fetch content for each file
      for (const file of matchingFiles) {
        if (!file.path || !file.sha) continue;

        try {
          const { data: blob } = await this.octokit.git.getBlob({
            owner,
            repo,
            file_sha: file.sha,
          });

          const content = Buffer.from(blob.content, 'base64').toString('utf-8');

          const document: IndexedDocument = {
            id: `${owner}/${repo}/${branch}/${file.path}`,
            repoOwner: owner,
            repoName: repo,
            branch,
            filePath: file.path,
            content,
            metadata: {
              fileType: path.extname(file.path).slice(1) || 'unknown',
              lastModified: new Date().toISOString(), // GitHub doesn't provide this in tree
              size: file.size || 0,
              hash: file.sha,
            },
            indexed: new Date().toISOString(),
          };

          documents.push(document);

          // Cache locally
          const localPath = path.join(repoPath, file.path);
          await fs.mkdir(path.dirname(localPath), { recursive: true });
          await fs.writeFile(localPath, content, 'utf-8');
        } catch (error) {
          console.error(`Error fetching file ${file.path}:`, error);
        }
      }

      return documents;
    } catch (error) {
      console.error(`Error fetching repo ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Get list of official MCP repositories
   */
  getOfficialMCPRepos(): Array<{ owner: string; repo: string }> {
    return [
      { owner: 'modelcontextprotocol', repo: 'servers' },
      { owner: 'modelcontextprotocol', repo: 'typescript-sdk' },
      { owner: 'modelcontextprotocol', repo: 'specification' },
    ];
  }

  /**
   * Get list of community MCP repositories from awesome lists
   */
  async getCommunityMCPRepos(): Promise<Array<{ owner: string; repo: string }>> {
    // Hard-coded for now, could fetch from awesome-mcp-servers later
    return [
      { owner: 'punkpeye', repo: 'awesome-mcp-servers' },
      { owner: 'wong2', repo: 'awesome-mcp-servers' },
    ];
  }

  /**
   * Simple glob-like pattern matching
   */
  private matchPattern(filePath: string, pattern: string): boolean {
    // Convert glob to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }

  /**
   * Get GitHub token from Claude Code's credential store
   */
  static async getGitHubTokenFromClaude(): Promise<string | null> {
    try {
      const credPath = path.join(process.env.HOME || '', '.claude', '.credentials.json');
      const data = await fs.readFile(credPath, 'utf-8');
      const creds = JSON.parse(data);

      // Look for GitHub token
      if (creds.github?.token) {
        return creds.github.token;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get GitHub token from environment or Claude Code
   */
  static async getToken(): Promise<string> {
    // Try environment variable first
    if (process.env.GITHUB_TOKEN) {
      return process.env.GITHUB_TOKEN;
    }

    // Try Claude Code credential store
    const claudeToken = await this.getGitHubTokenFromClaude();
    if (claudeToken) {
      return claudeToken;
    }

    throw new Error(
      'GitHub token not found. Set GITHUB_TOKEN environment variable or authenticate with Claude Code.'
    );
  }
}
