// ── AuthViewModel.js ─────────────────────────────────────────────────────────
// Логика формы авторизации/регистрации
// Firebase уже инициализирован в firebaseService.js — дублирование убрано

import { login, register } from '../../services/firebaseService.js'
import { navigate, Routes } from '../services/router.js'

// ── DOM ───────────────────────────────────────────────────────────────────────
const formTitle = document.getElementById('formTitle')
const submitBtn = document.getElementById('submitBtn')
const toggleBtn = document.getElementById('toggleMode')
const toggleText = document.getElementById('toggleText')
const authForm = document.getElementById('authForm')
const authError = document.getElementById('authError')

let isLoginMode = true

// ── ПЕРЕКЛЮЧЕНИЕ РЕЖИМА ───────────────────────────────────────────────────────
toggleBtn.addEventListener('click', () => {
	isLoginMode = !isLoginMode
	formTitle.textContent = isLoginMode ? 'С возвращением!' : 'Регистрация'
	submitBtn.textContent = isLoginMode ? 'Войти' : 'Создать аккаунт'
	toggleText.textContent = isLoginMode ? 'Нет аккаунта?' : 'Уже есть аккаунт?'
	toggleBtn.textContent = isLoginMode ? 'Зарегистрироваться' : 'Войти'
	authError.style.display = 'none'
})

// ── SUBMIT ────────────────────────────────────────────────────────────────────
authForm.addEventListener('submit', async e => {
	e.preventDefault()

	const email = document.getElementById('email').value.trim()
	const password = document.getElementById('password').value.trim()

	if (!email || !password) {
		showError('Заполните все поля')
		return
	}

	submitBtn.disabled = true
	submitBtn.textContent = '⏳ Загрузка...'

	try {
		isLoginMode ? await login(email, password) : await register(email, password)
		const role = user?.role || null
if (role === 'admin') navigate(Routes.DASHBOARD)
else if (role === 'cashier') navigate(Routes.SALES)
else navigate(Routes.FORBIDDEN)
	} catch (err) {
		showError(getErrorMessage(err.code))
	} finally {
		submitBtn.disabled = false
		submitBtn.textContent = isLoginMode ? 'Войти' : 'Создать аккаунт'
	}
})

// ── ХЕЛПЕРЫ ───────────────────────────────────────────────────────────────────
function showError(msg) {
	authError.textContent = msg
	authError.style.display = 'block'
}

function getErrorMessage(code) {
	const messages = {
		'auth/user-not-found': 'Пользователь не найден',
		'auth/wrong-password': 'Неверный пароль',
		'auth/email-already-in-use': 'Email уже используется',
		'auth/weak-password': 'Пароль слишком короткий (мин. 6 символов)',
		'auth/invalid-email': 'Неверный формат email',
		'auth/invalid-credential': 'Неверный email или пароль',
	}
	return messages[code] || 'Ошибка авторизации. Попробуйте снова.'
}
