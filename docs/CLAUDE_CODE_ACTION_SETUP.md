# Claude Code Action - Reusable Workflow Setup

This repository contains a **reusable workflow** that enables Claude Code automation across all your GitHub repositories.

## Architecture

```
claude-mcp-kb (this repo)
├── .github/workflows/
│   ├── claude-reusable.yml  ← Master workflow (maintain once)
│   └── claude.yml            ← Caller (uses reusable workflow)

mcp-prompt-optimizer
├── .github/workflows/
│   └── claude.yml            ← Caller (uses reusable workflow)

mcp-server-ori
├── .github/workflows/
│   └── claude.yml            ← Caller (uses reusable workflow)
```

## How It Works

1. **Reusable Workflow** (`claude-reusable.yml`) contains the full Claude Code Action logic
2. **Caller Workflows** (`claude.yml` in each repo) reference the reusable workflow
3. **Secrets** are passed from each repository to the reusable workflow
4. **Updates** to Claude Code Action only need to be made in one place

## Setup Instructions

### Step 1: Install Claude GitHub App

You need to install the Claude GitHub App on your repositories:

1. Go to https://github.com/apps/claude
2. Click **"Install"**
3. Select **all repositories** or choose:
   - `grandinh/claude-mcp-kb`
   - `grandinh/mcp-prompt-optimizer`
   - `grandinh/mcp-server-ori`
4. Click **"Install"**

### Step 2: Add Anthropic API Key to Repository Secrets

You need to add your Anthropic API key to **each repository** that will use Claude Code:

#### For All Repositories:

1. **Get your Anthropic API key:**
   - Go to https://console.anthropic.com/settings/keys
   - Copy your API key

2. **Add to each repository:**

   **For claude-mcp-kb:**
   - Go to https://github.com/grandinh/claude-mcp-kb/settings/secrets/actions
   - Click **"New repository secret"**
   - Name: `ANTHROPIC_API_KEY`
   - Value: `your-api-key-here`
   - Click **"Add secret"**

   **For mcp-prompt-optimizer:**
   - Go to https://github.com/grandinh/mcp-prompt-optimizer/settings/secrets/actions
   - Repeat the same steps

   **For mcp-server-ori:**
   - Go to https://github.com/grandinh/mcp-server-ori/settings/secrets/actions
   - Repeat the same steps

#### Alternative: Organization Secret (if you have a GitHub Organization)

If your repositories are under a GitHub Organization, you can add the secret once at the organization level:

1. Go to your organization settings
2. Navigate to **Secrets and variables** → **Actions**
3. Click **"New organization secret"**
4. Name: `ANTHROPIC_API_KEY`
5. Value: `your-api-key-here`
6. Select **"All repositories"** or choose specific ones

### Step 3: Commit and Push Workflow Files

The workflow files have already been created. Now push them to GitHub:

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

### Step 4: Verify Setup

1. Go to the **Actions** tab in each repository
2. You should see the "Claude Code" workflow listed
3. It won't run yet because there are no events to trigger it

## Usage

Once set up, Claude will respond to the `@claude` mention in:

- **Issues** - Comment with `@claude <your request>`
- **Pull Requests** - Comment with `@claude <your request>`
- **PR Reviews** - Include `@claude` in your review

### Examples

**On an Issue:**
```
@claude can you add tests for the new authentication module?
```

**On a Pull Request:**
```
@claude please review this PR and suggest improvements
```

**Creating an Issue:**
```
Title: Add JWT authentication
Body: @claude implement JWT authentication for the API

This will trigger Claude to start working immediately
```

## Customization

### Change Trigger Phrase

Edit any `claude.yml` caller workflow:

```yaml
jobs:
  claude:
    uses: grandinh/claude-mcp-kb/.github/workflows/claude-reusable.yml@main
    secrets:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    with:
      trigger_phrase: "/claude"  # Change from @claude to /claude
```

### Configure Claude Behavior

