# Claude MCP Knowledge Base

**Eliminate repeated MCP research** - A persistent knowledge base server for Model Context Protocol (MCP) development with GitHub integration and removal blocklist.

## Features

- **Zero-Research MCP Creation**: Built-in knowledge of MCP specifications, best practices, and patterns
- **Always Up-to-Date**: Automatically syncs from official MCP repositories and community examples
- **GitHub Integration**: Indexes your `.claude/` directories across all repositories
- **Removal Blocklist**: Track deleted MCPs and exclude file patterns permanently
- **Periodic Sync**: Auto-updates knowledge base every 30 minutes (configurable)
- **Fast Search**: Keyword-based search across all indexed documentation

## Quick Start

### Prerequisites

- Node.js ≥18
- GitHub Personal Access Token (for indexing repos)

### Installation

```bash
npm install -g @grandinharrison/claude-mcp-kb
```

Or use with `npx`:

```bash
npx @grandinharrison/claude-mcp-kb
```

### Setup

1. **Set GitHub Token**:

```bash
export GITHUB_TOKEN="your_github_pat_here"
```

Or authenticate with Claude Code (token will be auto-detected from `~/.claude/.credentials.json`).

2. **Add to Claude Code**:

Add to your `.claude/settings.json`:

```json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "npx",
      "args": ["-y", "@grandinharrison/claude-mcp-kb"],
      "env": {
        "GITHUB_TOKEN": "your_token_here"
      }
    }
  }
}
```

Or use the CLI:

```bash
claude mcp add --transport stdio knowledge-base -- npx @grandinharrison/claude-mcp-kb
```

3. **First Run**:

The server will automatically:
- Create `~/.claude-kb/` directory
- Index official MCP repositories
- Discover your repos with `.claude/` directories
- Start periodic sync (every 30 minutes)

## Usage

### Available Tools

#### `search_knowledge_base`

Search MCP documentation, examples, and best practices.

```json
{
  "query": "how to implement MCP tool with error handling",
  "maxResults": 10
}
```

**Returns**: Ranked search results with snippets and source files.

#### `get_mcp_specification`

Get current MCP protocol spec, best practices, and common patterns.

```json
{}
```

**Returns**: Complete MCP specification with lifecycle, transports, capabilities.

#### `list_repositories`

List all indexed repositories with file counts.

```json
{}
```

**Returns**: Repository list with counts.

#### `add_blocklist_entry`

Add MCP server or file pattern to blocklist.

```json
{
  "type": "file_pattern",
  "pattern": "**/*.secret.md",
  "reason": "Contains sensitive information"
}
```

Or block a server:

```json
{
  "type": "server",
  "serverName": "@example/bad-mcp-server",
  "reason": "Security vulnerability"
}
```

#### `check_blocklist`

Check if something is blocked.

```json
{
  "serverName": "@example/my-server"
}
```

#### `update_knowledge_base`

Manually trigger sync (normally automatic).

```json
{
  "force": true
}
```

## Configuration

Edit `~/.claude-kb/config.json`:

```json
{
  "version": "1.0.0",
  "repositories": [
    {
      "owner": "your-org",
      "repo": "your-repo",
      "branch": "main",
      "includePatterns": [".claude/**/*.md"],
      "excludePatterns": ["**/node_modules/**"],
      "indexingEnabled": true,
      "type": "user"
    }
  ],
  "sync": {
    "enabled": true,
    "intervalMinutes": 30,
    "autoDiscoverUserRepos": true,
    "includeOfficialMCPRepos": true,
    "includeCommunityRepos": true
  },
  "storage": {
    "cacheDir": "~/.claude-kb",
    "maxIndexSizeMB": 1000
  },
  "blocklist": {
    "enabled": true,
    "strict": true
  }
}
```

### Configuration Options

- **repositories**: Explicitly configured repos to index
- **sync.intervalMinutes**: How often to sync (5-1440 minutes)
- **sync.autoDiscoverUserRepos**: Auto-find your repos with `.claude/` dirs
- **sync.includeOfficialMCPRepos**: Index modelcontextprotocol/* repos
- **sync.includeCommunityRepos**: Index awesome-mcp-servers lists
- **blocklist.strict**: Block without prompting user

## Blocklist

The blocklist is stored in `~/.claude-kb/data/blocklist.json` as an **append-only log**.

### Block a File Pattern

```json
{
  "type": "file_pattern",
  "pattern": "**/private/**",
  "reason": "Exclude private directories"
}
```

### Block an MCP Server

```json
{
  "type": "server",
  "serverName": "@malicious/mcp-server",
  "version": "1.0.0",
  "reason": "Security vulnerability CVE-2025-12345"
}
```

### Removal is Permanent

Once blocked, entries remain in the log forever (unless manually edited). To override:

1. Edit `~/.claude-kb/data/blocklist.json`
2. Set `allowOverride: true` on the entry
3. Restart server

## Storage Structure

```
~/.claude-kb/
├── config.json              # Configuration
├── data/
│   ├── specification.json   # MCP spec cache
│   └── blocklist.json       # Blocklist log
├── repos/                   # Cached repository content
│   ├── modelcontextprotocol/
│   │   └── servers/
│   └── your-username/
│       └── your-repo/
└── templates/               # MCP templates (future)
```

## Development

### Build from Source

```bash
git clone https://github.com/grandinharrison/claude-mcp-kb.git
cd claude-mcp-kb
npm install
npm run build
```

### Run in Dev Mode

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

## Roadmap

### Current (v0.1.0)

- ✅ Basic keyword search
- ✅ GitHub integration
- ✅ Periodic sync
- ✅ Blocklist (servers + file patterns)
- ✅ Official MCP repos indexing
- ✅ Auto-discover user repos

### Planned (v0.2.0)

- [ ] Vector search (txtai/FAISS integration)
- [ ] Semantic similarity scoring
- [ ] MCP server templates generation
- [ ] Real-time webhook sync
- [ ] Web UI for blocklist management

### Future

- [ ] Multi-cloud support (GitLab, Bitbucket)
- [ ] Team collaboration features
- [ ] Usage analytics
- [ ] Knowledge graph relationships

## Troubleshooting

### "GitHub token not found"

Set `GITHUB_TOKEN` environment variable or authenticate with Claude Code.

### "Error fetching repo"

Check:
1. Token has `repo` scope
2. Repository exists and you have access
3. Network connectivity

### Knowledge base not updating

1. Check `~/.claude-kb/config.json` - ensure `sync.enabled: true`
2. Manually trigger: `update_knowledge_base` tool
3. Check logs in stderr output

### Slow searches

Current MVP uses keyword search. Upgrade to vector search in v0.2.0 for faster semantic search.

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file

## Author

Harrison Grandin

## Acknowledgments

- Built on [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- Inspired by the MCP community
- Special thanks to Anthropic for Claude Code
