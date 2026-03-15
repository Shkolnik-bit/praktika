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
		result.sort((a, b) => (b.qty || 1) - (a.qty || 1))
	} else if (sort === 'date') {
		result.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
	}
	return result
}

// Считает итоги по отфильтрованным продажам
export function calcTotals(sales) {
	const totalProfit = sales.reduce(
		(sum, s) => sum + (s.price - (s.purchasePrice || 0)) * (s.qty || 1),
		0,
	)
	return { totalProfit }
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
