// ── AuthViewModel.js ─────────────────────────────────────────────────────────

// Исправлен путь импорта: viewmodels/ → ../services/ (один уровень вверх)
import { login, register, getCurrentUser } from '../services/firebaseService.js'
import { navigate, navigateByRole, Routes } from '../services/router.js'

const formTitle   = document.getElementById('formTitle')
const submitBtn   = document.getElementById('submitBtn')
const toggleBtn   = document.getElementById('toggleMode')
const toggleText  = document.getElementById('toggleText')
const authForm    = document.getElementById('authForm')
const authError   = document.getElementById('authError')
const authSuccess = document.getElementById('authSuccess')

let isLoginMode = true

// ── ПЕРЕКЛЮЧЕНИЕ РЕЖИМА ───────────────────────────────────────────────────────
toggleBtn.addEventListener('click', () => {
	isLoginMode = !isLoginMode
	formTitle.textContent   = isLoginMode ? 'С возвращением!' : 'Регистрация'
	submitBtn.textContent   = isLoginMode ? 'Войти' : 'Создать аккаунт'
	toggleText.textContent  = isLoginMode ? 'Нет аккаунта?' : 'Уже есть аккаунт?'
	toggleBtn.textContent   = isLoginMode ? 'Зарегистрироваться' : 'Войти'
	authError.style.display   = 'none'
	if (authSuccess) authSuccess.style.display = 'none'
})

// ── SUBMIT ────────────────────────────────────────────────────────────────────
authForm.addEventListener('submit', async e => {
	e.preventDefault()

	const email    = document.getElementById('email').value.trim()
	const password = document.getElementById('password').value.trim()

	if (!email || !password) {
		showError('Заполните все поля')
		return
	}

	submitBtn.disabled    = true
	submitBtn.textContent = '⏳ Загрузка...'
	authError.style.display = 'none'
	if (authSuccess) authSuccess.style.display = 'none'

	try {
		if (isLoginMode) {
			// Вход: loadUserProfile возвращает объект пользователя с ролью
			await login(email, password)
			const user = getCurrentUser()        // ← получаем текущего пользователя
			const role = user?.role || null
			navigateByRole(role)                 // ← редирект по роли через router.js
		} else {
			// Регистрация: новый аккаунт получает роль 'client'
			await register(email, password)
			const user = getCurrentUser()
			if (user?.role === 'client') {
				// Сразу показываем сообщение — доступ закрыт
				showSuccess('Аккаунт создан. Ваша роль — Клиент. Доступ закрыт.')
				setTimeout(() => navigate(Routes.FORBIDDEN), 2000)
			} else {
				navigateByRole(user?.role)
			}
		}
	} catch (err) {
		showError(getErrorMessage(err.code))
	} finally {
		submitBtn.disabled    = false
		submitBtn.textContent = isLoginMode ? 'Войти' : 'Создать аккаунт'
	}
})

// ── ХЕЛПЕРЫ ───────────────────────────────────────────────────────────────────
function showError(msg) {
	authError.textContent   = msg
	authError.style.display = 'block'
	if (authSuccess) authSuccess.style.display = 'none'
}

function showSuccess(msg) {
	if (!authSuccess) return
	authSuccess.textContent   = msg
	authSuccess.style.display = 'block'
	authError.style.display   = 'none'
}

function getErrorMessage(code) {
	const messages = {
		'auth/user-not-found':       'Пользователь не найден',
		'auth/wrong-password':       'Неверный пароль',
		'auth/email-already-in-use': 'Email уже используется',
		'auth/weak-password':        'Пароль слишком короткий (мин. 6 символов)',
		'auth/invalid-email':        'Неверный формат email',
		'auth/invalid-credential':   'Неверный email или пароль',
	}
	return messages[code] || 'Ошибка авторизации. Попробуйте снова.'
}
