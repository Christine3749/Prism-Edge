const { net, protocol } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function registerPrivilegedScheme(scheme) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ]);
}

function handleAppProtocol({ scheme, getDistDir }) {
  protocol.handle(scheme, async (request) => {
    const distDir = getDistDir();
    const requestUrl = new URL(request.url);
    const pathname = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
    const filePath = path.normalize(path.join(distDir, pathname));

    if (!isSafeFilePath(distDir, filePath) || !fs.existsSync(filePath)) {
      return new Response("Not found", { status: 404 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function isSafeFilePath(baseDir, targetPath) {
  const relativePath = path.relative(baseDir, targetPath);
  return Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

module.exports = { handleAppProtocol, registerPrivilegedScheme };