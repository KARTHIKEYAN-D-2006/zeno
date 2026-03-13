import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// TODO: replace with your actual Firebase config from the console.
const firebaseConfig = {
  apiKey: 'AIzaSyBwvtKIo2iELihmUu7BOUxnM8Q73nNpA3U',
  authDomain: 'zeno-39d68.firebaseapp.com',
  projectId: 'zeno-39d68',
  storageBucket: 'zeno-39d68.appspot.com',
  messagingSenderId: '378901269976',
  appId: '1:378901269976:web:ac687cba56c7972f3c36ad',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

const registerForm = document.getElementById('registerForm');
const signinForm = document.getElementById('signinForm');
const signinGoogle = document.getElementById('signinGoogle');
const registerGoogle = document.getElementById('registerGoogle');
registerBtn.addEventListener('click', () => {
  container.classList.add('active');
});

loginBtn.addEventListener('click', () => {
  container.classList.remove('active');
});

// Rely on Firebase Auth persistence instead of localStorage for security
function openHome() {
  window.location.href = '/home/index.html';
}

signinForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('signinEmail').value.trim();
  const password = document.getElementById('signinPassword').value.trim();
  if (!email || !password) {
    window.alert('Please complete both email and password.');
    return;
  }

  try {
    await setPersistence(auth, browserSessionPersistence);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    window.alert('Sign in successful! Redirecting to home page...');
    openHome();
  } catch (err) {
    window.alert(err.message || 'Failed to sign in. Please try again.');
  }
});

registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  const name = document.getElementById('registerName').value.trim();
  if (!name || !email || !password) {
    window.alert('Please fill in name, email, and password.');
    return;
  }

  try {
    await setPersistence(auth, browserSessionPersistence);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    window.alert('Registration success! Redirecting to home page...');
    openHome();
  } catch (err) {
    window.alert(err.message || 'Failed to register. Please try again.');
  }
});

async function loginWithGoogle() {
  await setPersistence(auth, browserSessionPersistence);
  const result = await signInWithPopup(auth, googleProvider);
  openHome();
}

async function loginWithGithub() {
  await setPersistence(auth, browserSessionPersistence);
  const result = await signInWithPopup(auth, githubProvider);
  openHome();
}

signinGoogle.addEventListener('click', () => {
  loginWithGoogle().catch(err => alert(err.message));
});

registerGoogle.addEventListener('click', () => {
  loginWithGoogle().catch(err => alert(err.message));
});
