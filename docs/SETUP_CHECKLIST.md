# Claude Code Action - Setup Checklist

Quick checklist to get Claude Code Action running across all your repos.

## ☐ Step 1: Install Claude GitHub App

- [ ] Go to https://github.com/apps/claude
- [ ] Click "Install"
- [ ] Select repositories:
  - [ ] grandinh/claude-mcp-kb
  - [ ] grandinh/mcp-prompt-optimizer
  - [ ] grandinh/mcp-server-ori
- [ ] Click "Install"

## ☐ Step 2: Add API Key to Secrets

Get your API key: https://console.anthropic.com/settings/keys

Add to each repository's secrets:

- [ ] **claude-mcp-kb**: https://github.com/grandinh/claude-mcp-kb/settings/secrets/actions
  - Name: `ANTHROPIC_API_KEY`
  - Value: `<your-api-key>`

- [ ] **mcp-prompt-optimizer**: https://github.com/grandinh/mcp-prompt-optimizer/settings/secrets/actions
  - Name: `ANTHROPIC_API_KEY`
  - Value: `<your-api-key>`

- [ ] **mcp-server-ori**: https://github.com/grandinh/mcp-server-ori/settings/secrets/actions
  - Name: `ANTHROPIC_API_KEY`
  - Value: `<your-api-key>`

## ☐ Step 3: Push Workflow Files

Run these commands:

```bash
# Push claude-mcp-kb
cd ~/claude-mcp-kb
git add .github/workflows/
git commit -m "Add Claude Code Action workflows"
git push

# Push mcp-prompt-optimizer
cd ~/mcp-prompt-optimizer
git add .github/workflows/
git commit -m "Add Claude Code Action workflow"
git push

# Push mcp-server-ori
cd ~/mcp-server-ori
git add .github/workflows/
git commit -m "Add Claude Code Action workflow"
git push
```

- [ ] Pushed to claude-mcp-kb
- [ ] Pushed to mcp-prompt-optimizer
- [ ] Pushed to mcp-server-ori

## ☐ Step 4: Test

Create a test issue in any repo:

- [ ] Create issue with title: "Test Claude"
- [ ] Add `@claude hello` in the description
- [ ] Wait for Claude to respond
- [ ] Verify Claude creates a comment

## Done! 🎉

Claude Code Action is now active on all 3 repositories!

### Usage

Just mention `@claude` in:
- Issue comments
- PR comments
- PR reviews
- New issues

Example: `@claude can you add tests for this feature?`
