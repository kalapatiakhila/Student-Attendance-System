
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;

const mimeTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
    let requestedPath = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname
    );

    if (requestedPath === "/") {
        requestedPath = "/index.html";
    }

    const filePath = path.resolve(ROOT, "." + requestedPath);

    if (!filePath.startsWith(ROOT + path.sep)) {
        res.writeHead(403);
        return res.end("Forbidden");
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            return res.end("Page not found");
        }

        const contentType =
            mimeTypes[path.extname(filePath).toLowerCase()] ||
            "application/octet-stream";

        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log("Frontend started on port:", PORT);
});
