import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import {
  Blocklist,
  BlocklistEntry,
  BlocklistSchema,
  KnowledgeBaseConfig,
  KnowledgeBaseConfigSchema,
  MCPSpecification,
  MCPSpecificationSchema,
} from '../schemas/knowledge-base.js';

/**
 * Storage manager for knowledge base data
 * Handles reading/writing JSON files in ~/.claude-kb/
 */
export class KnowledgeBaseStorage {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(os.homedir(), '.claude-kb');
  }

  async initialize(): Promise<void> {
    // Create directory structure
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'repos'), { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'data'), { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'templates'), { recursive: true });

    // Initialize default files if they don't exist
    await this.ensureDefaultFiles();
  }

  private async ensureDefaultFiles(): Promise<void> {
    const configPath = this.getConfigPath();
    const blocklistPath = this.getBlocklistPath();
    const specPath = this.getSpecificationPath();

    // Create default config if missing
    if (!(await this.fileExists(configPath))) {
      const defaultConfig: KnowledgeBaseConfig = {
        version: '1.0.0',
        repositories: [],
        sync: {
          enabled: true,
          intervalMinutes: 30,
          autoDiscoverUserRepos: true,
          includeOfficialMCPRepos: true,
          includeCommunityRepos: true,
        },
        storage: {
          cacheDir: this.baseDir,
          maxIndexSizeMB: 1000,
        },
        blocklist: {
          enabled: true,
          strict: true,
        },
      };
      await this.saveConfig(defaultConfig);
    }

    // Create empty blocklist if missing
    if (!(await this.fileExists(blocklistPath))) {
      const defaultBlocklist: Blocklist = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        entries: [],
      };
      await this.saveBlocklist(defaultBlocklist);
    }

    // Create MCP spec file if missing
    if (!(await this.fileExists(specPath))) {
      const defaultSpec: MCPSpecification = {
        version: '2025-03-26',
        lastUpdated: new Date().toISOString(),
        capabilities: {
          tools: {
            description: 'Functions that can be called by the LLM',
            schema: {},
          },
          resources: {
            description: 'Data structures for context',
            schema: {},
          },
          prompts: {
            description: 'Templated message patterns',
            schema: {},
          },
        },
        transports: [
          {
            name: 'stdio',
            status: 'current',
            useCases: ['Local execution', 'Single-user tools'],
          },
          {
            name: 'http',
            status: 'current',
            useCases: ['Remote servers', 'Multi-user applications'],
          },
        ],
        lifecycle: {
          initialization: 'Three-way handshake: initialize request → response → initialized notification',
          shutdown: 'Graceful termination with cleanup',
        },
        bestPractices: [
          'Use Zod for runtime validation of inputs',
          'Return structured error objects with isError flag',
          'Log to stderr, never stdout (reserved for JSON-RPC)',
          'Implement retry logic with exponential backoff',
          'Validate all inputs before processing',
          'Use TypeScript for type safety',
        ],
        commonPatterns: [
          {
            name: 'Tool Implementation',
            description: 'Standard pattern for implementing MCP tools',
            example: 'See templates/tool-template.ts',
          },
          {
            name: 'Resource Exposure',
            description: 'Expose data via URI-based resources',
            example: 'See templates/resource-template.ts',
          },
        ],
      };
      await this.saveSpecification(defaultSpec);
    }
  }

  // Config methods
  getConfigPath(): string {
    return path.join(this.baseDir, 'config.json');
  }

  async loadConfig(): Promise<KnowledgeBaseConfig> {
    const data = await fs.readFile(this.getConfigPath(), 'utf-8');
    return KnowledgeBaseConfigSchema.parse(JSON.parse(data));
  }

  async saveConfig(config: KnowledgeBaseConfig): Promise<void> {
    await this.writeJSON(this.getConfigPath(), config);
  }

  // Blocklist methods
  getBlocklistPath(): string {
    return path.join(this.baseDir, 'data', 'blocklist.json');
  }

  async loadBlocklist(): Promise<Blocklist> {
    const data = await fs.readFile(this.getBlocklistPath(), 'utf-8');
    return BlocklistSchema.parse(JSON.parse(data));
  }

  async saveBlocklist(blocklist: Blocklist): Promise<void> {
    await this.writeJSON(this.getBlocklistPath(), blocklist);
  }

  async addBlocklistEntry(entry: Omit<BlocklistEntry, 'hash'>): Promise<void> {
    const blocklist = await this.loadBlocklist();

    // Calculate hash for verification
    const hash = this.calculateHash(entry);
    const fullEntry: BlocklistEntry = { ...entry, hash };

    // Append to blocklist (append-only log)
    blocklist.entries.push(fullEntry);
    blocklist.lastUpdated = new Date().toISOString();

    await this.saveBlocklist(blocklist);
  }

  async isBlocked(serverName?: string, pattern?: string): Promise<{ blocked: boolean; reason?: string }> {
    const blocklist = await this.loadBlocklist();

    // Check server blocklist
    if (serverName) {
      const entry = blocklist.entries.find(
        (e) => e.type === 'server' && e.serverName === serverName
      );
      if (entry) {
        return { blocked: true, reason: entry.reason };
      }
    }

    // Check file pattern exclusions
    if (pattern) {
      const entry = blocklist.entries.find(
        (e) => e.type === 'file_pattern' && e.pattern === pattern
      );
      if (entry) {
        return { blocked: true, reason: entry.reason };
      }
    }

    return { blocked: false };
  }

  // MCP Specification methods
  getSpecificationPath(): string {
    return path.join(this.baseDir, 'data', 'specification.json');
  }

  async loadSpecification(): Promise<MCPSpecification> {
    const data = await fs.readFile(this.getSpecificationPath(), 'utf-8');
    return MCPSpecificationSchema.parse(JSON.parse(data));
  }

  async saveSpecification(spec: MCPSpecification): Promise<void> {
    await this.writeJSON(this.getSpecificationPath(), spec);
  }

  // Utility methods
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async writeJSON(filePath: string, data: any): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private calculateHash(data: any): string {
    const canonical = JSON.stringify(data, Object.keys(data).sort());
    return `sha256:${crypto.createHash('sha256').update(canonical).digest('hex')}`;
  }

  getRepoPath(owner: string, repo: string): string {
    return path.join(this.baseDir, 'repos', owner, repo);
  }

  async ensureRepoDir(owner: string, repo: string): Promise<string> {
    const repoPath = this.getRepoPath(owner, repo);
    await fs.mkdir(repoPath, { recursive: true });
    return repoPath;
  }
}
