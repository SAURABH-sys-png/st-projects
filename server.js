const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_FILE = path.join(__dirname, "data.json");

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBlogs() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  if (!raw.trim()) {
    return [];
  }
  return JSON.parse(raw);
}

function writeBlogs(blogs) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(blogs, null, 2), "utf-8");
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  const requestedPath = req.url === "/" ? "/main.html" : req.url;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, fileData) => {
    if (error) {
      if (error.code === "ENOENT") {
        sendJson(res, 404, { error: "File not found" });
        return;
      }
      sendJson(res, 500, { error: "Failed to read file" });
      return;
    }

    const ext = path.extname(filePath);
    const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(fileData);
  });
}

async function handleApi(req, res) {
  const [pathname] = req.url.split("?");
  const blogId = pathname.startsWith("/api/blogs/") ? pathname.split("/").pop() : null;

  if (req.method === "GET" && pathname === "/api/blogs") {
    return sendJson(res, 200, readBlogs());
  }

  if (req.method === "POST" && pathname === "/api/blogs") {
    try {
      const body = await parseBody(req);
      if (!body.title || !body.content) {
        return sendJson(res, 400, { error: "title and content are required" });
      }
      const blogs = readBlogs();
      const newBlog = {
        id: String(Date.now()),
        title: String(body.title).trim(),
        content: String(body.content).trim(),
      };
      blogs.unshift(newBlog);
      writeBlogs(blogs);
      return sendJson(res, 201, newBlog);
    } catch (_error) {
      return sendJson(res, 400, { error: "invalid JSON body" });
    }
  }

  if (req.method === "PUT" && blogId) {
    try {
      const body = await parseBody(req);
      if (!body.title || !body.content) {
        return sendJson(res, 400, { error: "title and content are required" });
      }
      const blogs = readBlogs();
      const index = blogs.findIndex((blog) => blog.id === blogId);
      if (index === -1) {
        return sendJson(res, 404, { error: "Blog not found" });
      }
      blogs[index] = {
        ...blogs[index],
        title: String(body.title).trim(),
        content: String(body.content).trim(),
      };
      writeBlogs(blogs);
      return sendJson(res, 200, blogs[index]);
    } catch (_error) {
      return sendJson(res, 400, { error: "invalid JSON body" });
    }
  }

  if (req.method === "DELETE" && blogId) {
    const blogs = readBlogs();
    const index = blogs.findIndex((blog) => blog.id === blogId);
    if (index === -1) {
      return sendJson(res, 404, { error: "Blog not found" });
    }
    const [deleted] = blogs.splice(index, 1);
    writeBlogs(blogs);
    return sendJson(res, 200, deleted);
  }

  return sendJson(res, 404, { error: "API route not found" });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
