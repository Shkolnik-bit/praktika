// ── contractorsModel.js (Model) ───────────────────────────────────────────────
// Бизнес-логика страницы контрагентов: вычисления, фильтрация.
// Не знает ничего о DOM и стилях.

// Нормализация имени для сравнения (убирает кавычки, пробелы, lowercase)
export const norm = str => (str || '').replace(/[«»""'\s]/g, '').toLowerCase()

// toDateStr → импортируется из utils.js

// Считает статистику одного контрагента по массиву продаж
// Возвращает { soldQty, profit }
export function getContractorStats(contractorName, sales) {
	const mySales = sales.filter(s => norm(s.contractor) === norm(contractorName))
	const soldQty = mySales.reduce((sum, s) => sum + (Number(s.qty) || 1), 0)
	const profit = mySales.reduce(
		(sum, s) => sum + (s.price - (s.purchasePrice || 0)) * (Number(s.qty) || 1),
		0,
	)
	return { soldQty, profit }
}

// Находит топ-контрагента по прибыли
export function findTopContractor(contractors, sales) {
	let topName = '—'
	let topProfit = -Infinity
	contractors.forEach(c => {
		const { profit } = getContractorStats(c.name, sales)
		if (profit > topProfit) {
			topProfit = profit
			topName = c.name
		}
	})
	return topName
}

// Сортирует контрагентов по прибыли (убывание)
export function sortByProfit(contractors, sales) {
	return [...contractors].sort(
		(a, b) =>
			getContractorStats(b.name, sales).profit -
			getContractorStats(a.name, sales).profit,
	)
}

// Фильтрует контрагентов по поисковой строке
export function filterContractors(contractors, query) {
	const q = query.toLowerCase()
	return contractors.filter(
		c =>
			(c.name || '').toLowerCase().includes(q) ||
			(c.email || '').toLowerCase().includes(q) ||
			(c.phone || '').toLowerCase().includes(q),
	)
}
