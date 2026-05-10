import dotenv from 'dotenv';
import express from "express";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { execSync } from "child_process";
import AdmZip from "adm-zip";
import odbc from 'odbc';

// 只在開發環境加載 .env 檔案（Docker 會自動加載環境變數）
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const BACKGROUNDS_FILE = path.join(DATA_DIR, 'backgrounds.json');
const DEFAULT_SLIDE_FILE = path.join(DATA_DIR, 'default_slide.json');
const PRESETS_DIR = path.join(DATA_DIR, 'presets');
const SLIDES_DIR = path.join(DATA_DIR, 'slides');
const BACKGROUNDS_DIR = path.join(DATA_DIR, 'backgrounds');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

// Decode a base64 data URI and write to disk. Returns the file extension used.
async function saveDataUri(dataUri: string, dir: string, filename: string): Promise<string> {
  const [header, b64] = dataUri.split(',');
  const mimeMatch = header.match(/image\/(\w+)/);
  let ext = mimeMatch ? mimeMatch[1].replace('jpeg', 'jpg') : 'jpg';
  const filepath = path.join(dir, `${filename}.${ext}`);
  await fs.writeFile(filepath, Buffer.from(b64, 'base64'));
  return ext;
}

// Delete a local image file by its served URL path (e.g. /slides/slide-id-1/image.jpg)
async function deleteImageFile(url: string | undefined) {
  if (!url) return;
  if (url.startsWith('/slides/')) {
    const parts = url.slice(1).split('/');
    if (parts.length >= 2) {
      const slideId = parts[1];
      const filename = parts.slice(2).join('/');
      await fs.unlink(path.join(SLIDES_DIR, slideId, filename)).catch(() => {});
    }
  } else if (url.startsWith('/backgrounds/')) {
    const filename = path.basename(url);
    await fs.unlink(path.join(BACKGROUNDS_DIR, filename)).catch(() => {});
  }
}

async function ensureDataDir() {
  try {
    await fs.mkdir(PRESETS_DIR, { recursive: true });
    await fs.mkdir(SLIDES_DIR, { recursive: true });
    await fs.mkdir(BACKGROUNDS_DIR, { recursive: true });

    const jsonFiles = [
      { path: SETTINGS_FILE, initial: { rotationSpeed: 10, autoPlay: true } },
      { path: BACKGROUNDS_FILE, initial: [] },
      {
        path: DEFAULT_SLIDE_FILE,
        initial: {
          id: 'default-home',
          imageUrl: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          title: '歡迎光臨',
          subtitle: 'Welcome to our space',
          lines: [],
          expiresAt: '2099-12-31T23:59:59.999Z',
          createdAt: new Date().toISOString(),
          order: 0,
          isDefault: true
        }
      }
    ];

    for (const file of jsonFiles) {
      try {
        await fs.access(file.path);
      } catch {
        await fs.writeFile(file.path, JSON.stringify(file.initial, null, 2));
      }
    }
  } catch (err) {
    console.error('Error ensuring data dir:', err);
  }
}

