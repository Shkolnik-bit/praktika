// ── contractors.js (ViewModel) ────────────────────────────────────────────────
// Точка входа страницы контрагентов. Только:
//   1. Загружает данные через сервисы
//   2. Передаёт в Model для обработки
//   3. Передаёт результат в View для отображения

import {
	addItem,
	deleteItem,
	getContractors,
	getSales,
	updateItem,
} from '../services/firebaseService.js'
import { normalizeDates } from '../services/Utils.js'
import {
	filterContractors,
	findTopContractor,
	getContractorStats,
	sortByProfit,
} from '../models/Contractorsmodel.js'
import {
	renderKPI,
	renderTable,
	showError,
	showLoading,
} from '../view/Contractorsview.js'

// ── СОСТОЯНИЕ ─────────────────────────────────────────────────────────────────
let allContractors = []
let allSales = []
let editingId = null
let deletingId = null

// ── СТАРТ ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
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

	// ── ПОИСК ─────────────────────────────────────────────────────────────────
	document.getElementById('searchInput').addEventListener('input', function () {
		const filtered = filterContractors(allContractors, this.value)
		refreshTable(filtered)
	})

	// ── ДОБАВИТЬ ──────────────────────────────────────────────────────────────
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

	// ── СОХРАНИТЬ ─────────────────────────────────────────────────────────────
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

	// ── УДАЛЕНИЕ ──────────────────────────────────────────────────────────────
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

// ── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ───────────────────────────────────────────────────
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

function openDelete(id) {
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

// Подготавливает строки с посчитанной статистикой и передаёт в View
function refreshTable(contractors) {
	const topName = findTopContractor(contractors, allSales)
	renderKPI({ total: contractors.length, topName })

	// Model: сортируем и добавляем статистику к каждому контрагенту
	const sorted = sortByProfit(contractors, allSales)
	const rows = sorted.map(c => ({
		...c,
		...getContractorStats(c.name, allSales),
	}))

	renderTable(rows, { onEdit: openEdit, onDelete: openDelete })
}

async function reloadData() {
	const [rawC, rawS] = await Promise.all([getContractors(), getSales()])
	allContractors = rawC
	allSales = normalizeDates(rawS)
	refreshTable(allContractors)
}