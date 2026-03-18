// ── contractors.js (ViewModel) ────────────────────────────────────────────────

import {
	addItem, // НОВОЕ
	canDelete,
	deleteItem,
	getContractors,
	getSales,
	requireAuth,
	updateItem,
} from '../../services/firebaseService.js'
import { normalizeDates } from '../../services/utils.js'
import {
	filterContractors,
	findTopContractor,
	getContractorStats,
	sortByProfit,
} from '/models/contractorsModel.js'
import {
	renderKPI,
	renderTable,
	showError,
	showLoading,
} from '/view/contractorsView.js'

let allContractors = []
let allSales = []
let editingId = null
let deletingId = null

document.addEventListener('DOMContentLoaded', async () => {
	// НОВОЕ: проверяем сессию
	let currentUser
	try {
		currentUser = await requireAuth()
	} catch (e) {
		return
	}

	// НОВОЕ: показываем имя и роль в сайдбаре
	const nameEl = document.getElementById('sidebar-user-name')
	const roleEl = document.getElementById('sidebar-user-role')
	if (nameEl) nameEl.textContent = currentUser.name || currentUser.email
	if (roleEl)
		roleEl.textContent =
			currentUser.role === 'admin' ? 'Администратор' : 'Менеджер'

	// НОВОЕ: кнопка логаута
	document.getElementById('logoutBtn')?.addEventListener('click', async () => {
		const { logout } = await import('../../services/firebaseService.js')
		await logout()
	})

	document.getElementById('contractors-date').textContent =
		new Intl.DateTimeFormat('ru-RU', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		}).format(new Date())

	showLoading()
	try {
		const [rawC, rawS] = await Promise.all([getContractors(), getSales()])
		allContractors = rawC
		allSales = normalizeDates(rawS)
		refreshTable(allContractors)
	} catch (e) {
		showError(e.message)
	}

	document.getElementById('searchInput').addEventListener('input', function () {
		refreshTable(filterContractors(allContractors, this.value))
	})

	document.getElementById('addBtn').addEventListener('click', () => {
		editingId = null
		document.getElementById('modal-title').textContent = '➕ Новый контрагент'
		clearModal()
		document.getElementById('contractorModal').classList.add('show')
	})
	document.getElementById('modalClose').addEventListener('click', closeModal)
	document.getElementById('modalCancel').addEventListener('click', closeModal)
	document.getElementById('contractorModal').addEventListener('click', e => {
		if (e.target.id === 'contractorModal') closeModal()
	})

	document.getElementById('modalSave').addEventListener('click', async () => {
		const name = document.getElementById('m-name').value.trim()
		const email = document.getElementById('m-email').value.trim()
		const phone = document.getElementById('m-phone').value.trim()
		if (!name) {
			alert('Введите название контрагента')
			return
		}
		const btn = document.getElementById('modalSave')
		btn.disabled = true
		btn.textContent = 'Сохранение...'
		try {
			editingId
				? await updateItem('contractors', editingId, { name, email, phone })
				: await addItem('contractors', { name, email, phone })
			await reloadData()
			closeModal()
		} catch (e) {
			alert('Ошибка: ' + e.message)
		} finally {
			btn.disabled = false
			btn.textContent = 'Сохранить'
		}
	})

	document.getElementById('confirmCancel').addEventListener('click', () => {
		deletingId = null
		document.getElementById('confirmModal').classList.remove('show')
	})
	document.getElementById('confirmModal').addEventListener('click', e => {
		if (e.target.id === 'confirmModal') {
			deletingId = null
			document.getElementById('confirmModal').classList.remove('show')
		}
	})
	document
		.getElementById('confirmDelete')
		.addEventListener('click', async () => {
			if (!deletingId) return
			// НОВОЕ: двойная проверка роли
			if (!canDelete()) {
				alert('Недостаточно прав для удаления')
				return
			}
			const btn = document.getElementById('confirmDelete')
			btn.disabled = true
			btn.textContent = 'Удаление...'
			try {
				await deleteItem('contractors', deletingId)
				await reloadData()
			} catch (e) {
				alert('Ошибка: ' + e.message)
			} finally {
				deletingId = null
				btn.disabled = false
				btn.textContent = 'Удалить'
				document.getElementById('confirmModal').classList.remove('show')
			}
		})
})

function openEdit(id) {
	const c = allContractors.find(x => x.id === id)
	if (!c) return
	editingId = id
	document.getElementById('modal-title').textContent =
		'✏️ Редактировать контрагента'
	document.getElementById('m-name').value = c.name || ''
	document.getElementById('m-email').value = c.email || ''
	document.getElementById('m-phone').value = c.phone || ''
	document.getElementById('contractorModal').classList.add('show')
}

// НОВОЕ: проверяем роль перед показом модалки удаления
function openDelete(id) {
	if (!canDelete()) {
		alert('Удаление доступно только администратору')
		return
	}
	const c = allContractors.find(x => x.id === id)
	if (!c) return
	deletingId = id
	document.getElementById('confirm-text').textContent =
		`«${c.name}» будет удалён. Это действие нельзя отменить.`
	document.getElementById('confirmModal').classList.add('show')
}

function closeModal() {
	editingId = null
	document.getElementById('contractorModal').classList.remove('show')
	clearModal()
}
function clearModal() {
	document.getElementById('m-name').value = ''
	document.getElementById('m-email').value = ''
	document.getElementById('m-phone').value = ''
}

// НОВОЕ: передаём canDelete() в renderTable
function refreshTable(contractors) {
	const topName = findTopContractor(contractors, allSales)
	renderKPI({ total: contractors.length, topName })
	const sorted = sortByProfit(contractors, allSales)
	const rows = sorted.map(c => ({
		...c,
		...getContractorStats(c.name, allSales),
	}))
	renderTable(rows, {
		onEdit: openEdit,
		onDelete: openDelete,
		canDelete: canDelete(),
	})
}

async function reloadData() {
	const [rawC, rawS] = await Promise.all([getContractors(), getSales()])
	allContractors = rawC
	allSales = normalizeDates(rawS)
	refreshTable(allContractors)
}
