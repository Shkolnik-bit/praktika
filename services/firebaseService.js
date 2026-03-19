import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import {
	createUserWithEmailAndPassword,
	getAuth,
	onAuthStateChanged,
	signInWithEmailAndPassword,
	signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	getFirestore,
	setDoc,
	updateDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

const firebaseConfig = {
	apiKey: 'AIzaSyD_mvSHO3Mt_lk4iM8gIMCoqfK63-3Qvis',
	authDomain: 'praktikask-caa0b.firebaseapp.com',
	projectId: 'praktikask-caa0b',
	storageBucket: 'praktikask-caa0b.firebasestorage.app',
	messagingSenderId: '638525976207',
	appId: '1:638525976207:web:865c01a5b7981e0d7a8afa',
	measurementId: 'G-L2B8MK8RTV',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export { auth }

// ── РОЛИ ─────────────────────────────────────────────────────────────────────
// Текущий пользователь кэшируется в памяти: { uid, email, name, role }
// Роли: 'admin' — полный доступ, 'manager' — без удаления
let _currentUser = null

export function getCurrentUser() {
	return _currentUser
}

export function canDelete() {
	return _currentUser?.role === 'admin'
}

export function isAdmin() {
	return _currentUser?.role === 'admin'
}

// Загружает профиль пользователя из Firestore users/{uid}
// Если документа нет — создаёт его с ролью 'manager'
async function loadUserProfile(firebaseUser) {
	const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
	if (snap.exists()) {
		_currentUser = {
			uid: firebaseUser.uid,
			email: firebaseUser.email,
			...snap.data(),
		}
	} else {
		// Первый вход: создаём запись менеджера.
		// Чтобы назначить админа — в Firestore Console найдите users/{uid} и поменяйте role на 'admin'
		const newUser = {
			email: firebaseUser.email,
			name: firebaseUser.email.split('@')[0],
			role: null,
		}
		await setDoc(doc(db, 'users', firebaseUser.uid), newUser)
		_currentUser = { uid: firebaseUser.uid, ...newUser }
	}
	return _currentUser
}

// ── АУТЕНТИФИКАЦИЯ ────────────────────────────────────────────────────────────

// Логин — загружает роль из Firestore и возвращает { uid, email, name, role }
export async function login(email, password) {
	const cred = await signInWithEmailAndPassword(auth, email, password)
	return await loadUserProfile(cred.user)
}

export async function register(email, password) {
	return await createUserWithEmailAndPassword(auth, email, password)
}

// Логаут — сбрасывает кэш и редиректит на логин
export async function logout() {
	_currentUser = null
	await signOut(auth)
	window.location.href = '/login.html'
}

// Вызывается при старте каждой защищённой страницы.
// Если пользователь не залогинен — редиректит на /login.html
// Возвращает Promise<{ uid, email, name, role }>
export function requireAuth() {
	return new Promise((resolve, reject) => {
		onAuthStateChanged(auth, async firebaseUser => {
			if (!firebaseUser) {
				window.location.href = '/login.html'
				return
			}
			try {
				const user = await loadUserProfile(firebaseUser)
				resolve(user)
			} catch (e) {
				reject(e)
			}
		})
	})
}

// ── УНИВЕРСАЛЬНЫЕ ХЕЛПЕРЫ ─────────────────────────────────────────────────────

export async function getAll(col) {
	const snap = await getDocs(collection(db, col))
	return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addItem(col, data) {
	const ref = await addDoc(collection(db, col), data)
	return ref.id
}

export async function updateItem(col, id, data) {
	await updateDoc(doc(db, col, id), data)
}

export async function deleteItem(col, id) {
	await deleteDoc(doc(db, col, id))
}

// ── ХЕЛПЕР: Firestore Timestamp → Date ───────────────────────────────────────
function tsToDate(val) {
	if (!val) return null
	if (val?.toDate) return val.toDate()
	return new Date(val)
}

// ── СПЕЦИАЛИЗИРОВАННЫЕ ЗАПРОСЫ ────────────────────────────────────────────────

export async function getGoods(filters = {}) {
	const all = await getAll('goods')
	return all.filter(g => {
		const d = tsToDate(g.saleDate)
		return (
			(!filters.contractor || g.contractor === filters.contractor) &&
			(!filters.minRating || g.rating >= filters.minRating) &&
			(!filters.from || (d && d >= new Date(filters.from))) &&
			(!filters.to || (d && d <= new Date(filters.to)))
		)
	})
}

export async function getSales(filters = {}) {
	const all = await getAll('sales')
	return all.filter(g => {
		const d = tsToDate(g.saleDate)
		return (
			(!filters.contractor || g.contractor === filters.contractor) &&
			(!filters.from || (d && d >= new Date(filters.from))) &&
			(!filters.to || (d && d <= new Date(filters.to)))
		)
	})
}

export async function getContractors() {
	return getAll('contractors')
}
