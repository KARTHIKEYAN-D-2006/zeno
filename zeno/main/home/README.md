# Project Zeno - Frontend Prototype

A lightweight, hackathon-ready frontend for Project Zeno (static site hosting with dynamic subdomains).

## 🧩 What’s Included

- Responsive dashboard UI with drag-and-drop file upload area.
- AI Builder prompt UI to generate `index.html` + `style.css` preview (mocked LLM generator).
- Deployment stream log output to simulate real-time terminal updates.
- Google SSO placeholder button + UI state.
- Generated subdomain URL and placeholder backend deployment request.

## 📁 Modular File Structure

- `index.html` — App shell and dashboard components.
- `style.css` — polished theme, responsive cards, dark mode style.
- `script.js` — upload handling, file list, AI flow, deploy simulation, logs.
- `README.md` — architecture and deployment guidance.

## 🗄 PostgreSQL Schema (Suggested)

### `users`
- `id` UUID PRIMARY KEY
- `email` VARCHAR UNIQUE
- `name` VARCHAR
- `oauth_provider` VARCHAR
- `oauth_provider_id` VARCHAR
- `created_at` TIMESTAMP DEFAULT NOW()

### `deployments`
- `id` UUID PRIMARY KEY
- `user_id` UUID REFERENCES users(id)
- `name` VARCHAR
- `subdomain` VARCHAR UNIQUE
- `bucket_path` VARCHAR (e.g., `zeno/user123/deploy456`)
- `status` VARCHAR (e.g., `pending`, `deploying`, `active`, `failed`)
- `created_at` TIMESTAMP DEFAULT NOW()

### `domains`
- `id` UUID PRIMARY KEY
- `deployment_id` UUID REFERENCES deployments(id)
- `domain` VARCHAR UNIQUE (e.g., `zeno-abcd.localhost`)
- `target_path` VARCHAR
- `active` BOOLEAN DEFAULT TRUE
- `created_at` TIMESTAMP DEFAULT NOW()

## ⚙️ Backend / Middleware Architecture

### REST endpoints (backend stubs)
- `POST /api/upload` — accepts files + subdomain metadata.
- `POST /api/deploy` — pipeline: validate, store in MinIO/S3, write DB.
- `GET /api/deploy/logs?deployment=<id>` — stream logs (EventSource or WebSockets).
- `GET /api/subdomain/:name` — lookup in DB and send site file list origin.

### Subdomain routing middleware (Express example)

```js
const express = require('express');
const { lookupDomain } = require('./db');

const app = express();

app.use(async (req, res, next) => {
  const host = req.headers.host;
  const subdomain = host?.split('.')[0];

  if (!subdomain || subdomain === 'localhost' || subdomain === 'www') {
    return next();
  }

  const domainRow = await lookupDomain(subdomain);
  if (!domainRow) {
    return res.status(404).send('Subdomain not found');
  }

  const objectPath = domainRow.target_path; // e.g., zeno/uid/deployid

  // Proxy request to MinIO/S3 with path mapping
  const s3Path = `${objectPath}${req.path === '/' ? '/index.html' : req.path}`;
  return proxyToS3(s3Path, res);
});

function proxyToS3(key, res) {
  // example for minio SDK
  minioClient.getObject('zeno-sites', key, (err, stream) => {
    if (err) return res.status(404).send('Not found');
    stream.pipe(res);
  });
}

app.listen(3000, () => console.log('Zeno proxy on 3000'));
```

## 🧪 Local dev setup (frontend only)

1. `cd Modern-Login-Page-Template-main/Modern-Login-Page-Template-main`
2. Open `index.html` in browser (or run `npx serve .`).
3. Drag/drop `.html`, `.css`, `.js` files.
4. Use AI panel to generate test site.
5. Click Deploy (simulated with logs, with planned backend call to `/api/deploy`).

## 🧠 Design Decisions

- Switched from legacy login template to dashboard structure for features-first UX.
- Kept object-store mandatory by design: upload does not save local disk path; user files flow via synthetic `FormData`.
- AI Builder central to zero-to-live concept: text prompt => instant website placeholders.
- Live logs mimic deploy core cluster steps (analyzing, uploading, routing).

## 🎯 Demo checklist

- [x] AI prompt generates website files.
- [x] Deployment log stream visible.
- [x] Subdomain URL is auto-created in frontend.
- [x] DB schema & middleware documented.
- [x] SSO button present for optional Google OAuth integration.

## 🔧 Next steps for full-stack

- Implement backend in Node/Express or Java/Spring Boot.
- Add PostgreSQL + connection pooling.
- Use MinIO or AWS S3 SDK to store files,
- Set wildcards in `hosts` (`zeno-XXXX.localhost`), or use local DNS rewrite.
- Implement realtime endpoint via WebSocket (`/ws/logs`) and integrate in UI.
- Add proper auth guard to dashboard in `/api/*`.
