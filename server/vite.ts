import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Vite middleware को configure करते हैं कि वो API routes को skip करे
  app.use((req, res, next) => {
    // API routes को Vite middleware के pass भेजने से रोकते हैं
    if (req.url.startsWith('/api/')) {
      return next();
    }
    // Non-API routes के लिए Vite middleware run करते हैं
    vite.middlewares(req, res, next);
  });
  
  // Fallback HTML serving केवल non-API routes के लिए
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Double check - API routes को यहाँ भी skip करते हैं
    if (url.startsWith('/api/')) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      try {
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (transformError) {
        // Fallback: serve template as-is if transformation fails
        console.error("HTML transformation error:", transformError);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      }
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Static files को भी API routes के conflict से बचाते हैं
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) {
      return next();
    }
    express.static(distPath)(req, res, next);
  });

  // HTML fallback केवल non-API routes के लिए
  app.use("*", (req, res, next) => {
    // API routes को skip करते हैं
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
