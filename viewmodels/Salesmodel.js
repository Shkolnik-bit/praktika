// ── salesModel.js (Model) ─────────────────────────────────────────────────────
// Бизнес-логика страницы продаж: вычисления, фильтрация, трансформации.
// Не знает ничего о DOM и стилях.

// toDateStr → импортируется из utils.js

// Считает KPI по массиву продаж
export function calcSalesKPI(sales) {
	const total = sales.length
	const profit = sales.reduce(
		(s, g) => s + (g.price - (g.purchasePrice || 0)) * (g.qty || 1),
		0,
	)
	const avgCheck =
		total > 0 ? Math.round(sales.reduce((s, g) => s + g.price, 0) / total) : 0
	return { total, profit, avgCheck }
}

// Фильтрует продажи по контрагенту и диапазону дат
export function filterSales(sales, { contractor, from, to }) {
	return sales.filter(s => {
		const d = new Date(s.saleDate)
		return (
			(!contractor || s.contractor === contractor) &&
			(!from || d >= new Date(from)) &&
			(!to || d <= new Date(to))
		)
	})
}

// Считает прибыль позиций мульти-режима из DOM
export function calcMultiProfit(rows) {
	return rows.reduce((sum, row) => {
		const price = Number(row.querySelector('[data-sf="price"]')?.value) || 0
		const purchase =
			Number(row.querySelector('[data-sf="purchase"]')?.value) || 0
		const qty = Number(row.querySelector('[data-sf="qty"]')?.value) || 1
		return sum + (price - purchase) * qty
	}, 0)
}

// Собирает данные мульти-строк из DOM
export function collectMultiItems(allGoods) {
	return [...document.querySelectorAll('#multi-list .sale-row')].map(row => {
		const goodId = row.querySelector('[data-sf="good"]')?.value
		const good = allGoods.find(g => g.id === goodId)
		return {
			goodId,
			name: good?.name || '',
			contractor:
				row.querySelector('[data-sf="contractor"]')?.value ||
				good?.contractor ||
				'',
			qty: Number(row.querySelector('[data-sf="qty"]')?.value) || 1,
			price: Number(row.querySelector('[data-sf="price"]')?.value) || 0,
			purchasePrice:
				Number(row.querySelector('[data-sf="purchase"]')?.value) || 0,
			barcode: row.querySelector('[data-sf="barcode"]')?.value || '',
		}
	})
}
