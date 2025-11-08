#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { KnowledgeBaseStorage } from './knowledge-base/storage.js';
import { GitHubSync } from './knowledge-base/github-sync.js';
import { SearchEngine } from './knowledge-base/search.js';

/**
 * Claude MCP Knowledge Base Server
 * Provides persistent MCP knowledge and GitHub integration
 */

const storage = new KnowledgeBaseStorage();
const searchEngine = new SearchEngine();
let githubSync: GitHubSync | null = null;
let syncInterval: NodeJS.Timeout | null = null;

// Tool schemas
const SearchKnowledgeBaseSchema = z.object({
  query: z.string().describe('Search query for MCP documentation'),
  maxResults: z.number().min(1).max(50).default(10).describe('Maximum number of results to return'),
});

const ListRepositoriesSchema = z.object({});

const GetMCPSpecSchema = z.object({});

const AddBlocklistEntrySchema = z.object({
  type: z.enum(['server', 'file_pattern']).describe('Type of blocklist entry'),
  serverName: z.string().optional().describe('MCP server name (for server type)'),
  pattern: z.string().optional().describe('Glob pattern (for file_pattern type)'),
  reason: z.string().describe('Reason for blocking/excluding'),
});

const CheckBlocklistSchema = z.object({
  serverName: z.string().optional().describe('Server name to check'),
  pattern: z.string().optional().describe('File pattern to check'),
});

const UpdateKnowledgeBaseSchema = z.object({
  force: z.boolean().default(false).describe('Force update even if recently synced'),
});

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'search_knowledge_base',
    description:
      'Search the MCP knowledge base for documentation, examples, and best practices. Searches across official MCP repos, community servers, and your repositories with .claude/ directories.',
    inputSchema: zodToJsonSchema(SearchKnowledgeBaseSchema) as any,
  },
  {
    name: 'list_repositories',
    description:
      'List all repositories currently indexed in the knowledge base with file counts.',
    inputSchema: zodToJsonSchema(ListRepositoriesSchema) as any,
  },
  {
    name: 'get_mcp_specification',
    description:
      'Get the current MCP protocol specification, best practices, and common patterns. Always up-to-date knowledge about MCP development.',
    inputSchema: zodToJsonSchema(GetMCPSpecSchema) as any,
  },
  {
    name: 'add_blocklist_entry',
    description:
      'Add an entry to the blocklist. Can block MCP servers or exclude file patterns from indexing.',
    inputSchema: zodToJsonSchema(AddBlocklistEntrySchema) as any,
  },
  {
    name: 'check_blocklist',
    description: 'Check if a server or file pattern is blocked.',
    inputSchema: zodToJsonSchema(CheckBlocklistSchema) as any,
  },
  {
    name: 'update_knowledge_base',
    description:
      'Manually trigger a knowledge base update from GitHub. Normally happens automatically every 30 minutes.',
    inputSchema: zodToJsonSchema(UpdateKnowledgeBaseSchema) as any,
  },
];

