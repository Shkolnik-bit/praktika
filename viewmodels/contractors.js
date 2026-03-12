import {
	addItem,
	deleteItem,
	getContractors,
	getSales,
	updateItem,
} from '../../services/firebaseService.js'

// ── СОСТОЯНИЕ ─────────────────────────────────────────────────────────────────
let allContractors = [] // данные из Firestore (contractors)
let enriched = [] // contractors + orders/revenue из sales
let editingId = null
let deletingId = null

// ── ИНИЦИАЛИЗАЦИЯ ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
	document.getElementById('page-date').textContent = new Intl.DateTimeFormat(
		'ru-RU',
		{ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
	).format(new Date())

	showLoading()

	try {
		await loadAll()
	} catch (e) {
		showError(e.message)
	}

	// ── ПОИСК ─────────────────────────────────────────────────────────────────
	document.getElementById('searchInput').addEventListener('input', () => {
		const q = document.getElementById('searchInput').value.toLowerCase()
		const filtered = enriched.filter(
			c =>
				c.name.toLowerCase().includes(q) ||
				(c.email || '').toLowerCase().includes(q) ||
				(c.phone || '').includes(q),
		)
		render(filtered)
	})

	// ── СБРОС ─────────────────────────────────────────────────────────────────
	document.getElementById('resetBtn').addEventListener('click', () => {
		document.getElementById('searchInput').value = ''
		render(enriched)
	})

	// ── ОТКРЫТЬ МОДАЛКУ «ДОБАВИТЬ» ────────────────────────────────────────────
	document.getElementById('addBtn').addEventListener('click', () => {
		editingId = null
		document.getElementById('modal-title').textContent = '➕ Новый контрагент'
		clearModal()
		document.getElementById('contractorModal').classList.add('show')
	})

	// ── ЗАКРЫТЬ МОДАЛКУ ───────────────────────────────────────────────────────
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
			alert('Введите название / ФИО контрагента')
			return
		}

		const btn = document.getElementById('modalSave')
		btn.disabled = true
		btn.textContent = 'Сохранение...'

		try {
			if (editingId) {
				await updateItem('contractors', editingId, { name, email, phone })
			} else {
				await addItem('contractors', { name, email, phone })
			}
			await loadAll()
			closeModal()
		} catch (e) {
			alert('Ошибка: ' + e.message)
		} finally {
			btn.disabled = false
			btn.textContent = 'Сохранить'
		}
	})

	// ── ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ ────────────────────────────────────────────────
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
				await loadAll()
			} catch (e) {
				alert('Ошибка удаления: ' + e.message)
			} finally {
				deletingId = null
				btn.disabled = false
				btn.textContent = 'Удалить'
				document.getElementById('confirmModal').classList.remove('show')
			}
		})
})

