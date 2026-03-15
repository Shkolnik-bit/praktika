// ── dashboardModel.js (Model) ─────────────────────────────────────────────────
// Бизнес-логика дашборда: вычисления, трансформации данных.
// Не знает ничего о DOM, стилях и навигации.

// Нормализация имени для сравнения (убирает кавычки, пробелы, приводит к lowercase)
export const norm = str => (str || '').replace(/[«»""'\s]/g, '').toLowerCase()

// toDateStr → импортируется из utils.js

// Считает прибыль, кол-во проданных товаров
export function calcTotals(sales) {
	const totalProfit = sales.reduce(
		(sum, s) => sum + (s.price - (s.purchasePrice || 0)) * (s.qty || 1),
		0,
	)
	const totalCount = sales.reduce((sum, s) => sum + (s.qty || 1), 0)
	return { totalProfit, totalCount }
}

// Строит статистику прибыли и кол-ва по каждому контрагенту
export function buildStats(sales, contractors) {
	const map = {}

	// Инициализируем из базы контрагентов (чтобы отображались все, даже без продаж)
	contractors.forEach(c => {
		map[norm(c.name)] = { name: c.name, profit: 0, orders: 0 }
	})

	// Суммируем данные из продаж
	sales.forEach(s => {
		const key = norm(s.contractor)
		if (!map[key]) map[key] = { name: s.contractor, profit: 0, orders: 0 }
		map[key].profit += (s.price - (s.purchasePrice || 0)) * (s.qty || 1)
		map[key].orders += s.qty || 1
	})

	// Возвращаем только тех у кого есть заказы, сортируем по прибыли
	return Object.values(map)
		.filter(x => x.orders > 0)
		.sort((a, b) => b.profit - a.profit)
}

// Группирует прибыль по дате для линейного графика
export function groupProfitByDate(sales) {
	const byDate = {}
	sales.forEach(s => {
		const d = s.saleDate || '?'
		byDate[d] = (byDate[d] || 0) + (s.price - (s.purchasePrice || 0))
	})
	return Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]))
}