async function startServer() {
  await ensureDataDir();

  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Static file routes for local images (must come before Vite middleware)
  app.use('/presets', express.static(PRESETS_DIR));
  app.use('/slides', express.static(SLIDES_DIR));
  app.use('/backgrounds', express.static(BACKGROUNDS_DIR));

  // ── Slides ────────────────────────────────────────────────────────────────

  app.get('/api/slides', async (req, res) => {
    try {
      // Ensure slides directory exists
      await fs.mkdir(SLIDES_DIR, { recursive: true });
      
      const entries = await fs.readdir(SLIDES_DIR, { withFileTypes: true });
      const slides: any[] = [];
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const metaPath = path.join(SLIDES_DIR, entry.name, 'meta.json');
        try {
          const metaData = await fs.readFile(metaPath, 'utf-8');
          slides.push(JSON.parse(metaData));
        } catch (err) {
          // meta.json 不存在或無效，這是未完成的看板
          console.warn(`Cleaning up incomplete slide folder: ${entry.name}`);
          try {
            await fs.rm(path.join(SLIDES_DIR, entry.name), { recursive: true, force: true });
          } catch {}
        }
      }
      res.json(slides);
    } catch (err) {
      console.error('Error reading slides:', err);
      res.status(500).json({ error: 'Failed to read slides' });
    }
  });

  // Bulk write (overwrite all slides - each slide gets its own folder)
  app.post('/api/slides', async (req, res) => {
    try {
      const slides = Array.isArray(req.body) ? req.body : [req.body];
      
      // Ensure slides directory exists
      await fs.mkdir(SLIDES_DIR, { recursive: true });
      
      // Write each slide to its own folder (update if exists, create if not)
      for (const slide of slides) {
        if (!slide.id) {
          console.warn('Skipping slide without id:', slide);
          continue;
        }
        const slideDir = path.join(SLIDES_DIR, slide.id);
        await fs.mkdir(slideDir, { recursive: true });
        
        // Only write meta.json, preserve existing image files
        const metaPath = path.join(slideDir, 'meta.json');
        await fs.writeFile(metaPath, JSON.stringify(slide, null, 2));
      }
      
      // Clean up slides not in the provided list (optional)
      const existingEntries = await fs.readdir(SLIDES_DIR, { withFileTypes: true });
      const providedIds = new Set(slides.map(s => s.id).filter(Boolean));
      
      for (const entry of existingEntries) {
        if (entry.isDirectory() && !providedIds.has(entry.name)) {
          try {
            await fs.rm(path.join(SLIDES_DIR, entry.name), { recursive: true, force: true });
            console.log(`Deleted orphaned slide folder: ${entry.name}`);
          } catch (err) {
            console.warn(`Failed to delete ${entry.name}:`, err);
          }
        }
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error('Error saving slides:', err);
      res.status(500).json({ error: 'Failed to save slides' });
    }
  });

  // Update single slide
  app.put('/api/slides/:id', async (req, res) => {
    try {
      const slideDir = path.join(SLIDES_DIR, req.params.id);
      const metaPath = path.join(slideDir, 'meta.json');
      
      try {
        await fs.access(metaPath);
      } catch {
        return res.status(404).json({ error: 'Slide not found' });
      }

      const metaData = await fs.readFile(metaPath, 'utf-8');
      const slide = JSON.parse(metaData);
      
      const updates = req.body;

      // If the image is being replaced, delete the old slide image file
      if (updates.imageUrl && slide.imageUrl !== updates.imageUrl) {
        await deleteImageFile(slide.imageUrl);
      }

      const updated = { ...slide, ...updates };
      await fs.writeFile(metaPath, JSON.stringify(updated, null, 2));
      res.json(updated);
    } catch (err) {
      console.error('Error updating slide:', err);
      res.status(500).json({ error: 'Failed to update slide' });
    }
  });

  // Delete single slide and its entire folder
  app.delete('/api/slides/:id', async (req, res) => {
    try {
      const slideDir = path.join(SLIDES_DIR, req.params.id);
      await fs.rm(slideDir, { recursive: true, force: true });
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting slide:', err);
      res.status(500).json({ error: 'Failed to delete slide' });
    }
  });

  // ── Image Upload ──────────────────────────────────────────────────────────

  // Upload a slide background image → stored in data/slides/{slideId}/
  app.post('/api/upload/slide', async (req, res) => {
    try {
      const { data: dataUri, slideId } = req.body as { data: string; slideId?: string };
      if (!dataUri) return res.status(400).json({ error: 'Missing data' });
      
      const id = slideId || randomUUID();
      const slideDir = path.join(SLIDES_DIR, id);
      
      // Ensure slide directory exists (but DON'T create meta.json yet)
      await fs.mkdir(slideDir, { recursive: true });
      
      // Save the image file
      const ext = await saveDataUri(dataUri, slideDir, 'image');
      res.json({ url: `/slides/${id}/image.${ext}` });
    } catch (err) {
      console.error('Error saving slide image:', err);
      res.status(500).json({ error: 'Failed to save slide image' });
    }
  });

  app.post('/api/upload/preset', async (req, res) => {
    try {
      const { id, data } = req.body;
      if (!id || !data) return res.status(400).json({ error: 'Missing id or data' });
      const ext = await saveDataUri(data, PRESETS_DIR, id);
      res.json({ url: `/presets/${id}.${ext}` });
    } catch {
      res.status(500).json({ error: 'Failed to upload preset image' });
    }
  });

  // Upload a reusable background → stored in data/backgrounds/, registered in backgrounds.json
  app.post('/api/upload/background', async (req, res) => {
    try {
      const { data: dataUri, name } = req.body as { data: string; name?: string };
      if (!dataUri) return res.status(400).json({ error: 'Missing data' });
      const id = randomUUID();
      const ext = await saveDataUri(dataUri, BACKGROUNDS_DIR, id);
      const url = `/backgrounds/${id}.${ext}`;
      const bgData = await fs.readFile(BACKGROUNDS_FILE, 'utf-8');
      const backgrounds: any[] = JSON.parse(bgData);
      const newBg = { id, name: name ?? id, url };
      backgrounds.push(newBg);
      await fs.writeFile(BACKGROUNDS_FILE, JSON.stringify(backgrounds, null, 2));
      res.json(newBg);
    } catch {
      res.status(500).json({ error: 'Failed to save background' });
    }
  });

  // ── Preset Backgrounds ────────────────────────────────────────────────────

  // List image files in data/presets/ (admin places files here manually)
  app.get('/api/presets', async (req, res) => {
    try {
      const entries = await fs.readdir(PRESETS_DIR);
      const presets = entries
        .filter(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
        .map(f => ({ name: path.basename(f, path.extname(f)), url: `/presets/${f}` }));
      res.json(presets);
    } catch {
      res.status(500).json({ error: 'Failed to read presets' });
    }
  });

  // ── Backgrounds ───────────────────────────────────────────────────────────

  app.get('/api/backgrounds', async (req, res) => {
    try {
      const data = await fs.readFile(BACKGROUNDS_FILE, 'utf-8');
      res.json(JSON.parse(data));
    } catch {
      res.status(500).json({ error: 'Failed to read backgrounds' });
    }
  });

  // Delete background metadata and its image file
  app.delete('/api/backgrounds/:id', async (req, res) => {
    try {
      const data = await fs.readFile(BACKGROUNDS_FILE, 'utf-8');
      const backgrounds: any[] = JSON.parse(data);
      const target = backgrounds.find((b: any) => b.id === req.params.id);
      if (target) await deleteImageFile(target.url);
      const updated = backgrounds.filter((b: any) => b.id !== req.params.id);
      await fs.writeFile(BACKGROUNDS_FILE, JSON.stringify(updated, null, 2));
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete background' });
    }
  });

  // ── Authentication ───────────────────────────────────────────────────────

  // 構建 ODBC 連線字符串
  const buildOdbcConnectionString = (hostname: string, port: string, database: string, username: string, password: string) => {
    // IBM i (AS/400) ODBC 連線字串
    return `DRIVER={IBM i Access ODBC Driver};SYSTEM=${hostname};UID=${username};PWD=${password};`;
    //return `DRIVER={Client Access ODBC Driver (32-bit)};SYSTEM=${hostname};UID=${username};PWD=${password}`;
  };

  // DB2/ODBC 認證端點
  app.post('/api/auth/db2', async (req, res) => {
    let connection = null;
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Missing username or password' });
      }

      const hostname = process.env.DB2_HOSTNAME || process.env.DB2_SYSTEM || process.env.DB2_HOST || 'localhost';
      const port = process.env.DB2_PORT || '446';
      const database = process.env.DB2_DATABASE || '*LOCAL';

      console.log(`🔐 ODBC authentication attempt for user: ${username}`);


      try {
        // 構建連線字符串
        const connectionString = buildOdbcConnectionString(hostname, port, database, username, password);
        console.log(`   Connecting to: ${connectionString}`);
        // 連接到資料庫
        connection = await odbc.connect(connectionString);
        
        console.log(`✅ ODBC connection successful for user: ${username}`);
        
        // 認證成功，生成令牌
        const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
        
        console.log(`✅ ODBC authentication successful for user: ${username}`);
        
        return res.json({ 
          success: true, 
          message: 'ODBC authentication successful',
          token,
          username
        });
        
      } catch (dbError: any) {
        const errorMessage = dbError.message || 'Unknown error';
        console.error(`❌ ODBC authentication failed: ${errorMessage}`);
        
        // 檢查是否是連線或認證錯誤
        if (errorMessage.includes('[08001]') || 
            errorMessage.includes('[28000]') ||
            errorMessage.includes('authentication failed') ||
            errorMessage.includes('invalid user') ||
            errorMessage.includes('permission denied')) {
          return res.status(401).json({ 
            success: false, 
            error: 'Invalid username or password'
          });
        }
        
        return res.status(401).json({ 
          success: false, 
          error: 'ODBC authentication failed'
        });
      }
    } catch (error) {
      console.error('❌ 認證端點錯誤:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    } finally {
      // 關閉連接
      if (connection) {
        try {
          await connection.close();
          console.log('✅ ODBC connection closed');
        } catch (closeError) {
          console.warn('⚠️  Error closing connection:', (closeError as any).message);
        }
      }
    }
  });

  // 簡單的認證狀態檢查
  app.get('/api/auth/status', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token && token.length > 0) {
      return res.json({ authenticated: true });
    }
    res.json({ authenticated: false });
  });

  // ── Settings ──────────────────────────────────────────────────────────────

  app.get('/api/settings', async (req, res) => {
    try {
      const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
      res.json(JSON.parse(data));
    } catch {
      res.status(500).json({ error: 'Failed to read settings' });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // ── Default Slide ─────────────────────────────────────────────────────────

  app.get('/api/default-slide', async (req, res) => {
    try {
      const data = await fs.readFile(DEFAULT_SLIDE_FILE, 'utf-8');
      res.json(JSON.parse(data));
    } catch {
      res.status(500).json({ error: 'Failed to read default slide' });
    }
  });

  app.post('/api/default-slide', async (req, res) => {
    try {
      await fs.writeFile(DEFAULT_SLIDE_FILE, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to save default slide' });
    }
  });

  // ── Backup and Restore ──────────────────────────────────────────────────

  app.get('/api/backup', async (req, res) => {
    try {
      const zip = new AdmZip();
      zip.addLocalFolder(DATA_DIR);
      res.attachment(`welcome-board-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`);
      res.send(zip.toBuffer());
    } catch (e) {
      console.error('Backup error:', e);
      res.status(500).json({ error: 'Failed to create backup' });
    }
  });

  app.post('/api/restore', async (req, res) => {
    try {
      const { data: base64Zip } = req.body as { data: string };
      if (!base64Zip) return res.status(400).json({ error: 'Missing zip data' });
      
      const buffer = Buffer.from(base64Zip.replace(/^data:application\/zip;base64,/, ''), 'base64');
      const zip = new AdmZip(buffer);
      
      // Try to clean data dir but keep the dir itself alive
      try { await fs.rm(DATA_DIR, { recursive: true, force: true }); } catch {}
      await ensureDataDir();
      
      zip.extractAllTo(DATA_DIR, true);
      res.json({ success: true });
    } catch (e) {
      console.error('Restore error:', e);
      res.status(500).json({ error: 'Failed to restore backup' });
    }
  });

  // ── Frontend ──────────────────────────────────────────────────────────────

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = parseInt(process.env.PORT || '5000', 10);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