// ── ЗАГРУЗКА И ОБОГАЩЕНИЕ ДАННЫХ ──────────────────────────────────────────────
async function loadAll() {
	const [contractors, sales] = await Promise.all([getContractors(), getSales()])

	allContractors = contractors

	// Нормализация: убираем кавычки-ёлочки «», "", пробелы для точного сравнения
	const norm = str => (str || '').replace(/[«»""'\s]/g, '').toLowerCase()

	// Считаем orders и revenue для каждого контрагента из sales
	enriched = contractors.map(c => {
		const mySales = sales.filter(s => norm(s.contractor) === norm(c.name))
		const orders = mySales.length
		const revenue = mySales.reduce(
			(sum, s) => sum + s.price - (s.purchasePrice || 0),
			0,
		)
		return { ...c, orders, revenue }
	})

	render(enriched)
}

// ── РЕНДЕР ────────────────────────────────────────────────────────────────────
function render(contractors) {
	const total = contractors.length
	const revenue = contractors.reduce((s, c) => s + c.revenue, 0)
	const orders = contractors.reduce((s, c) => s + c.orders, 0)
	const top = [...contractors].sort((a, b) => b.revenue - a.revenue)[0]

	document.getElementById('kpi-total').textContent = total + ' шт.'
	document.getElementById('kpi-revenue').textContent =
		revenue.toLocaleString('ru-RU') + ' ₽'
	document.getElementById('kpi-orders').textContent = orders + ' шт.'
	document.getElementById('kpi-top').textContent = top ? top.name : '—'
	document.getElementById('count-badge').textContent = total + ' контрагентов'

	renderCards(contractors)
	renderTable(contractors)
}

// ── КАРТОЧКИ ──────────────────────────────────────────────────────────────────
function renderCards(contractors) {
	const grid = document.getElementById('contractors-grid')

	if (contractors.length === 0) {
		grid.innerHTML = ''
		return
	}

	grid.innerHTML = contractors
		.map(c => {
			const initials = c.name
				.split(' ')
				.map(w => w[0])
				.join('')
				.slice(0, 2)
				.toUpperCase()
			return `<div class="contractor-card">
			<div class="contractor-card-header">
				<div class="contractor-avatar">${initials}</div>
				<div>
					<div class="contractor-name">${c.name}</div>
					<div class="contractor-email">${c.email || '—'}</div>
				</div>
			</div>
			<div class="contractor-stats">
				<div class="stat-box">
					<div class="stat-box-label">Заказов</div>
					<div class="stat-box-val">${c.orders}</div>
				</div>
				<div class="stat-box">
					<div class="stat-box-label">Прибыль</div>
					<div class="stat-box-val" style="font-size:13px">${c.revenue.toLocaleString('ru-RU')} ₽</div>
				</div>
			</div>
			<div class="contractor-footer">
				<div class="contractor-phone">${c.phone || '—'}</div>
				<div class="actions-cell">
					<button class="action-btn edit-btn" data-id="${c.id}" title="Редактировать">✏️</button>
					<button class="action-btn delete delete-btn" data-id="${c.id}" title="Удалить">🗑</button>
				</div>
			</div>
		</div>`
		})
		.join('')

	attachCardEvents()
}

// ── ТАБЛИЦА ───────────────────────────────────────────────────────────────────
function renderTable(contractors) {
	const tbody = document.getElementById('contractors-tbody')

	if (contractors.length === 0) {
		tbody.innerHTML = `<tr><td colspan="7">
			<div class="empty-state">
				<div class="empty-state-icon">🏢</div>
				Контрагенты не найдены
			</div>
		</td></tr>`
		return
	}

	tbody.innerHTML = contractors
		.map(
			(c, i) => `<tr>
		<td style="color:var(--text-soft)">${i + 1}</td>
		<td><b>${c.name}</b></td>
		<td style="color:var(--text-soft)">${c.email || '—'}</td>
		<td style="color:var(--text-soft)">${c.phone || '—'}</td>
		<td>${c.orders}</td>
		<td style="font-weight:600;color:var(--text)">${c.revenue.toLocaleString('ru-RU')} ₽</td>
		<td>
			<div class="actions-cell">
				<button class="action-btn edit-btn" data-id="${c.id}" title="Редактировать">✏️</button>
				<button class="action-btn delete delete-btn" data-id="${c.id}" title="Удалить">🗑</button>
			</div>
		</td>
	</tr>`,
		)
		.join('')

	attachTableEvents()
}

// ── СОБЫТИЯ КНОПОК ────────────────────────────────────────────────────────────
function attachCardEvents() {
	document.querySelectorAll('#contractors-grid .edit-btn').forEach(btn => {
		btn.addEventListener('click', () => openEdit(btn.dataset.id))
	})
	document.querySelectorAll('#contractors-grid .delete-btn').forEach(btn => {
		btn.addEventListener('click', () => openDelete(btn.dataset.id))
	})
}

function attachTableEvents() {
	document.querySelectorAll('#contractors-tbody .edit-btn').forEach(btn => {
		btn.addEventListener('click', () => openEdit(btn.dataset.id))
	})
	document.querySelectorAll('#contractors-tbody .delete-btn').forEach(btn => {
		btn.addEventListener('click', () => openDelete(btn.dataset.id))
	})
}

// ── ОТКРЫТЬ РЕДАКТИРОВАНИЕ ────────────────────────────────────────────────────
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

// ── ОТКРЫТЬ ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ ───────────────────────────────────────────
function openDelete(id) {
	const c = allContractors.find(x => x.id === id)
	if (!c) return
	deletingId = id
	document.getElementById('confirm-text').textContent =
		`«${c.name}» будет удалён. Это действие нельзя отменить.`
	document.getElementById('confirmModal').classList.add('show')
}

// ── УТИЛИТЫ ───────────────────────────────────────────────────────────────────
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

function showLoading() {
	document.getElementById('contractors-tbody').innerHTML =
		`<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-soft)">⏳ Загрузка...</td></tr>`
	document.getElementById('contractors-grid').innerHTML = ''
}

function showError(msg) {
	document.getElementById('contractors-tbody').innerHTML =
		`<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--red)">❌ Ошибка: ${msg}</td></tr>`
}
