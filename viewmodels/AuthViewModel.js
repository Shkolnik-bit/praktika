import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import {
	createUserWithEmailAndPassword,
	getAuth,
	signInWithEmailAndPassword,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'

// 🔹 Firebase конфиг
const firebaseConfig = {
	apiKey: 'AIzaSyD_mvSHO3Mt_lk4iM8gIMCoqfK63-3Qvis',
	authDomain: 'praktikask-caa0b.firebaseapp.com',
	projectId: 'praktikask-caa0b',
	storageBucket: 'praktikask-caa0b.firebasestorage.app',
	messagingSenderId: '638525976207',
	appId: '1:638525976207:web:865c01a5b7981e0d7a8afa',
}

// 🔹 Инициализация Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

// 🔹 Элементы формы
const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const submitBtn = document.getElementById('submitBtn')
const toggleBtn = document.getElementById('toggleMode')
const toggleText = document.getElementById('toggleText')
const formTitle = document.getElementById('formTitle')
const authForm = document.getElementById('authForm')

let isLoginMode = true

// 🔹 Переключение режима Вход / Регистрация
toggleBtn.addEventListener('click', () => {
	isLoginMode = !isLoginMode

	if (isLoginMode) {
		formTitle.textContent = 'Авторизация'
		submitBtn.textContent = 'Войти'
		toggleText.textContent = 'Нет аккаунта?'
		toggleBtn.textContent = 'Зарегистрироваться'
	} else {
		formTitle.textContent = 'Регистрация'
		submitBtn.textContent = 'Создать аккаунт'
		toggleText.textContent = 'Уже есть аккаунт?'
		toggleBtn.textContent = 'Войти'
	}
})

// 🔹 Обработка submit формы
authForm.addEventListener('submit', async e => {
	e.preventDefault() // предотвращаем перезагрузку страницы

	const email = emailInput.value.trim()
	const password = passwordInput.value.trim()

	if (!email || !password) {
		alert('Заполните все поля')
		return
	}

	try {
		if (isLoginMode) {
			// Вход
			await signInWithEmailAndPassword(auth, email, password)
		} else {
			// Регистрация
			await createUserWithEmailAndPassword(auth, email, password)
		}

		// После успешного входа/регистрации
		window.location.href = 'index.html'
	} catch (error) {
		alert(error.message)
	}
})
