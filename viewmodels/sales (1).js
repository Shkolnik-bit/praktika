import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { addItem, getSales } from '../../services/firebaseService.js'

// ── СОСТОЯНИЕ ─────────────────────────────────────────────────────────────────
let allGoods = []

// ── ХЕЛПЕР: Firestore Timestamp → строка 'YYYY-MM-DD' ────────────────────────
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
		alert('Экспорт доступен на странице Отчёты')
	})

	// ── МОДАЛЬНОЕ ОКНО ────────────────────────────────────────────────────────
	document.getElementById('addSaleBtn').addEventListener('click', () => {
		document.getElementById('saleModal').classList.add('show')
	})

	document.getElementById('modalClose').addEventListener('click', closeModal)
	document.getElementById('modalCancel').addEventListener('click', closeModal)

	// Закрытие по клику на фон
	document.getElementById('saleModal').addEventListener('click', e => {
		if (e.target.id === 'saleModal') closeModal()
	})

	// Сохранение новой продажи
	document.getElementById('modalSave').addEventListener('click', async () => {
		const name = document.getElementById('m-name').value.trim()
		const contractor = document.getElementById('m-contractor').value.trim()
		const price = Number(document.getElementById('m-price').value)
		const rating = Number(document.getElementById('m-rating').value)
		const dateStr = document.getElementById('m-date').value

		if (!name || !contractor || !price || !rating || !dateStr) {
			alert('Заполните все поля')
			return
		}

		const btn = document.getElementById('modalSave')
		btn.disabled = true
		btn.textContent = 'Сохранение...'

		try {
			const saleDate = Timestamp.fromDate(new Date(dateStr))
			await addItem('sales', { name, contractor, price, rating, saleDate })

			// Перезагружаем список
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
})

// ── ЗАКРЫТЬ МОДАЛКУ ───────────────────────────────────────────────────────────
function closeModal() {
	document.getElementById('saleModal').classList.remove('show')
	document.getElementById('m-name').value = ''
	document.getElementById('m-contractor').value = ''
	document.getElementById('m-price').value = ''
	document.getElementById('m-rating').value = '5'
	document.getElementById('m-date').value = ''
}

// ── ЗАПОЛНИТЬ SELECT ──────────────────────────────────────────────────────────
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
	// Очищаем кроме первой опции "Все"
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
	const revenue = goods.reduce((s, g) => s + g.price, 0)
	const avg = total > 0 ? Math.round(revenue / total) : 0
	const totalRating = goods.reduce((s, g) => s + (Number(g.rating) || 0), 0)
	const avgRating = total > 0 ? (totalRating / total).toFixed(1) : 0

	document.getElementById('kpi-total').textContent = total + ' шт.'
	document.getElementById('kpi-revenue').textContent =
		revenue.toLocaleString('ru-RU') + ' ₽'
	document.getElementById('kpi-avg').textContent =
		avg.toLocaleString('ru-RU') + ' ₽'
	document.getElementById('kpi-rating').textContent =
		avgRating === 0 ? '—' : avgRating + ' ★'
	document.getElementById('count-badge').textContent = total + ' записей'

	const tbody = document.getElementById('sales-tbody')

	if (total === 0) {
		tbody.innerHTML = `<tr><td colspan="6">
			<div class="empty-state">
				<div class="empty-state-icon">🔍</div>
				Нет данных по заданным фильтрам
			</div>
		</td></tr>`
		return
	}

	tbody.innerHTML = goods
		.map(
			(g, i) => `<tr>
		<td style="color:var(--text-soft)">${i + 1}</td>
		<td><b>${g.name}</b></td>
		<td>${g.contractor}</td>
		<td>${new Date(g.saleDate).toLocaleDateString('ru-RU')}</td>
		<td>
			<span class="stars">${'★'.repeat(g.rating)}</span>
			<span class="stars-empty">${'★'.repeat(5 - g.rating)}</span>
		</td>
		<td>${g.price.toLocaleString('ru-RU')} ₽</td>
	</tr>`,
		)
		.join('')
}

// ── ХЕЛПЕРЫ ───────────────────────────────────────────────────────────────────
function showLoading() {
	document.getElementById('sales-tbody').innerHTML =
		`<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-soft)">⏳ Загрузка...</td></tr>`
}

function showError(msg) {
	document.getElementById('sales-tbody').innerHTML =
		`<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--red)">❌ Ошибка: ${msg}</td></tr>`
}
