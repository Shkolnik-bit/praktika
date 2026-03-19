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
const isAdminOnlyPage =
	path.endsWith('index.html') ||
	path.endsWith('goods.html') ||
	path.endsWith('contractors.html') ||
	path.endsWith('reports.html') ||
	path === '/'

// ── Страница входа — отдельная логика ────────────────────────────────────────
if (isLoginPage) {
	// Подписываемся ОДИН РАЗ — только чтобы проверить начальное состояние.
	// Сразу отписываемся (unsubscribe), чтобы не мешать событию после входа.
	// AuthViewModel сам обработает навигацию после успешного login().
	const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
		unsubscribe() // отписались — больше не слушаем это событие
		if (firebaseUser) {
			// Был залогинен (например кассир открыл /login.html) — выходим,
			// показываем чистую форму входа
			await signOut(auth)
		}
		// firebaseUser = null → просто показываем форму, ничего не делаем
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
	;['dashboard', 'goods', 'contractors', 'reports'].forEach(page => {
		document.querySelectorAll(`.nav-item[data-page="${page}"]`)
			.forEach(el => (el.style.display = 'none'))
	})

	document.querySelectorAll('.nav-group-label').forEach(label => {
		const next = label.nextElementSibling
		if (!next || next.style.display === 'none') label.style.display = 'none'
	})

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

		if (!role || role === 'client') {
			window.location.href = '/view/403.html'
			return
		}

		if (role === 'cashier' && isAdminOnlyPage) {
			window.location.href = '/view/sales.html'
			return
		}

		if (role === 'cashier' && isSalesPage) {
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', applyCashierRestrictions)
			} else {
				applyCashierRestrictions()
			}
		}
	})
}
