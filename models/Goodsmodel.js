// ── goodsModel.js (Model) ─────────────────────────────────────────────────────
// Бизнес-логика страницы товаров: вычисления, фильтрация, парсинг.
// Не знает ничего о DOM и стилях.

// toDateStr → импортируется из utils.js

// Парсит дату из Excel (число, DD.MM.YYYY, ISO-строка)
export function parseDate(val) {
	if (!val) return null
	if (typeof val === 'number')
		return new Date(Math.round((val - 25569) * 86400 * 1000))
			.toISOString()
			.slice(0, 10)
	const s = String(val).trim()
	if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
		const [d, m, y] = s.split('.')
		return `${y}-${m}-${d}`
	}
	const d = new Date(s)
	return !isNaN(d) ? d.toISOString().slice(0, 10) : null
}

// Капитализирует каждое слово: "ооо универ" → "ООО Универ"
// Слова из 2 букв и меньше — полностью заглавные (ООО, ИП, ЗАО)
export function normalizeName(name) {
	return (name || '')
		.trim()
		.replace(/[«»""']/g, '') // убираем кавычки
		.replace(/\s+/g, ' ') // схлопываем пробелы
		.split(' ')
		.map(word =>
			word.length <= 2
				? word.toUpperCase()
				: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
		)
		.join(' ')
}

// Ключ для сравнения — без кавычек, без пробелов, lowercase
export const normKey = name =>
	(name || '')
		.replace(/[«»""']/g, '')
		.replace(/\s+/g, '')
		.toLowerCase()

// Считает KPI по каталогу товаров
export function calcGoodsKPI(goods) {
	const total = goods.length
	const sum = goods.reduce((s, g) => s + (g.price || 0) * (g.qty || 1), 0)
	const avg = total > 0 ? Math.round(sum / total) : 0
	return { total, sum, avg }
}

// Фильтрует и сортирует товары
export function filterAndSort(goods, { search, contractor, sort }) {
	let result = goods.filter(
		g =>
			(!search ||
				(g.name || '').toLowerCase().includes(search) ||
				(g.contractor || '').toLowerCase().includes(search) ||
				(g.barcode || '').toLowerCase().includes(search)) &&
			(!contractor || g.contractor === contractor),
	)
	if (sort === 'name')
		result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'))
	if (sort === 'price-desc') result.sort((a, b) => b.price - a.price)
	if (sort === 'price-asc') result.sort((a, b) => a.price - b.price)
	if (sort === 'date-desc')
		result.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
	return result
}

// Считает итоговую сумму закупки по строкам мульти-режима
export function calcMultiTotal(rows) {
	return rows.reduce((sum, row) => {
		const price = Number(row.querySelector('[data-field="price"]')?.value) || 0
		const qty = Number(row.querySelector('[data-field="qty"]')?.value) || 1
		return sum + price * qty
	}, 0)
}

// Ищет существующий товар-дубликат по имени и поставщику (без учёта регистра/пробелов/кавычек)
export function findDuplicate(allGoods, name, contractor) {
	return (
		allGoods.find(
			g =>
				normKey(g.name) === normKey(name) &&
				normKey(g.contractor) === normKey(contractor),
		) || null
	)
}

// Собирает данные мульти-строк из DOM
export function collectMultiItems() {
	return [...document.querySelectorAll('.item-row')].map(row => ({
		name: row.querySelector('[data-field="name"]').value.trim(),
		contractor: row.querySelector('[data-field="contractor"]').value.trim(),
		qty: Number(row.querySelector('[data-field="qty"]').value) || 1,
		barcode: row.querySelector('[data-field="barcode"]').value.trim(),
		price: Number(row.querySelector('[data-field="price"]').value) || 0,
		sellPrice: Number(row.querySelector('[data-field="sellPrice"]').value) || 0,
		dateStr: row.querySelector('[data-field="date"]').value,
	}))
}
