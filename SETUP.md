# Setup Guide - Claude MCP Knowledge Base

Complete step-by-step guide to get the MCP Knowledge Base running.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GitHub Authentication](#github-authentication)
3. [Local Installation](#local-installation)
4. [Claude Code Integration](#claude-code-integration)
5. [Configuration](#configuration)
6. [Publishing to GitHub](#publishing-to-github)
7. [Publishing to npm](#publishing-to-npm)
8. [Verification](#verification)

---

## Prerequisites

### Required

- **Node.js** ≥18.0.0
  ```bash
  node --version  # Should show v18.x.x or higher
  ```

- **GitHub Account** with Personal Access Token

### Optional

- **Claude Code** (for integration)
- **npm Account** (for publishing)

---

## GitHub Authentication

### Option 1: Environment Variable (Recommended for Development)

```bash
# Create GitHub Personal Access Token at https://github.com/settings/tokens
# Required scopes: repo, read:user

export GITHUB_TOKEN="ghp_your_token_here"
```

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
echo 'export GITHUB_TOKEN="ghp_your_token_here"' >> ~/.zshrc
source ~/.zshrc
```

### Option 2: Claude Code Credentials (Auto-Detected)

If you've authenticated with Claude Code's GitHub integration, the token will be auto-detected from:

```
~/.claude/.credentials.json
```

No additional setup needed.

### Verify Authentication

```bash
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

Should return your GitHub user info.

---

## Local Installation

### From Source (Development)

```bash
# Clone the repository
git clone https://github.com/grandinharrison/claude-mcp-kb.git
cd claude-mcp-kb

# Install dependencies
npm install

# Build
npm run build

# Run locally
node dist/index.js
```

### From npm (Production)

```bash
# Global install
npm install -g @grandinharrison/claude-mcp-kb

# Or use npx (no install)
npx @grandinharrison/claude-mcp-kb
```

---

## Claude Code Integration

### Method 1: Using Claude Code Settings

Create or edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "node",
      "args": ["/Users/grandinharrison/claude-mcp-kb/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

**Or for npx version:**

```json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "npx",
      "args": ["-y", "@grandinharrison/claude-mcp-kb"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

### Method 2: Project-Scoped Configuration

Create `.claude/settings.json` in your project root:

```json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "npx",
      "args": ["-y", "@grandinharrison/claude-mcp-kb"]
    }
  }
}
```

**Note**: For project-scoped config, use environment variable for `GITHUB_TOKEN` (don't commit tokens!).

### Method 3: Using CLI (Future)

```bash
claude mcp add --transport stdio knowledge-base -- npx @grandinharrison/claude-mcp-kb
```

---

## Configuration

### First Run Initialization

On first run, the server will create:

```
~/.claude-kb/
├── config.json              # Main configuration
├── data/
│   ├── specification.json   # MCP spec cache
│   └── blocklist.json       # Blocklist entries
├── repos/                   # Cached repository content
└── templates/               # MCP templates (future)
```

### Edit Configuration

Open `~/.claude-kb/config.json`:

```json
{
  "version": "1.0.0",
  "repositories": [
    {
      "owner": "your-username",
      "repo": "your-repo",
      "branch": "main",
      "includePatterns": [".claude/**/*.md", "**/*.mcp.json"],
      "excludePatterns": ["**/node_modules/**", "**/.git/**"],
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

### Key Settings

- **sync.intervalMinutes**: 5-1440 (how often to sync from GitHub)
- **sync.autoDiscoverUserRepos**: Auto-find your repos with `.claude/` directories
- **sync.includeOfficialMCPRepos**: Index official MCP documentation
- **blocklist.strict**: Block without user confirmation

---

## Publishing to GitHub

### Create Repository

```bash
# On GitHub, create new repository: claude-mcp-kb

# Add remote
git remote add origin https://github.com/grandinharrison/claude-mcp-kb.git

# Commit and push
git add .
git commit -m "Initial commit: MCP Knowledge Base v0.1.0

- Persistent MCP knowledge base with GitHub sync
- Removal blocklist for servers and file patterns
- Periodic sync (every 30 minutes, configurable)
- Zero-research MCP creation

🤖 Generated with Claude Code (https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git branch -M main
git push -u origin main
```

### Create Releases

```bash
# Tag version
git tag -a v0.1.0 -m "Release v0.1.0: Initial MVP

Features:
- Keyword-based search across MCP documentation
- GitHub integration with auto-discovery
- Blocklist for servers and file patterns
- Periodic sync (30 min default)
- Official MCP repos indexing"

git push origin v0.1.0
```

---

## Publishing to npm

### Prerequisites

1. **npm Account**: Sign up at https://www.npmjs.com/signup
2. **Login to npm**:

```bash
npm login
```

### Publish Package

```bash
# Verify package contents
npm pack --dry-run

# Publish
npm publish --access public
```

### Update Existing Package

```bash
# Update version
npm version patch   # 0.1.0 → 0.1.1
# or
npm version minor   # 0.1.0 → 0.2.0
# or
npm version major   # 0.1.0 → 1.0.0

# Publish
npm publish
```

---

## Verification

### Test Server Startup

```bash
# Run server (should show startup logs)
node dist/index.js
```

Expected output:

```
Initializing knowledge base storage...
GitHub authentication successful
Performing initial knowledge base sync...
Auto-discovering user repositories...
Found 3 user repositories with .claude/ directories
Fetching files from grandinharrison/claude-mcp-kb...
Found 5 matching files
Indexed 5 documents. Total: 5
Fetching official MCP repositories...
...
Claude MCP Knowledge Base server running on stdio
Storage: /Users/grandinharrison/.claude-kb/config.json
Indexed: 127 documents from 6 repositories
Periodic sync enabled: every 30 minutes
```

### Test with Claude Code

1. Restart Claude Code
2. Check MCP servers are loaded:

```bash
# In Claude Code conversation
/mcp list
```

Should show:
```
knowledge-base (active)
```

3. Test search:

```
Search for "how to implement MCP tool with Zod validation"
```

Should return results from indexed documentation.

### Test Tools Directly

Create `test-mcp.json`:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_knowledge_base",
    "arguments": {
      "query": "MCP tool implementation pattern",
      "maxResults": 5
    }
  }
}
```

Run:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node dist/index.js
```

---

## Troubleshooting

### Issue: "GitHub token not found"

**Solution**:
```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

Or add to `.claude/settings.json` env.

### Issue: "Error fetching repo: 404"

**Solution**:
- Check repository exists
- Verify token has `repo` scope
- Check network connectivity

### Issue: "No documents indexed"

**Solution**:
1. Check `~/.claude-kb/config.json` - ensure `autoDiscoverUserRepos: true`
2. Verify you have repos with `.claude/` directories
3. Manually trigger sync:

```json
{
  "method": "tools/call",
  "params": {
    "name": "update_knowledge_base",
    "arguments": { "force": true }
  }
}
```

### Issue: "Permission denied" errors

**Solution**:
```bash
chmod +x dist/index.js
```

### Issue: Slow sync times

**Cause**: GitHub API rate limiting or large repos

**Solution**:
- Increase `sync.intervalMinutes` to reduce frequency
- Exclude large files via `excludePatterns`
- Use authenticated requests (provides 5000 req/hour vs 60)

---

## Next Steps

1. **Customize Configuration**: Edit `~/.claude-kb/config.json`
2. **Add Blocklist Entries**: Block sensitive files/servers
3. **Test Search**: Use Claude Code to search MCP docs
4. **Monitor Sync**: Check logs during periodic updates
5. **Share with Team**: Publish to npm for easy installation

---

## Support

- **Issues**: https://github.com/grandinharrison/claude-mcp-kb/issues
- **Documentation**: https://github.com/grandinharrison/claude-mcp-kb
- **MCP Spec**: https://modelcontextprotocol.io

---

**Happy MCP development!** 🚀
