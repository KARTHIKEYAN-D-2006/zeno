import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue, set, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBwvtKIo2iELihmUu7BOUxnM8Q73nNpA3U",
  authDomain: "zeno-39d68.firebaseapp.com",
  databaseURL: "https://zeno-39d68-default-rtdb.firebaseio.com",
  projectId: "zeno-39d68",
  storageBucket: "zeno-39d68.firebasestorage.app",
  messagingSenderId: "378901269976",
  appId: "1:378901269976:web:ac687cba56c7972f3c36ad",
  measurementId: "G-77M9FRYPCS"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// DOM Elements
const authLink = document.getElementById('authLink');
const authMessage = document.getElementById('authMessage');
const publicGrid = document.getElementById('publicGrid');
const privateGrid = document.getElementById('privateGrid');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Modal Elements
const editModal = document.getElementById('editModal');
const closeModal = document.getElementById('closeModal');
const modalTitle = document.getElementById('modalTitle');
const editFileSelector = document.getElementById('editFileSelector');
const codeEditor = document.getElementById('codeEditor');
const saveEditBtn = document.getElementById('saveEditBtn');

let currentUser = null;
let currentEditingProject = null;
let currentEditingFileKey = null;

// Auth Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authLink.textContent = "SIGN OUT";
        authLink.href = "#";
        authLink.onclick = () => auth.signOut().then(() => location.reload());
        authMessage.textContent = `Logged in as ${user.email}`;
    } else {
        currentUser = null;
        authLink.textContent = "SIGN IN";
        authLink.href = "/signin/index.html";
        authLink.onclick = null;
        authMessage.textContent = "Please sign in to view and manage your projects.";
        privateGrid.innerHTML = "";
    }
});

// UI Tabs
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.add('hidden'));
        
        // Add active class to clicked
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.remove('hidden');
    });
});

// Fetch Realtime Projects
const projectsRef = ref(database, 'projects');
onValue(projectsRef, (snapshot) => {
    publicGrid.innerHTML = "";
    privateGrid.innerHTML = "";
    
    if (!snapshot.exists()) {
        publicGrid.innerHTML = "<p>No public projects found.</p>";
        if(currentUser) privateGrid.innerHTML = "<p>You haven't deployed any projects yet.</p>";
        return;
    }

    const projectsObj = snapshot.val();
    
    // Sort logic (newest first)
    const sortedProjects = Object.entries(projectsObj).sort((a,b) => b[1].timestamp - a[1].timestamp);

    sortedProjects.forEach(([projectId, pData]) => {
        const fileCount = pData.files ? Object.keys(pData.files).length : 0;
        const dateStr = new Date(pData.timestamp).toLocaleDateString();

        // 1. Build Public Card
        const pubCard = document.createElement('div');
        pubCard.className = 'project-card';
        pubCard.innerHTML = `
            <div>
                <h3><i class="fa-solid fa-layer-group"></i> ${pData.projectName}</h3>
                <p>Files: ${fileCount} | Created: ${dateStr}</p>
            </div>
            <div class="card-actions">
                <a href="/s/${projectId}" target="_blank" class="btn btn-view">Visit Site</a>
            </div>
        `;
        publicGrid.appendChild(pubCard);

        // 2. Build Private Card
        if (currentUser && pData.ownerUid === currentUser.uid) {
            const privCard = document.createElement('div');
            privCard.className = 'project-card';
            privCard.innerHTML = `
                <div>
                    <h3><i class="fa-solid fa-lock"></i> ${pData.projectName}</h3>
                    <p>Files: ${fileCount} | Created: ${dateStr}</p>
                </div>
                <div class="card-actions">
                    <a href="/s/${projectId}" target="_blank" class="btn btn-view">Visit</a>
                    <button class="btn btn-edit" data-id="${projectId}">Edit</button>
                    <button class="btn btn-delete" data-id="${projectId}"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            
            // Attach Events
            privCard.querySelector('.btn-edit').addEventListener('click', () => openEditModal(projectId, pData));
            privCard.querySelector('.btn-delete').addEventListener('click', () => deleteProject(projectId));

            privateGrid.appendChild(privCard);
        }
    });

    if (publicGrid.innerHTML === "") publicGrid.innerHTML = "<p>No public projects deployed yet.</p>";
    if (currentUser && privateGrid.innerHTML === "") privateGrid.innerHTML = "<p>You haven't deployed any projects yet.</p>";
});

// Delete Logic
async function deleteProject(projectId) {
    if(confirm("Are you sure you want to permanently delete this project?")) {
        try {
            await remove(ref(database, 'projects/' + projectId));
            alert("Project DELETED.");
        } catch (e) {
            alert("Error deleting project. " + e.message);
        }
    }
}

// Edit Logic
function openEditModal(projectId, projectData) {
    currentEditingProject = projectData;
    currentEditingProject.id = projectId; // inject id for saving later
    modalTitle.textContent = `Editing: ${projectData.projectName}`;
    
    // Build select dropdown
    const files = projectData.files || {};
    let selectHTML = `<select id="fileDropdown">`;
    Object.entries(files).forEach(([fileKey, fileObj]) => {
        selectHTML += `<option value="${fileKey}">${fileObj.name}</option>`;
    });
    selectHTML += `</select>`;
    editFileSelector.innerHTML = selectHTML;

    const fileDropdown = document.getElementById('fileDropdown');
    
    // Function to load file contents into textarea
    const loadFileContent = (key) => {
        currentEditingFileKey = key;
        codeEditor.value = files[key].content || "";
    };

    // Initial load (first file)
    if(Object.keys(files).length > 0) {
        loadFileContent(fileDropdown.value);
    } else {
        codeEditor.value = "No files found to edit.";
    }

    // Dropdown change listener
    fileDropdown.addEventListener('change', (e) => {
        loadFileContent(e.target.value);
    });

    editModal.classList.remove('hidden');
}

closeModal.addEventListener('click', () => {
    editModal.classList.add('hidden');
});

// Save Edits
saveEditBtn.addEventListener('click', async () => {
    if(!currentEditingProject || !currentEditingFileKey) return;
    
    const newContent = codeEditor.value;
    const fileRef = ref(database, `projects/${currentEditingProject.id}/files/${currentEditingFileKey}/content`);
    
    saveEditBtn.textContent = "Saving...";
    saveEditBtn.disabled = true;

    try {
        await set(fileRef, newContent);
        saveEditBtn.textContent = "Saved!";
        setTimeout(() => {
            saveEditBtn.textContent = "Save Changes";
            saveEditBtn.disabled = false;
        }, 1500);
    } catch(err) {
        alert("Failed to save: " + err.message);
        saveEditBtn.textContent = "Save Changes";
        saveEditBtn.disabled = false;
    }
});
