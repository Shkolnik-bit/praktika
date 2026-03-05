import { initializeApp } from 'firebase/app'
import {
	createUserWithEmailAndPassword,
	getAuth,
	signInWithEmailAndPassword,
	signOut,
} from 'firebase/auth'

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

// Вход
export async function login(email, password) {
	return await signInWithEmailAndPassword(auth, email, password)
}

// Регистрация
export async function register(email, password) {
	return await createUserWithEmailAndPassword(auth, email, password)
}

// Выход
export async function logout() {
	return await signOut(auth)
}

export { auth }
