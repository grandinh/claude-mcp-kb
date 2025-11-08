import { z } from 'zod';

/**
 * MCP Specification Knowledge Base Schema
 * Stores the current MCP protocol specification and related metadata
 */
export const MCPSpecificationSchema = z.object({
  version: z.string().describe('MCP protocol version (e.g., "2025-03-26")'),
  lastUpdated: z.string().datetime().describe('ISO 8601 timestamp of last update'),
  capabilities: z.object({
    tools: z.object({
      description: z.string(),
      schema: z.record(z.any()),
    }).optional(),
    resources: z.object({
      description: z.string(),
      schema: z.record(z.any()),
    }).optional(),
    prompts: z.object({
      description: z.string(),
      schema: z.record(z.any()),
    }).optional(),
  }),
  transports: z.array(z.object({
    name: z.string(),
    status: z.enum(['current', 'deprecated', 'experimental']),
    useCases: z.array(z.string()),
  })),
  lifecycle: z.object({
    initialization: z.string().describe('Handshake protocol description'),
    shutdown: z.string().describe('Graceful termination description'),
  }),
  bestPractices: z.array(z.string()).describe('Curated list of MCP best practices'),
  commonPatterns: z.array(z.object({
    name: z.string(),
    description: z.string(),
    example: z.string(),
  })),
});

export type MCPSpecification = z.infer<typeof MCPSpecificationSchema>;

/**
 * Blocklist Entry Schema
 * Tracks removed MCP servers and excluded file patterns
 */
export const BlocklistEntrySchema = z.object({
  timestamp: z.string().datetime(),
  type: z.enum(['server', 'file_pattern']),

  // For server blocklist
  serverName: z.string().optional().describe('MCP server name (e.g., "@org/mcp-server")'),
  version: z.string().optional().describe('Specific version blocked'),

  // For file pattern exclusion
  pattern: z.string().optional().describe('Glob pattern to exclude (e.g., "**/*.secret.md")'),

  reason: z.string().describe('Why this was blocked/excluded'),
  hash: z.string().describe('SHA-256 hash for verification'),
  allowOverride: z.boolean().default(false).describe('Can user explicitly re-enable?'),
  source: z.enum(['user', 'system', 'community']).default('user'),
});

export type BlocklistEntry = z.infer<typeof BlocklistEntrySchema>;

/**
 * Blocklist Schema
 */
export const BlocklistSchema = z.object({
  version: z.string().default('1.0.0'),
  lastUpdated: z.string().datetime(),
  entries: z.array(BlocklistEntrySchema),
});

export type Blocklist = z.infer<typeof BlocklistSchema>;

/**
 * Knowledge Base Configuration Schema
 */
export const KnowledgeBaseConfigSchema = z.object({
  version: z.string().default('1.0.0'),

  repositories: z.array(z.object({
    owner: z.string(),
    repo: z.string(),
    branch: z.string().default('main'),
    includePatterns: z.array(z.string()).default(['.claude/**/*.md', '**/*.mcp.json']),
    excludePatterns: z.array(z.string()).default(['**/node_modules/**', '**/.git/**']),
    indexingEnabled: z.boolean().default(true),
    type: z.enum(['user', 'official', 'community']).default('user'),
  })),

  sync: z.object({
    enabled: z.boolean().default(true),
    intervalMinutes: z.number().min(5).max(1440).default(30),
    autoDiscoverUserRepos: z.boolean().default(true),
    includeOfficialMCPRepos: z.boolean().default(true),
    includeCommunityRepos: z.boolean().default(true),
  }),

  storage: z.object({
    cacheDir: z.string().default('~/.claude-kb'),
    maxIndexSizeMB: z.number().default(1000),
  }),

  blocklist: z.object({
    enabled: z.boolean().default(true),
    strict: z.boolean().default(true).describe('Block without prompting user'),
  }),
});

export type KnowledgeBaseConfig = z.infer<typeof KnowledgeBaseConfigSchema>;

/**
 * Indexed Document Schema
 */
export const IndexedDocumentSchema = z.object({
  id: z.string().describe('Unique document identifier'),
  repoOwner: z.string(),
  repoName: z.string(),
  branch: z.string(),
  filePath: z.string(),
  content: z.string(),
  metadata: z.object({
    fileType: z.string(),
    lastModified: z.string().datetime(),
    size: z.number(),
    hash: z.string().describe('SHA-256 of content'),
  }),
  indexed: z.string().datetime(),
});

export type IndexedDocument = z.infer<typeof IndexedDocumentSchema>;

/**
 * Search Result Schema
 */
export const SearchResultSchema = z.object({
  document: IndexedDocumentSchema,
  score: z.number().min(0).max(1).describe('Relevance score'),
  snippet: z.string().describe('Highlighted text snippet'),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;
