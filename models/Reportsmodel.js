// ── reportsModel.js (Model) ───────────────────────────────────────────────────
// Бизнес-логика страницы отчётов: фильтрация, сортировка, подготовка данных.
// Не знает ничего о DOM и стилях.

// Колонки отчёта (A–H)
export const REPORT_COLS = [
	'Название',
	'Контрагент',
	'Дата продажи',
	'Кол-во',
	'Цена продажи',
	'Закуп. цена',
	'Прибыль (ед.)',
	'Прибыль итого',
]

// Фильтрует и сортирует продажи по параметрам фильтра
export function filterAndSort(sales, { contractor, from, to, sort }) {
	let result = sales.filter(s => {
		const d = new Date(s.saleDate)
		return (
			(!contractor || s.contractor === contractor) &&
			(!from || d >= new Date(from)) &&
			(!to || d <= new Date(to))
		)
	})

	if (sort === 'profit') {
		result.sort(
			(a, b) =>
				(b.price - (b.purchasePrice || 0)) * (b.qty || 1) -
				(a.price - (a.purchasePrice || 0)) * (a.qty || 1),
		)
	} else if (sort === 'qty') {
		result.sort((a, b) => {
			const diff = (b.qty || 1) - (a.qty || 1)
			if (diff !== 0) return diff
			// Вторичная сортировка по прибыли для стабильности
			return (
				(b.price - (b.purchasePrice || 0)) * (b.qty || 1) -
				(a.price - (a.purchasePrice || 0)) * (a.qty || 1)
			)
		})
	} else if (sort === 'date') {
		result.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
	}
	return result
}

// Группирует продажи по названию + контрагент.
// Если один товар продавался несколько раз — суммирует qty и прибыль,
// дата берётся последней продажи, цена — средневзвешенная.
export function groupSales(sales) {
	const map = {}
	sales.forEach(s => {
		// Ключ группировки — название + контрагент
		const key =
			(s.name || '').toLowerCase() + '|' + (s.contractor || '').toLowerCase()
		if (!map[key]) {
			map[key] = {
				name: s.name,
				contractor: s.contractor,
				saleDate: s.saleDate,
				qty: 0,
				price: s.price,
				purchasePrice: s.purchasePrice || 0,
				barcode: s.barcode,
			}
		}
		const g = map[key]
		g.qty += s.qty || 1
		// Берём дату последней продажи
		if (s.saleDate > g.saleDate) g.saleDate = s.saleDate
	})
	return Object.values(map)
}

// Считает итоги по отфильтрованным продажам
export function calcTotals(sales) {
	const totalProfit = sales.reduce(
		(sum, s) => sum + (s.price - (s.purchasePrice || 0)) * (s.qty || 1),
		0,
	)
	const totalQty = sales.reduce((sum, s) => sum + (s.qty || 1), 0)
	return { totalProfit, totalQty }
}

// Преобразует одну запись продажи в строку для xlsx/preview
export function saleToRow(s) {
	const qty = s.qty || 1
	const profitUnit = s.price - (s.purchasePrice || 0)
	return [
		s.name || '—',
		s.contractor || '—',
		s.saleDate || '—',
		qty,
		s.price || 0,
		s.purchasePrice || 0,
		profitUnit,
		profitUnit * qty,
	]
}

// Строит массив данных для XLSX (заголовок + строки + итог)
export function buildXlsxData(sales) {
	const { totalProfit, totalQty } = calcTotals(sales)
	return [
		REPORT_COLS,
		...sales.map(saleToRow),
		['Итого:', '', '', totalQty, '', '', 'Итого прибыль:', totalProfit],
	]
}
