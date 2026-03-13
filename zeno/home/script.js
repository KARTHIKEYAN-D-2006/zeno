import { deployToZeno, auth } from './upload.js';
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
const API_BASE = 'https://zeno-39d68.web.app';

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileListEl = document.getElementById('fileList');
const deployBtn = document.getElementById('deployBtn');
const liveUrlEl = document.getElementById('liveUrl');
const deploymentsListEl = document.getElementById('deploymentsList');
const logOutput = document.getElementById('logOutput');
const aiPrompt = document.getElementById('aiPrompt');
const aiGenerate = document.getElementById('aiGenerate');
const generatedHtml = document.getElementById('generatedHtml');
const generatedCss = document.getElementById('generatedCss');
const logoutBtn = document.getElementById('logoutBtn');
const appGrid = document.getElementById('appGrid');

let selectedFiles = [];
let deploymentName = null;

function showDashboard() {
  appGrid.classList.remove('hidden');
  appendLog('User has signed in. Dashboard is visible.');
}

function appendLog(msg) {
  const time = new Date().toLocaleTimeString();
  logOutput.textContent += `[${time}] ${msg}\n`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function renderFileList() {
  fileListEl.innerHTML = '';
  selectedFiles.forEach((file, idx) => {
    const li = document.createElement('li');
    li.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
    const trash = document.createElement('button');
    trash.textContent = 'remove';
    trash.style.border = '1px solid rgba(255,255,255,.2)';
    trash.style.background = 'transparent';
    trash.style.color = 'var(--text)';
    trash.style.padding = '0.15rem 0.35rem';
    trash.style.borderRadius = '6px';
    trash.style.cursor = 'pointer';
    trash.addEventListener('click', () => {
      selectedFiles.splice(idx, 1);
      renderFileList();
    });
    li.appendChild(trash);
    fileListEl.appendChild(li);
  });
}

function handleFiles(files) {
  for (const file of files) {
    if (!['text/html', 'text/css', 'application/javascript', 'text/javascript'].includes(file.type) && !file.name.match(/\.(html|css|js)$/i)) continue;
    selectedFiles.push(file);
  }
  if (selectedFiles.length > 0) {
    appendLog(`Picked ${selectedFiles.length} file(s)`);
  }
  renderFileList();
}

function getUploadFileName(file) {
  // preserve folder path from directory upload, fallback to file.name
  if (file.webkitRelativePath && file.webkitRelativePath.trim()) {
    return file.webkitRelativePath;
  }
  return file.name;
}

dropZone.addEventListener('click', () => fileInput.click());

fileInput.onchange = e => handleFiles(e.target.files);

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

aiGenerate.addEventListener('click', async () => {
  const prompt = aiPrompt.value.trim();
  if (!prompt) {
    appendLog('AI prompt required.');
    return;
  }

  appendLog('AI prompt received, generating site...');
  aiGenerate.disabled = true;

  // Placeholder for real LLM API call.
  await new Promise(r => setTimeout(r, 1100));

  const html = `<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\" />\n  <title>Project Zeno Site</title>\n  <link rel=\"stylesheet\" href=\"style.css\" />\n</head>\n<body>\n  <header>\n    <h1>Generated for: ${prompt.replace(/</g, '&lt;')}</h1>\n    <p>Instant deployment with Project Zeno</p>\n  </header>\n  <main>\n    <section class=\"hero\">\n      <h2>Go live with zero setup</h2>\n      <p>This page was generated automatically by the AI Builder.</p>\n    </section>\n  </main>\n  <footer>Deployed by Project Zeno</footer>\n</body>\n</html>`;

  const css = `body { margin: 0; font-family: Inter, Helvetica, Arial, sans-serif; color: #111; }
header { padding: 3rem; text-align: center; background: linear-gradient(135deg, #5f4cd6, #af59fb); color: white; }
main .hero { padding: 2rem; text-align: center; }
footer { text-align: center; padding: 1rem; color: #777; }
`;

  generatedHtml.textContent = html;
  generatedCss.textContent = css;

  // place into selected files so user can deploy directly
  selectedFiles = selectedFiles.filter(f => !['index.html', 'style.css'].includes(f.name.toLowerCase()));
  selectedFiles.push(new File([html], 'index.html', { type: 'text/html' }), new File([css], 'style.css', { type: 'text/css' }));
  renderFileList();

  appendLog('AI generation complete. Files pre-loaded to deploy.');
  aiGenerate.disabled = false;
});

function generateSubdomain() {
  const suffix = Math.random().toString(36).split('.')[1].slice(0, 6);
  deploymentName = `zeno-${suffix}`;
  return deploymentName;
}

async function deploy() {
  if (!selectedFiles.length) {
    appendLog('No files selected for deployment.');
    return;
  }
  appendLog('Starting deployment...');
  deployBtn.disabled = true;

  const subdomain = generateSubdomain();

  const steps = [
    'Analyzing files as text...',
    'Uploading via Firebase RTDB API...',
    'Deployment complete'
  ];

  for (const step of steps) {
    appendLog(step);
    await new Promise(r => setTimeout(r, 650));
  }

  try {
    // Pass `selectedFiles` to support drag and drop in addition to normal file inputs
    const displayUrl = await deployToZeno(subdomain, selectedFiles);
    
    appendLog(`Firebase confirmed deployment success.`);
    liveUrlEl.innerHTML = `<a href="${displayUrl}" target="_blank">${displayUrl}</a>`;
    
  } catch (err) {
    appendLog(`Deployment failed: ${err.message}. Please check console.`);
  }

  deployBtn.disabled = false;
}

deployBtn.addEventListener('click', deploy);

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem('zenoUsers') || '{}');
  } catch {
    return {};
  }
}

function renderDeployments(deployments) {
  deploymentsListEl.innerHTML = '';
  if (!deployments || !deployments.length) {
    deploymentsListEl.innerHTML = '<li>No deployments yet.</li>';
    return;
  }

  deployments.forEach(dep => {
    const li = document.createElement('li');
    li.innerHTML = `${dep.repoName} (<a href="${dep.url}" target="_blank">${dep.url}</a>) - last updated ${new Date(dep.updatedAt).toLocaleString()}`;
    deploymentsListEl.appendChild(li);
  });
}

async function fetchDeployments(userId) {
  try {
    const response = await fetch(`${API_BASE}/api/deployments/${encodeURIComponent(userId)}`);
    if (!response.ok) throw new Error('Failed to fetch deployments');
    const data = await response.json();
    renderDeployments(data.deployments || []);
  } catch (err) {
    appendLog(`Failed to load deployments: ${err.message}`);
  }
}

// Moved to top

let currentUser = null;

async function logoutUser() {
  await signOut(auth);
  appendLog('User logged out. Returning to sign-in.');
  window.location.href = '/signin/index.html';
}

function checkSession() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      appendLog(`Welcome back. Resuming dashboard.`);
      showDashboard();
      // Legacy UI: This fetchDeployments call used the node server. 
      // We'll leave it empty for now, the new Dashboard will be built in dashboard.html.
    } else {
      window.location.href = '/signin/index.html';
    }
  });
}

logoutBtn.addEventListener('click', logoutUser);

checkSession();

appendLog('Project Zeno frontend ready.');