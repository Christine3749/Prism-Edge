# Agent Operating Rules

## Long-Running Local Services Are Forbidden In Codex Shell

Do not start, restart, supervise, or health-check a long-running local service from the Codex shell.

This rule exists because Codex shell sessions can keep tracking child process trees after `Start-Process`, `node`, `vite`, or dev-server commands. The UI may then show `Running command` for hours even when the PowerShell script itself has returned.

### Forbidden Patterns

Treat any command containing these patterns as a blocked long-running service operation:

- `Start-Process node.exe`
- `node dist/server.cjs`
- `npm run dev`
- `npm start`
- `vite`
- `next dev`
- `Start-Sleep` combined with `Invoke-WebRequest /api/health`
- port service loops for `localhost:3111`, `4111`, `5111`, or any other local preview port
- scripts that write PID files and then keep a Node/Vite/server process alive

Changing the port does not make the command safe. The problem is the long-lived child process, not the port number.

### Allowed Short-Lived Commands

These are allowed because they exit naturally:

- `npm run lint`
- `npm run build`
- `git diff`
- `git status`
- `netstat -ano`
- one-shot `Invoke-WebRequest` health checks, if no service is started by the same command
- reading logs

### Local Preview Policy

If the user needs to view the app:

1. Prefer deploying to the hosted environment and let the user inspect the live URL.
2. If localhost is required, the user must start the service manually in their own terminal, or use an external service manager such as PM2, Windows Task Scheduler, or another non-Codex process supervisor.
3. Codex may inspect the existing service with short-lived commands, but must not start or restart it.

### If A Service Is Already Running

Codex may run short-lived diagnostics only:

- check which PID owns the port
- check `/api/health`
- inspect log files
- explain what should be restarted manually

Codex must not kill and restart the service unless the user explicitly asks for a one-off cleanup and understands it will not be relaunched by Codex.

