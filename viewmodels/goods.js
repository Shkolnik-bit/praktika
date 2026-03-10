import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { addItem, getGoods } from '../../services/firebaseService.js'

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
	document.getElementById('goods-date').textContent = new Intl.DateTimeFormat(
		'ru-RU',
		{
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		},
	).format(new Date())

	showLoading()

	try {
		const raw = await getGoods()
		allGoods = raw.map(g => ({ ...g, saleDate: toDateStr(g.saleDate) }))
		fillContractorSelect()
		render(allGoods)
	} catch (e) {
		showError(e.message)
	}

	document.getElementById('searchInput').addEventListener('input', applyFilters)
	document
		.getElementById('contractorFilter')
		.addEventListener('change', applyFilters)
	document.getElementById('sortSelect').addEventListener('change', applyFilters)

	document.getElementById('resetBtn').addEventListener('click', () => {
		document.getElementById('searchInput').value = ''
		document.getElementById('contractorFilter').value = ''
		document.getElementById('sortSelect').value = 'name'
		render(allGoods)
	})

	// ── МОДАЛЬНОЕ ОКНО ────────────────────────────────────────────────────────
	document.getElementById('addBtn').addEventListener('click', () => {
		document.getElementById('goodModal').classList.add('show')
	})

	document.getElementById('modalClose').addEventListener('click', closeModal)
	document.getElementById('modalCancel').addEventListener('click', closeModal)

	document.getElementById('goodModal').addEventListener('click', e => {
		if (e.target.id === 'goodModal') closeModal()
	})

	document.getElementById('modalSave').addEventListener('click', async () => {
		const name = document.getElementById('m-name').value.trim()
		const contractor = document.getElementById('m-contractor').value.trim()
		const price = Number(document.getElementById('m-price').value)
		const dateStr = document.getElementById('m-date').value

		if (!name || !contractor || !price || !dateStr) {
			alert('Заполните все поля')
			return
		}

		const btn = document.getElementById('modalSave')
		btn.disabled = true
		btn.textContent = 'Сохранение...'

		try {
			const saleDate = Timestamp.fromDate(new Date(dateStr))
			await addItem('goods', { name, contractor, price, saleDate })

			const raw = await getGoods()
			allGoods = raw.map(g => ({ ...g, saleDate: toDateStr(g.saleDate) }))
			// Обновить select
			const sel = document.getElementById('contractorFilter')
			while (sel.options.length > 1) sel.remove(1)
			fillContractorSelect()
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
	document.getElementById('goodModal').classList.remove('show')
	document.getElementById('m-name').value = ''
	document.getElementById('m-contractor').value = ''
	document.getElementById('m-price').value = ''
	document.getElementById('m-date').value = ''
}

// ── ЗАПОЛНИТЬ SELECT ──────────────────────────────────────────────────────────
function fillContractorSelect() {
	const sel = document.getElementById('contractorFilter')
	;[...new Set(allGoods.map(g => g.contractor))].forEach(c => {
		const o = document.createElement('option')
		o.value = c
		o.textContent = c
		sel.appendChild(o)
	})
}

// ── ФИЛЬТРАЦИЯ + СОРТИРОВКА ───────────────────────────────────────────────────
function applyFilters() {
	const search = document.getElementById('searchInput').value.toLowerCase()
	const contractor = document.getElementById('contractorFilter').value
	const sort = document.getElementById('sortSelect').value

	let result = allGoods.filter(
		g =>
			(!search ||
				g.name.toLowerCase().includes(search) ||
				g.contractor.toLowerCase().includes(search)) &&
			(!contractor || g.contractor === contractor),
	)

	if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
	if (sort === 'price-desc') result.sort((a, b) => b.price - a.price)
	if (sort === 'price-asc') result.sort((a, b) => a.price - b.price)
	if (sort === 'date-desc')
		result.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))

	render(result)
}

// ── РЕНДЕР ────────────────────────────────────────────────────────────────────
function render(goods) {
	const total = goods.length
	const sum = goods.reduce((s, g) => s + g.price, 0)
	const avg = total > 0 ? Math.round(sum / total) : 0

	document.getElementById('kpi-total').textContent = total + ' шт.'
	document.getElementById('kpi-sum').textContent =
		sum.toLocaleString('ru-RU') + ' ₽'
	document.getElementById('kpi-avg').textContent =
		avg.toLocaleString('ru-RU') + ' ₽'
	document.getElementById('count-badge').textContent = total + ' товаров'

	const tbody = document.getElementById('goods-tbody')

	if (total === 0) {
		tbody.innerHTML = `<tr><td colspan="5">
			<div class="empty-state">
				<div class="empty-state-icon">📭</div>
				Ничего не найдено
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
		<td style="font-weight:600;color:var(--text)">${g.price.toLocaleString('ru-RU')} ₽</td>
	</tr>`,
		)
		.join('')
}

// ── ХЕЛПЕРЫ ───────────────────────────────────────────────────────────────────
function showLoading() {
	document.getElementById('goods-tbody').innerHTML =
		`<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-soft)">⏳ Загрузка...</td></tr>`
}

function showError(msg) {
	document.getElementById('goods-tbody').innerHTML =
		`<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--red)">❌ Ошибка: ${msg}</td></tr>`
}
