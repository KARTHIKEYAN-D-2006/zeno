const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const deploymentsDbPath = path.join(__dirname, 'deployed', 'deployments-db.json');

function loadDeploymentsDb() {
  try {
    if (!fs.existsSync(deploymentsDbPath)) return { deployments: [] };
    const raw = fs.readFileSync(deploymentsDbPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load deployments DB:', err.message);
    return { deployments: [] };
  }
}

function saveDeploymentsDb(data) {
  fs.mkdirSync(path.dirname(deploymentsDbPath), { recursive: true });
  fs.writeFileSync(deploymentsDbPath, JSON.stringify(data, null, 2), 'utf8');
}

app.post('/api/deploy', (req, res) => {
  try {
    const userId = (req.body.userId || 'anonymous').toString();
    const subdomain = req.body.subdomain;
    const repoName = req.body.repoName || 'repo';
    const files = req.body.files; // Expected to be array of { name: '...', content: '...' }

    if (!subdomain || !files || !files.length) {
      return res.status(400).json({ message: 'Missing subdomain or files array in JSON payload' });
    }

    // Local deployment path (the old local route).
    const targetDir = path.join(__dirname, 'deployed', 'users', userId, subdomain);
    fs.mkdirSync(targetDir, { recursive: true });

    const uploaded = [];
    for (const file of files) {
      const relativeName = file.name.replace(/\\/g, '/');
      const targetPath = path.join(targetDir, relativeName);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, file.content, 'utf8');
      uploaded.push(relativeName);
    }

    // Firebase-style path for metadata; requires separate Firebase hosting process to serve.
    const firebaseHost = 'https://zeno-39d68.web.app';
    const firebaseUrl = `${firebaseHost}/deployments/${encodeURIComponent(userId)}/${encodeURIComponent(subdomain)}/`;

    // register in local DB
    const db = loadDeploymentsDb();
    const existing = db.deployments.find(d => d.userId === userId && d.subdomain === subdomain);
    const now = new Date().toISOString();

    const deployEntry = {
      id: `${userId}-${subdomain}`,
      userId,
      repoName,
      subdomain,
      url: firebaseUrl,
      uploaded,
      status: 'deployed',
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    if (existing) {
      Object.assign(existing, deployEntry);
    } else {
      db.deployments.push(deployEntry);
    }

    saveDeploymentsDb(db);

    return res.json({
      deployUrl: firebaseUrl,
      message: 'Deployment successful',
      subdomain,
      meta: deployEntry,
    });
  } catch (error) {
    console.error('API deploy error:', error);
    return res.status(500).json({ message: 'Server error during deploy', detail: error.message });
  }
});

app.get('/api/deployments/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const db = loadDeploymentsDb();
    const userDeploys = db.deployments.filter(d => d.userId === userId);
    return res.json({ deployments: userDeploys });
  } catch (error) {
    console.error('API deployments list error:', error);
    return res.status(500).json({ message: 'Server error fetching deployments', detail: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Project Zeno deployment service running. After deployment, open /<subdomain>.');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve deployed app by subdomain path (e.g. /zeno-abc123)
function serveDeployedFile(subdomain, requestedPath, res) {
  const safePath = path.normalize(requestedPath).replace(/^\/+/, '');
  const fullPath = path.join(__dirname, 'deployed', subdomain, safePath);

  if (!fullPath.startsWith(path.join(__dirname, 'deployed', subdomain))) {
    return res.status(400).send('Invalid path');
  }

  fs.access(fullPath, fs.constants.R_OK, err => {
    if (err) {
      return res.status(404).send('File not found');
    }
    res.sendFile(fullPath);
  });
}

function findDeployedIndex(subdomain) {
  const base = path.join(__dirname, 'deployed', subdomain);
  if (!fs.existsSync(base)) {
    return null;
  }

  const rootIndex = path.join(base, 'index.html');
  if (fs.existsSync(rootIndex)) return 'index.html';

  const rootLogin = path.join(base, 'login.html');
  if (fs.existsSync(rootLogin)) return 'login.html';

  // Walk directory tree in BFS order to prefer root-level and near-root files.
  const queue = [base];
  let fallbackLogin = null;
  let fallbackHtml = null;

  while (queue.length) {
    const dir = queue.shift();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      const filename = entry.name.toLowerCase();
      if (filename === 'index.html') {
        return path.relative(base, fullPath).replace(/\\/g, '/');
      }
      if (filename === 'login.html' && !fallbackLogin) {
        fallbackLogin = path.relative(base, fullPath).replace(/\\/g, '/');
      }
      if (!fallbackHtml && filename.endsWith('.html')) {
        fallbackHtml = path.relative(base, fullPath).replace(/\\/g, '/');
      }
    }
  }

  return fallbackLogin || fallbackHtml;
}

function serveSubdomainRoot(req, res) {
  const subdomain = req.params.subdomain;
  if (subdomain === 'api') return res.status(404).send('Not found');

  const candidate = findDeployedIndex(subdomain);
  if (!candidate) return res.status(404).send('File not found');

  return serveDeployedFile(subdomain, candidate, res);
}

app.get('/:subdomain', serveSubdomainRoot);
app.get('/:subdomain/', serveSubdomainRoot);

app.get('/users/:userId/:subdomain', (req, res) => {
  const { userId, subdomain } = req.params;
  const candidate = findDeployedIndex(path.join(userId, subdomain));
  if (!candidate) return res.status(404).send('File not found');
  return serveDeployedFile(path.join(userId, subdomain), candidate, res);
});

app.get(/^\/users\/([^\/]+)\/([^\/]+)\/(.+)$/, (req, res) => {
  const userId = req.params[0];
  const subdomain = req.params[1];
  const pathSuffix = req.params[2];
  if (!pathSuffix) return res.status(404).send('File not found');
  return serveDeployedFile(path.join(userId, subdomain), pathSuffix, res);
});

app.get(/^\/([^\/]+)\/(.*)$/, (req, res) => {
  const subdomain = req.params[0];
  if (subdomain === 'api' || subdomain === 'users') return res.status(404).send('Not found');

  const remaining = req.params[1] || 'index.html';
  return serveDeployedFile(subdomain, remaining, res);
});

app.listen(5000, () => {
  console.log('Deployment API server running.');
});
