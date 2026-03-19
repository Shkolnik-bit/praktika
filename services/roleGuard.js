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

// Флаг: уже ли мы выходили при загрузке login.html
// Нужен чтобы не выходить СНОВА после того как пользователь только что вошёл
let loginPageSignedOut = false

function redirectByRole(role) {
	if (role === 'admin')        window.location.href = '/view/index.html'
	else if (role === 'cashier') window.location.href = '/view/sales.html'
	else                         window.location.href = '/view/403.html'
}

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

onAuthStateChanged(auth, async firebaseUser => {

	// ── Страница входа ────────────────────────────────────────────────────────
	if (isLoginPage) {
		if (firebaseUser && !loginPageSignedOut) {
			// Первое срабатывание: был залогинен (например кассир) — выходим,
			// чтобы можно было войти под другой ролью
			loginPageSignedOut = true
			await signOut(auth)
			// onAuthStateChanged сработает снова с firebaseUser=null → покажет форму
			return
		}
		// firebaseUser=null (после выхода) или уже вышли ранее (loginPageSignedOut=true)
		// В обоих случаях просто показываем форму входа — ничего не делаем
		return
	}

	// ── Страница 403 ──────────────────────────────────────────────────────────
	if (is403Page) return

	// ── Защищённые страницы ───────────────────────────────────────────────────
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