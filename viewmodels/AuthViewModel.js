import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import {
	getAuth,
	signInWithEmailAndPassword,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'

// Firebase конфиг
const firebaseConfig = {
	apiKey: 'AIzaSyD_mvSHO3Mt_lk4iM8gIMCoqfK63-3Qvis',
	authDomain: 'praktikask-caa0b.firebaseapp.com',
	projectId: 'praktikask-caa0b',
	storageBucket: 'praktikask-caa0b.firebasestorage.app',
	messagingSenderId: '638525976207',
	appId: '1:638525976207:web:865c01a5b7981e0d7a8afa',
}

// Инициализация Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

// Кнопка "Войти"
document.getElementById('loginBtn').addEventListener('click', async () => {
	const email = document.getElementById('email').value
	const password = document.getElementById('password').value

	try {
		await signInWithEmailAndPassword(auth, email, password)
		// Редирект на index.html, который в той же папке view/
		window.location.href = 'index.html'
	} catch (error) {
		alert(error.message)
	}
})
