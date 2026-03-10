import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import {
	createUserWithEmailAndPassword,
	getAuth,
	signInWithEmailAndPassword,
	signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDocs,
	getFirestore,
	updateDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

const firebaseConfig = {
	apiKey: 'AIzaSy...',
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

// ── АУТЕНТИФИКАЦИЯ ────────────────────────────────────────────────────────────

export async function login(email, password) {
	return await signInWithEmailAndPassword(auth, email, password)
}

export async function register(email, password) {
	return await createUserWithEmailAndPassword(auth, email, password)
}

export async function logout() {
	return await signOut(auth)
}

export { auth }

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
	if (val?.toDate) return val.toDate() // Firestore Timestamp
	return new Date(val) // строка / число
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
