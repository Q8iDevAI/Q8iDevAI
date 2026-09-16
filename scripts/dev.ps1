$ErrorActionPreference = "Stop"

# Ensure node_modules/.bin is in PATH
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:PATH = "$ScriptDir\..\node_modules\.bin;$env:PATH"

# Derive Q8IDEVAI_HOME: stable name for worktrees, temporary dir otherwise
if (-not $env:Q8IDEVAI_HOME) {
    $GitDir = git rev-parse --git-dir 2>$null
    $GitCommonDir = git rev-parse --git-common-dir 2>$null

    if ($GitDir -and $GitCommonDir -and ($GitDir -ne $GitCommonDir)) {
        # Inside a worktree — derive a stable home from the worktree name
        $WorktreeRoot = git rev-parse --show-toplevel
        $WorktreeName = (Split-Path -Leaf $WorktreeRoot).ToLower() -replace '[^a-z0-9-]', '-' -replace '-+', '-' -replace '^-|-$', ''
        $env:Q8IDEVAI_HOME = "$env:USERPROFILE\.q8idevai-$WorktreeName"
        New-Item -ItemType Directory -Force -Path $env:Q8IDEVAI_HOME | Out-Null
    } else {
        $env:Q8IDEVAI_HOME = Join-Path ([System.IO.Path]::GetTempPath()) "q8idevai-dev-$([System.Guid]::NewGuid().ToString('N').Substring(0,6))"
        New-Item -ItemType Directory -Force -Path $env:Q8IDEVAI_HOME | Out-Null
        # Register cleanup on exit
        $TempQ8iDevAIHome = $env:Q8IDEVAI_HOME
        Register-EngineEvent PowerShell.Exiting -Action {
            Remove-Item -Recurse -Force $TempQ8iDevAIHome -ErrorAction SilentlyContinue
        } | Out-Null
    }
}

# Share speech models with the main install to avoid duplicate downloads
if (-not $env:Q8IDEVAI_LOCAL_MODELS_DIR) {
    $env:Q8IDEVAI_LOCAL_MODELS_DIR = "$env:USERPROFILE\.q8idevai\models\local-speech"
    New-Item -ItemType Directory -Force -Path $env:Q8IDEVAI_LOCAL_MODELS_DIR | Out-Null
}

Write-Host @"
======================================================
  Q8iDevAI Dev (Windows)
======================================================
  Home:    $($env:Q8IDEVAI_HOME)
  Models:  $($env:Q8IDEVAI_LOCAL_MODELS_DIR)
  Daemon:  localhost:6768
======================================================
"@

# Allow any origin in dev so Electron on random ports all work.
# SECURITY: wildcard CORS is unsafe in production — only acceptable here because
# the daemon binds to localhost and this script is never used for production.
$env:Q8IDEVAI_CORS_ORIGINS = "*"

# Configure the app to auto-connect to this daemon on localhost
$env:APP_VARIANT = "development"
$env:EXPO_PUBLIC_LOCAL_DAEMON = "localhost:6768"
$env:EXPO_PUBLIC_Q8IDEVAI_DEV_BUILD_LABEL = (git branch --show-current).Trim()
$env:Q8IDEVAI_LISTEN = "127.0.0.1:6768"
$env:BROWSER = "none"

# Run both with concurrently
concurrently `
    --names "daemon,metro" `
    --prefix-colors "cyan,magenta" `
    "npm run dev:server:watch" `
    "cd packages/app && npx expo start"