```yaml
jobs:
  claude:
    uses: grandinh/claude-mcp-kb/.github/workflows/claude-reusable.yml@main
    secrets:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    with:
      claude_args: |
        --model claude-opus-4-1-20250805
        --max-turns 10
        --allowedTools "Bash(npm install),Bash(npm run build),Bash(npm run test:*)"
        --system-prompt "Follow our coding standards. Ensure all new code has tests."
```

### Per-Repository Customization

Each repository can have different settings. For example:

**mcp-prompt-optimizer** (stricter rules):
```yaml
with:
  claude_args: |
    --max-turns 5
    --system-prompt "This is a TypeScript project. All code must have types and tests."
```

**mcp-server-ori** (more freedom):
```yaml
with:
  claude_args: |
    --max-turns 20
    --system-prompt "Experimental MCP server. Focus on innovation."
```

## Updating the Workflow

When you need to update Claude Code Action behavior:

1. **Edit only** `claude-mcp-kb/.github/workflows/claude-reusable.yml`
2. Commit and push
3. All repositories automatically use the updated workflow

No need to touch the caller workflows in other repos!

## Troubleshooting

### "Workflow not found" Error

**Cause:** The reusable workflow file doesn't exist or isn't on the `main` branch.

**Fix:**
```bash
cd ~/claude-mcp-kb
git checkout main
git push origin main
```

### "Secret not found" Error

**Cause:** `ANTHROPIC_API_KEY` secret is missing.

**Fix:** Add the secret to repository settings (see Step 2 above).

### Claude Doesn't Respond

**Possible causes:**
1. Claude GitHub App not installed
2. Trigger phrase not detected (`@claude` must be in the comment)
3. Workflow files not pushed to GitHub
4. API key is invalid

**Debug:**
1. Check the **Actions** tab for workflow runs
2. Look for error messages in the logs
3. Verify the Claude app is installed: https://github.com/settings/installations

### Permissions Denied

**Cause:** The workflow doesn't have write permissions.

**Fix:** Ensure these permissions are in the reusable workflow (already set):
```yaml
permissions:
  contents: write
  pull-requests: write
  issues: write
  id-token: write
  actions: read
```

## Security Best Practices

✅ **Do:**
- Store API keys in GitHub Secrets (never in code)
- Use repository secrets for per-repo keys
- Use organization secrets for shared keys
- Rotate keys regularly
- Limit workflow permissions to minimum required

❌ **Don't:**
- Commit API keys to git
- Share secrets in issues or PRs
- Use personal API keys in public repos
- Log secrets in workflow outputs

## Advanced: Custom GitHub App

Instead of using the Claude GitHub App + API key, you can create your own GitHub App:

1. Follow instructions at https://github.com/anthropics/claude-code-action/blob/main/docs/setup.md
2. Download `create-app.html` and create your app
3. Add `APP_ID` and `APP_PRIVATE_KEY` secrets
4. Update the reusable workflow to use `actions/create-github-app-token@v1`

This gives you more control over permissions and app identity.

## Files Created

```
claude-mcp-kb/
├── .github/workflows/
│   ├── claude-reusable.yml         # Master workflow (125 lines)
│   ├── claude.yml                   # Caller workflow (20 lines)
│   └── CLAUDE_CODE_ACTION_SETUP.md  # This file

mcp-prompt-optimizer/
└── .github/workflows/
    └── claude.yml                   # Caller workflow (20 lines)

mcp-server-ori/
└── .github/workflows/
    └── claude.yml                   # Caller workflow (20 lines)
```

## Support

- **Claude Code Action Docs:** https://github.com/anthropics/claude-code-action
- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Anthropic Console:** https://console.anthropic.com

## Next Steps

1. ✅ Complete Step 1-3 above
2. Test by creating an issue with `@claude` mention
3. Customize trigger phrase or Claude behavior as needed
4. Add to more repositories by copying the caller workflow pattern

---

**Maintained by:** claude-mcp-kb reusable workflow system
**Last Updated:** 2025-11-08
**Version:** 1.0.0
