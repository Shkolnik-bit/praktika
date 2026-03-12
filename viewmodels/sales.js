import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import {
	addItem,
	deleteItem,
	getSales,
	updateItem,
} from '../../services/firebaseService.js'

// ── СОСТОЯНИЕ ─────────────────────────────────────────────────────────────────
let allGoods = []
let editingId = null // null = добавление, string = редактирование
let deletingId = null

// ── ХЕЛПЕР: Firestore Timestamp → 'YYYY-MM-DD' ───────────────────────────────
function toDateStr(val) {
	if (!val) return ''
	if (val?.toDate) return val.toDate().toISOString().slice(0, 10)
	return String(val)
}

// ── ИНИЦИАЛИЗАЦИЯ ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
	document.getElementById('sales-date').textContent = new Intl.DateTimeFormat(
		'ru-RU',
		{ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
	).format(new Date())

	showLoading()

	try {
		const raw = await getSales()
		allGoods = raw.map(g => ({ ...g, saleDate: toDateStr(g.saleDate) }))
		fillContractorSelect()
		render(allGoods)
	} catch (e) {
		showError(e.message)
	}

	// ── ФИЛЬТРЫ ───────────────────────────────────────────────────────────────
	document
		.getElementById('applyBtn')
		.addEventListener('click', () => render(getFiltered()))

	document.getElementById('resetBtn').addEventListener('click', () => {
		document.getElementById('f-contractor').value = ''
		document.getElementById('f-from').value = ''
		document.getElementById('f-to').value = ''
		render(allGoods)
	})

	document.getElementById('exportBtn').addEventListener('click', () => {
		window.location.href = 'reports.html'
	})

	// ── ОТКРЫТЬ МОДАЛКУ «ДОБАВИТЬ» ────────────────────────────────────────────
	document.getElementById('addSaleBtn').addEventListener('click', () => {
		editingId = null
		document.getElementById('modal-title').textContent = '➕ Новая продажа'
		clearModal()
		document.getElementById('saleModal').classList.add('show')
	})

	// ── ЗАКРЫТЬ МОДАЛКУ ───────────────────────────────────────────────────────
	document.getElementById('modalClose').addEventListener('click', closeModal)
	document.getElementById('modalCancel').addEventListener('click', closeModal)
	document.getElementById('saleModal').addEventListener('click', e => {
		if (e.target.id === 'saleModal') closeModal()
	})

	// ── СОХРАНИТЬ (добавление или редактирование) ─────────────────────────────
	document.getElementById('modalSave').addEventListener('click', async () => {
		const name = document.getElementById('m-name').value.trim()
		const contractor = document.getElementById('m-contractor').value.trim()
		const price = Number(document.getElementById('m-price').value)
		const purchasePrice =
			Number(document.getElementById('m-purchase').value) || 0
		const rating = Number(document.getElementById('m-rating').value)
		const dateStr = document.getElementById('m-date').value

		if (!name || !contractor || !price || !rating || !dateStr) {
			alert('Заполните все обязательные поля')
			return
		}

		const btn = document.getElementById('modalSave')
		btn.disabled = true
		btn.textContent = 'Сохранение...'

		try {
			const saleDate = Timestamp.fromDate(new Date(dateStr))
			const data = { name, contractor, price, purchasePrice, rating, saleDate }

			if (editingId) {
				await updateItem('sales', editingId, data)
			} else {
				await addItem('sales', data)
			}

			const raw = await getSales()
			allGoods = raw.map(g => ({ ...g, saleDate: toDateStr(g.saleDate) }))
			fillContractorSelectFresh()
			render(allGoods)
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
				await deleteItem('sales', deletingId)
				const raw = await getSales()
				allGoods = raw.map(g => ({ ...g, saleDate: toDateStr(g.saleDate) }))
				fillContractorSelectFresh()
				render(allGoods)
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

// ── ОТКРЫТЬ РЕДАКТИРОВАНИЕ ────────────────────────────────────────────────────
function openEdit(id) {
	const sale = allGoods.find(g => g.id === id)
	if (!sale) return

	editingId = id
	document.getElementById('modal-title').textContent =
		'✏️ Редактировать продажу'
	document.getElementById('m-name').value = sale.name || ''
	document.getElementById('m-contractor').value = sale.contractor || ''
	document.getElementById('m-price').value = sale.price || ''
	document.getElementById('m-purchase').value = sale.purchasePrice || ''
	document.getElementById('m-rating').value = sale.rating || 5
	document.getElementById('m-date').value = sale.saleDate || ''
	document.getElementById('saleModal').classList.add('show')
}

// ── ОТКРЫТЬ ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ ───────────────────────────────────────────
function openDelete(id) {
	const sale = allGoods.find(g => g.id === id)
	if (!sale) return
	deletingId = id
	document.getElementById('confirm-text').textContent =
		`«${sale.name}» — ${sale.contractor}. Это действие нельзя отменить.`
	document.getElementById('confirmModal').classList.add('show')
}

// ── ЗАКРЫТЬ МОДАЛКУ ФОРМЫ ────────────────────────────────────────────────────
function closeModal() {
	editingId = null
	document.getElementById('saleModal').classList.remove('show')
	clearModal()
}

function clearModal() {
	document.getElementById('m-name').value = ''
	document.getElementById('m-contractor').value = ''
	document.getElementById('m-price').value = ''
	document.getElementById('m-purchase').value = ''
	document.getElementById('m-rating').value = '5'
	document.getElementById('m-date').value = ''
}

// ── SELECT КОНТРАГЕНТОВ ───────────────────────────────────────────────────────
function fillContractorSelect() {
	const sel = document.getElementById('f-contractor')
	;[...new Set(allGoods.map(g => g.contractor))].forEach(c => {
		const o = document.createElement('option')
		o.value = c
		o.textContent = c
		sel.appendChild(o)
	})
}

function fillContractorSelectFresh() {
	const sel = document.getElementById('f-contractor')
	while (sel.options.length > 1) sel.remove(1)
	fillContractorSelect()
}

// ── ФИЛЬТРАЦИЯ ────────────────────────────────────────────────────────────────
function getFiltered() {
	const contractor = document.getElementById('f-contractor').value
	const from = document.getElementById('f-from').value
	const to = document.getElementById('f-to').value

	return allGoods.filter(g => {
		const d = new Date(g.saleDate)
		return (
			(!contractor || g.contractor === contractor) &&
			(!from || d >= new Date(from)) &&
			(!to || d <= new Date(to))
		)
	})
}

// ── РЕНДЕР ────────────────────────────────────────────────────────────────────
function render(goods) {
	const total = goods.length
	const totalProfit = goods.reduce(
		(s, g) => s + g.price - (g.purchasePrice || 0),
		0,
	)
	const avgCheck =
		total > 0 ? Math.round(goods.reduce((s, g) => s + g.price, 0) / total) : 0
	const avgRating =
		total > 0
			? (
					goods.reduce((s, g) => s + (Number(g.rating) || 0), 0) / total
				).toFixed(1)
			: 0

	document.getElementById('kpi-total').textContent = total + ' шт.'
	document.getElementById('kpi-revenue').textContent =
		totalProfit.toLocaleString('ru-RU') + ' ₽'
	document.getElementById('kpi-avg').textContent =
		avgCheck.toLocaleString('ru-RU') + ' ₽'
	document.getElementById('kpi-rating').textContent =
		avgRating == 0 ? '—' : avgRating + ' ★'
	document.getElementById('count-badge').textContent = total + ' записей'

	const tbody = document.getElementById('sales-tbody')

	if (total === 0) {
		tbody.innerHTML = `<tr><td colspan="9">
			<div class="empty-state">
				<div class="empty-state-icon">🔍</div>
				Нет данных по заданным фильтрам
			</div>
		</td></tr>`
		return
	}

	tbody.innerHTML = goods
		.map((g, i) => {
			const profit = g.price - (g.purchasePrice || 0)
			const profitColor = profit >= 0 ? 'var(--accent)' : 'var(--red)'
			return `<tr>
			<td style="color:var(--text-soft)">${i + 1}</td>
			<td><b>${g.name}</b></td>
			<td>${g.contractor}</td>
			<td>${new Date(g.saleDate).toLocaleDateString('ru-RU')}</td>
			<td>
				<span class="stars">${'★'.repeat(g.rating)}</span>
				<span class="stars-empty">${'★'.repeat(5 - g.rating)}</span>
			</td>
			<td>${g.price.toLocaleString('ru-RU')} ₽</td>
			<td style="color:var(--text-soft)">${g.purchasePrice ? g.purchasePrice.toLocaleString('ru-RU') + ' ₽' : '—'}</td>
			<td style="color:${profitColor};font-weight:600">${profit >= 0 ? '+' : ''}${profit.toLocaleString('ru-RU')} ₽</td>
			<td>
				<div class="actions-cell">
					<button class="action-btn edit-btn" data-id="${g.id}" title="Редактировать">✏️</button>
					<button class="action-btn delete delete-btn" data-id="${g.id}" title="Удалить">🗑</button>
				</div>
			</td>
		</tr>`
		})
		.join('')

	tbody.querySelectorAll('.edit-btn').forEach(btn => {
		btn.addEventListener('click', () => openEdit(btn.dataset.id))
	})
	tbody.querySelectorAll('.delete-btn').forEach(btn => {
		btn.addEventListener('click', () => openDelete(btn.dataset.id))
	})
}

// ── ХЕЛПЕРЫ ───────────────────────────────────────────────────────────────────
function showLoading() {
	document.getElementById('sales-tbody').innerHTML =
		`<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-soft)">⏳ Загрузка...</td></tr>`
}

function showError(msg) {
	document.getElementById('sales-tbody').innerHTML =
		`<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--red)">❌ Ошибка: ${msg}</td></tr>`
}
