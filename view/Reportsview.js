// ── reportsView.js (View) ─────────────────────────────────────────────────────
// Отвечает только за отображение: предпросмотр таблицы, статус экспорта.
// Не содержит бизнес-логики и не делает запросы к Firebase.

import { REPORT_COLS, calcTotals, saleToRow } from '/models/reportsModel.js'

// ── ПРЕДПРОСМОТР ДАННЫХ ───────────────────────────────────────────────────────
export function renderPreview(sales) {
	const tbody = document.getElementById('excel-tbody')
	const countEl = document.getElementById('preview-row-count')
	countEl.textContent = sales.length + ' строк'

	if (!sales.length) {
		tbody.innerHTML = `
			<tr class="excel-th">
				<td class="col-num">1</td>
				${REPORT_COLS.map(c => `<td>${c}</td>`).join('')}
			</tr>
			<tr><td colspan="${REPORT_COLS.length + 1}" class="excel-empty">⚠️ Нет данных по заданным фильтрам</td></tr>`
		return
	}

	const { totalProfit, totalQty } = calcTotals(sales)

	// Строка заголовка
	const headerRow = `<tr class="excel-th">
		<td class="col-num">1</td>
		${REPORT_COLS.map(c => `<td>${c}</td>`).join('')}
	</tr>`

	// Строки данных
	const dataRows = sales
		.map((s, i) => {
			const [
				name,
				contractor,
				date,
				qty,
				price,
				purchase,
				profitUnit,
				profitTotal,
			] = saleToRow(s)
			const color = profitTotal >= 0 ? '#2e7d32' : '#ef5350'
			return `<tr class="excel-row">
			<td class="col-num">${i + 2}</td>
			<td>${name}</td>
			<td>${contractor}</td>
			<td>${date}</td>
			<td class="text-center fw-600">${qty}</td>
			<td class="text-right">${Number(price).toLocaleString('ru-RU')}</td>
			<td class="text-right">${purchase ? Number(purchase).toLocaleString('ru-RU') : '—'}</td>
			<td class="text-right">${Number(profitUnit).toLocaleString('ru-RU')}</td>
			<td class="text-right fw-600" style="color:${color}">
				${profitTotal >= 0 ? '+' : ''}${Number(profitTotal).toLocaleString('ru-RU')}
			</td>
		</tr>`
		})
		.join('')

	// Итоговая строка
	const totalColor = totalProfit >= 0 ? '#2e7d32' : '#ef5350'
	const totalRow = `<tr class="excel-th">
		<td class="col-num"></td>
		<td colspan="4" class="fw-700"></td>
		<td colspan="2"></td>
		<td class="text-right fw-700">Итого прибыль:</td>
		<td class="text-right fw-700" style="color:${totalColor}">
			${totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString('ru-RU')} ₽
		</td>
	</tr>`

	tbody.innerHTML = headerRow + dataRows + totalRow
}

// ── РЕЗУЛЬТАТ ЭКСПОРТА ────────────────────────────────────────────────────────
export function showExportResult(type, text) {
	const el = document.getElementById('export-result')
	el.className = 'export-result ' + type
	el.textContent = text
}

// ── ДРОПДАУН КОНТРАГЕНТОВ ─────────────────────────────────────────────────────
export function fillContractorSelect(sales) {
	const sel = document.getElementById('r-contractor')
	;[...new Set(sales.map(s => s.contractor).filter(Boolean))]
		.sort()
		.forEach(name => {
			const o = document.createElement('option')
			o.value = name
			o.textContent = name
			sel.appendChild(o)
		})
}
