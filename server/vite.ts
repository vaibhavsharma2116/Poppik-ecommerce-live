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
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  // Vite middleware को configure करते हैं कि वो API routes को skip करे
  app.use((req, res, next) => {
    // Skip API routes, websocket endpoints and well-known devtools requests from Vite middleware
    if (req.url.startsWith('/api/') || req.url.startsWith('/.well-known/') || req.url.startsWith('/ws')) {
      return next();
    }
    // Non-API routes के लिए Vite middleware run करते हैं
    vite.middlewares(req, res, next);
  });
  
  // Fallback HTML serving केवल non-API routes के लिए
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Double check - skip API, websocket and well-known devtools requests here as well
    if (url.startsWith('/api/') || url.startsWith('/.well-known/') || url.startsWith('/ws')) {
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
        res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(page);
      } catch (transformError) {
        // Fallback: serve template as-is if transformation fails
        console.error("HTML transformation error:", transformError);
        res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(template);
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

  // Serve hashed build assets with aggressive caching.
  // IMPORTANT: if an asset is missing, return 404 (do NOT fall back to index.html),
  // otherwise browsers will try to execute HTML as JS and throw "Failed to fetch dynamically imported module".
  app.use(
    "/assets",
    express.static(path.resolve(distPath, "assets"), {
      fallthrough: false,
      maxAge: "365d",
      immutable: true,
      etag: true,
      lastModified: true,
    }),
  );

  // Static files को भी API routes के conflict से बचाते हैं
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/') || req.url.startsWith('/.well-known/')) {
      return next();
    }
    // Never treat build asset URLs as SPA routes
    if (req.url.startsWith('/assets/')) {
      return next();
    }
    express.static(distPath)(req, res, next);
  });

  // HTML fallback केवल non-API routes के लिए
  app.use("*", (req, res, next) => {
    // API routes को skip करते हैं
    if (req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/.well-known/')) {
      return next();
    }
    // Never fall back to index.html for build asset URLs
    if (req.originalUrl.startsWith('/assets/')) {
      return res.status(404).end();
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
