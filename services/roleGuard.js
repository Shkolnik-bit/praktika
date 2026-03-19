// ── roleGuard.js ─────────────────────────────────────────────────────────────
// Подключи этот файл к каждой HTML-странице одной строкой:
//   <script type="module" src="../services/roleGuard.js"></script>
//
// Он сам определяет страницу, проверяет роль и делает всё нужное:
//   - нет роли → 403.html
//   - кассир на чужой странице → sales.html
//   - кассир на своей странице → скрывает лишние кнопки и пункты меню
//   - на странице входа и уже залогинен → редирект по роли

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import {
	getAuth,
	onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import {
	doc,
	getDoc,
	getFirestore,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

// ── Конфиг (такой же как в firebaseService.js) ────────────────────────────────
const firebaseConfig = {
	apiKey: 'AIzaSyD_mvSHO3Mt_lk4iM8gIMCoqfK63-3Qvis',
	authDomain: 'praktikask-caa0b.firebaseapp.com',
	projectId: 'praktikask-caa0b',
	storageBucket: 'praktikask-caa0b.firebasestorage.app',
	messagingSenderId: '638525976207',
	appId: '1:638525976207:web:865c01a5b7981e0d7a8afa',
}

// Инициализируем только если ещё не было инициализации (firebaseService мог уже сделать это)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// ── Определяем текущую страницу ───────────────────────────────────────────────
const path = window.location.pathname
const isLoginPage    = path.endsWith('login.html')
const isSalesPage    = path.endsWith('sales.html')
const isDashboard    = path.endsWith('index.html') || path.endsWith('/')
const is403Page      = path.endsWith('403.html')

// Страницы только для администратора
const isAdminOnlyPage = isDashboard ||
	path.endsWith('goods.html') ||
	path.endsWith('contractors.html') ||
	path.endsWith('reports.html')

// ── Редирект по роли после входа ──────────────────────────────────────────────
function redirectByRole(role) {
	if (role === 'admin') {
		window.location.href = '/view/index.html'
	} else if (role === 'cashier') {
		window.location.href = '/view/sales.html'
	} else {
		window.location.href = '/view/403.html'
	}
}

// ── Применяем ограничения для кассира на странице продаж ─────────────────────
function applyCashierRestrictions() {
	// Скрываем пункты меню которые кассиру недоступны
	const hiddenPages = ['dashboard', 'goods', 'contractors', 'reports']
	hiddenPages.forEach(page => {
		document.querySelectorAll(`.nav-item[data-page="${page}"]`)
			.forEach(el => el.style.display = 'none')
	})

	// Скрываем подписи разделов если под ними ничего не осталось
	document.querySelectorAll('.nav-group-label').forEach(label => {
		const next = label.nextElementSibling
		if (!next || next.style.display === 'none') {
			label.style.display = 'none'
		}
	})

	// Скрываем кнопки удаления — используем MutationObserver,
	// потому что таблица может рендериться позже
	function hideDeleteBtns() {
		document.querySelectorAll('.delete-btn, .btn-delete, [class*="delete"]')
			.forEach(btn => {
				if (btn.tagName === 'BUTTON' || btn.tagName === 'A') {
					btn.style.display = 'none'
				}
			})
	}

	hideDeleteBtns()

	// Следим за изменениями DOM (таблица перерисовывается при фильтрах)
	const observer = new MutationObserver(hideDeleteBtns)
	observer.observe(document.body, { childList: true, subtree: true })
}

// ── Загружаем роль из Firestore ───────────────────────────────────────────────
async function getUserRole(uid) {
	try {
		const snap = await getDoc(doc(db, 'users', uid))
		return snap.exists() ? (snap.data().role || null) : null
	} catch {
		return null
	}
}

// ── Главная логика ────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async firebaseUser => {

	// ── Страница входа ────────────────────────────────────────────────────────
	if (isLoginPage) {
		if (firebaseUser) {
			// Уже залогинен — редиректим по роли сразу
			const role = await getUserRole(firebaseUser.uid)
			redirectByRole(role)
		}
		// Не залогинен — просто остаёмся на странице входа
		return
	}

	// ── Страница 403 — дополнительных проверок не нужно ──────────────────────
	if (is403Page) return

	// ── Все остальные страницы (защищённые) ──────────────────────────────────
	if (!firebaseUser) {
		// Не залогинен → на страницу входа
		window.location.href = '/view/login.html'
		return
	}

	const role = await getUserRole(firebaseUser.uid)

	// Нет роли → страница 403
	if (!role) {
		window.location.href = '/view/403.html'
		return
	}

	// Кассир пытается зайти на страницу только для администратора
	if (role === 'cashier' && isAdminOnlyPage) {
		window.location.href = '/view/sales.html'
		return
	}

	// Кассир на своей странице (продажи) — скрываем лишнее
	if (role === 'cashier' && isSalesPage) {
		// DOM может ещё не загрузиться — ждём
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', applyCashierRestrictions)
		} else {
			applyCashierRestrictions()
		}
	}
})
