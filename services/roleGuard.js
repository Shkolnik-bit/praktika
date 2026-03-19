// ── roleGuard.js ─────────────────────────────────────────────────────────────
// Подключи этот файл к каждой HTML-странице одной строкой:
//   <script type="module" src="../services/roleGuard.js"></script>

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import {
	getAuth,
	onAuthStateChanged,
	signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import {
	doc,
	getDoc,
	getFirestore,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

const firebaseConfig = {
	apiKey: 'AIzaSyD_mvSHO3Mt_lk4iM8gIMCoqfK63-3Qvis',
	authDomain: 'praktikask-caa0b.firebaseapp.com',
	projectId: 'praktikask-caa0b',
	storageBucket: 'praktikask-caa0b.firebasestorage.app',
	messagingSenderId: '638525976207',
	appId: '1:638525976207:web:865c01a5b7981e0d7a8afa',
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
const auth = getAuth(app)
const db   = getFirestore(app)

const path = window.location.pathname
const isLoginPage     = path.endsWith('login.html')
const isSalesPage     = path.endsWith('sales.html')
const is403Page       = path.endsWith('403.html')
const isDashboard     = path.endsWith('index.html') || path === '/'
const isAdminOnlyPage =
	isDashboard ||
	path.endsWith('goods.html') ||
	path.endsWith('contractors.html') ||
	path.endsWith('reports.html')

// ── Страница входа ────────────────────────────────────────────────────────────
// Подписываемся ОДИН РАЗ — только чтобы очистить старую сессию при загрузке.
// Сразу отписываемся, чтобы не мешать событию после свежего входа.
if (isLoginPage) {
	const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
		unsubscribe()
		if (firebaseUser) {
			await signOut(auth)
		}
	})
}

// ── Вспомогательные функции ───────────────────────────────────────────────────
async function getUserRole(uid) {
	try {
		const snap = await getDoc(doc(db, 'users', uid))
		return snap.exists() ? (snap.data().role || null) : null
	} catch {
		return null
	}
}

function applyCashierRestrictions() {
	// Скрываем пункты меню сайдбара которые кассиру недоступны
	;['dashboard', 'goods', 'contractors', 'reports'].forEach(page => {
		document.querySelectorAll(`.nav-item[data-page="${page}"]`)
			.forEach(el => (el.style.display = 'none'))
	})

	document.querySelectorAll('.nav-group-label').forEach(label => {
		const next = label.nextElementSibling
		if (!next || next.style.display === 'none') label.style.display = 'none'
	})

	// Кнопка «← Главная» в топбаре (у неё убран href в sales.html, id="back-btn")
	// Вешаем клик → редирект на логин
	const backBtn = document.getElementById('back-btn') || document.querySelector('.btn-back')
	if (backBtn) {
		backBtn.addEventListener('click', e => {
			e.preventDefault()
			window.location.href = '/view/login.html'
		})
	}

	// Скрываем кнопки удаления
	function hideDeleteBtns() {
		document.querySelectorAll('.delete-btn, [data-action="delete"]')
			.forEach(btn => (btn.style.display = 'none'))
	}
	hideDeleteBtns()
	new MutationObserver(hideDeleteBtns)
		.observe(document.body, { childList: true, subtree: true })
}

// ── Защищённые страницы ───────────────────────────────────────────────────────
if (!isLoginPage && !is403Page) {
	onAuthStateChanged(auth, async firebaseUser => {

		if (!firebaseUser) {
			window.location.href = '/view/login.html'
			return
		}

		const role = await getUserRole(firebaseUser.uid)

		// Нет роли или client → 403
		if (!role || role === 'client') {
			window.location.href = '/view/403.html'
			return
		}

		// Кассир на запрещённой странице → продажи
		if (role === 'cashier' && isAdminOnlyPage) {
			window.location.href = '/view/sales.html'
			return
		}

		// Кассир на странице продаж → скрываем лишнее и перехватываем кнопки
		if (role === 'cashier' && isSalesPage) {
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', applyCashierRestrictions)
			} else {
				applyCashierRestrictions()
			}
			return
		}

		// Администратор на странице продаж → btn-back ведёт на дашборд
		if (role === 'admin' && isSalesPage) {
			const backBtn = document.getElementById('back-btn') || document.querySelector('.btn-back')
			if (backBtn && !backBtn.getAttribute('href')) {
				backBtn.addEventListener('click', e => {
					e.preventDefault()
					window.location.href = '/view/index.html'
				})
			}
		}
	})
}