// Create MCP server
const server = new Server(
  {
    name: 'claude-mcp-kb',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle call tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case 'search_knowledge_base': {
        const args = SearchKnowledgeBaseSchema.parse(request.params.arguments);
        const results = searchEngine.search(args.query, args.maxResults);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  query: args.query,
                  resultsCount: results.length,
                  results: results.map((r) => ({
                    repository: `${r.document.repoOwner}/${r.document.repoName}`,
                    file: r.document.filePath,
                    score: r.score,
                    snippet: r.snippet,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'list_repositories': {
        const repos = searchEngine.listRepositories();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalRepositories: repos.length,
                  repositories: repos,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_mcp_specification': {
        const spec = await storage.loadSpecification();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(spec, null, 2),
            },
          ],
        };
      }

      case 'add_blocklist_entry': {
        const args = AddBlocklistEntrySchema.parse(request.params.arguments);

        await storage.addBlocklistEntry({
          timestamp: new Date().toISOString(),
          type: args.type,
          serverName: args.serverName,
          pattern: args.pattern,
          reason: args.reason,
          allowOverride: false,
          source: 'user',
        });

        return {
          content: [
            {
              type: 'text',
              text: `Added ${args.type} blocklist entry: ${args.serverName || args.pattern}`,
            },
          ],
        };
      }

      case 'check_blocklist': {
        const args = CheckBlocklistSchema.parse(request.params.arguments);
        const result = await storage.isBlocked(args.serverName, args.pattern);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_knowledge_base': {
        const args = UpdateKnowledgeBaseSchema.parse(request.params.arguments);

        if (!githubSync) {
          return {
            content: [
              {
                type: 'text',
                text: 'GitHub sync not configured. Set GITHUB_TOKEN environment variable.',
              },
            ],
            isError: true,
          };
        }

        console.error('Updating knowledge base...');
        await syncKnowledgeBase(args.force);

        const stats = searchEngine.getStats();

        return {
          content: [
            {
              type: 'text',
              text: `Knowledge base updated. ${stats.totalDocuments} documents indexed from ${stats.repositories.size} repositories.`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Sync knowledge base from GitHub
 */
async function syncKnowledgeBase(force: boolean = false): Promise<void> {
  if (!githubSync) {
    console.error('GitHub sync not available');
    return;
  }

  const config = await storage.loadConfig();

  // Clear existing index if forcing update
  if (force) {
    searchEngine.clear();
  }

  // Fetch from user repos (if auto-discover enabled)
  if (config.sync.autoDiscoverUserRepos) {
    console.error('Auto-discovering user repositories...');
    const userRepos = await githubSync.discoverUserRepos();
    console.error(`Found ${userRepos.length} user repositories with .claude/ directories`);

    for (const repo of userRepos) {
      const docs = await githubSync.fetchFilesFromRepo(
        repo.owner,
        repo.repo,
        'main',
        ['.claude/**/*.md', '**/*.mcp.json']
      );
      searchEngine.addDocuments(docs);
    }
  }

  // Fetch from official MCP repos
  if (config.sync.includeOfficialMCPRepos) {
    console.error('Fetching official MCP repositories...');
    const officialRepos = githubSync.getOfficialMCPRepos();

    for (const repo of officialRepos) {
      const docs = await githubSync.fetchFilesFromRepo(
        repo.owner,
        repo.repo,
        'main',
        ['**/*.md', '**/package.json']
      );
      searchEngine.addDocuments(docs);
    }
  }

  // Fetch from community repos
  if (config.sync.includeCommunityRepos) {
    console.error('Fetching community MCP repositories...');
    const communityRepos = await githubSync.getCommunityMCPRepos();

    for (const repo of communityRepos) {
      const docs = await githubSync.fetchFilesFromRepo(
        repo.owner,
        repo.repo,
        'main',
        ['**/*.md']
      );
      searchEngine.addDocuments(docs);
    }
  }

  // Fetch explicitly configured repos
  for (const repo of config.repositories) {
    if (!repo.indexingEnabled) continue;

    const docs = await githubSync.fetchFilesFromRepo(
      repo.owner,
      repo.repo,
      repo.branch,
      repo.includePatterns,
      repo.excludePatterns
    );
    searchEngine.addDocuments(docs);
  }

  console.error('Knowledge base sync complete');
}

/**
 * Setup periodic sync
 */
function setupPeriodicSync(intervalMinutes: number): void {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  const intervalMs = intervalMinutes * 60 * 1000;

  syncInterval = setInterval(async () => {
    console.error('Periodic knowledge base update...');
    try {
      await syncKnowledgeBase(false);
    } catch (error) {
      console.error('Error during periodic sync:', error);
    }
  }, intervalMs);

  console.error(`Periodic sync enabled: every ${intervalMinutes} minutes`);
}

/**
 * Main server startup
 */
async function main() {
  try {
    // Initialize storage
    console.error('Initializing knowledge base storage...');
    await storage.initialize();

    // Initialize GitHub sync
    try {
      const token = await GitHubSync.getToken();
      githubSync = new GitHubSync(token, storage);
      console.error('GitHub authentication successful');

      // Initial sync
      console.error('Performing initial knowledge base sync...');
      await syncKnowledgeBase(false);

      // Setup periodic sync
      const config = await storage.loadConfig();
      if (config.sync.enabled) {
        setupPeriodicSync(config.sync.intervalMinutes);
      }
    } catch (error) {
      console.error('GitHub sync disabled:', error instanceof Error ? error.message : error);
      console.error('Server will run with limited functionality (no GitHub integration)');
    }

    // Start MCP server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('Claude MCP Knowledge Base server running on stdio');
    console.error(`Storage: ${storage.getConfigPath()}`);

    const stats = searchEngine.getStats();
    console.error(
      `Indexed: ${stats.totalDocuments} documents from ${stats.repositories.size} repositories`
    );
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', () => {
  console.error('Shutting down...');
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down...');
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
