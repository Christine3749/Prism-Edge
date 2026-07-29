const fs = require("node:fs");
const path = require("node:path");

const WORKSPACE_FILE = "desktop-workspace.json";

function createWorkspaceStore(userDataDir) {
  const filePath = path.join(userDataDir, WORKSPACE_FILE);
  let workspace = readWorkspace(filePath);

  function save(next) {
    workspace = {
      windows: Array.isArray(next.windows) ? next.windows : workspace.windows,
      sync: typeof next.sync === "object" && next.sync ? next.sync : workspace.sync,
      savedAt: Date.now(),
    };
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(workspace, null, 2), "utf8");
  }

  return {
    getWindows: () => workspace.windows || [],
    setWindows: (windows) => save({ ...workspace, windows }),
    getSyncState: () => workspace.sync || {},
    setSyncState: (sync) => save({ ...workspace, sync }),
  };
}

function readWorkspace(filePath) {
  try {
    if (!fs.existsSync(filePath)) return defaultWorkspace();
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      windows: Array.isArray(parsed.windows) ? parsed.windows : [],
      sync: typeof parsed.sync === "object" && parsed.sync ? parsed.sync : {},
      savedAt: Number(parsed.savedAt) || 0,
    };
  } catch {
    return defaultWorkspace();
  }
}

function defaultWorkspace() {
  return { windows: [], sync: {}, savedAt: 0 };
}

module.exports = { createWorkspaceStore };
