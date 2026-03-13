import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const database = getDatabase(app);
export const auth = getAuth(app);

export async function deployToZeno(siteId, providedFiles) {
  const user = auth.currentUser;
  if (!user) {
    alert("You must be signed in to deploy.");
    return;
  }

  const files = providedFiles || document.getElementById('fileInput').files; 
  if (!files || files.length === 0) {
    alert("Please select files first.");
    return;
  }

  let siteFilesMap = {};

  // Package all text files indiscriminately 
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
        const textContent = await file.text();
        const safeKey = `file${i+1}`;
        siteFilesMap[safeKey] = {
           name: file.name,
           content: textContent
        };
    } catch (e) {
        console.warn(`Skipping non-text file: ${file.name}`);
    }
  }

  if (Object.keys(siteFilesMap).length === 0) {
    alert("No readable text files found.");
    return;
  }

  try {
    // Save multiple files under the new projects structure
    const projectRef = ref(database, 'projects/' + siteId);
    await set(projectRef, {
      ownerUid: user.uid,
      projectName: siteId,
      timestamp: Date.now(),
      files: siteFilesMap
    });
    
    // Return live parent URL
    return window.location.origin + '/s/' + siteId;
  } catch (error) {
    console.error("Error saving to Firebase:", error);
    throw error;
  }
};
