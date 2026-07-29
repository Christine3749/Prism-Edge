const { Menu } = require("electron");

function createAppMenu(windowManager) {
  return Menu.buildFromTemplate([
    {
      label: "Prism-Edge",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          click: () => windowManager.createWindow(),
        },
        {
          label: "New Window on Next Display",
          accelerator: "CmdOrCtrl+Shift+N",
          click: () => windowManager.createWindowOnNextDisplay(),
        },
        { type: "separator" },
        {
          label: "Save Workspace Now",
          accelerator: "CmdOrCtrl+S",
          click: () => windowManager.persistWindows(),
        },
        { type: "separator" },
        { role: "close" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { role: "front" },
      ],
    },
  ]);
}

module.exports = { createAppMenu };
