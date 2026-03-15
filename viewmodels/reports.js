// ── reports.js (ViewModel) ────────────────────────────────────────────────────
// Точка входа страницы отчётов. Только:
//   1. Загружает данные
//   2. Передаёт в Model для обработки
//   3. Передаёт результат в View для отображения

import { getSales } from '../../services/firebaseService.js'
import { buildXlsxData, filterAndSort } from '/models/reportsModel.js'
import { setPageDate, toDateStr } from '/services/Utils.js'
import {
	fillContractorSelect,
	renderPreview,
	showExportResult,
} from '/view/reportsView.js'

let allSales = []

// ── СТАРТ ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
	setPageDate('page-date')
	document.getElementById('preview-row-count').textContent = 'загрузка...'

	try {
		const sales = await getSales()
		allSales = sales.map(s => ({ ...s, saleDate: toDateStr(s.saleDate) }))
		fillContractorSelect(allSales)
		refreshPreview()
	} catch (e) {
		document.getElementById('preview-row-count').textContent = 'ошибка загрузки'
		console.error(e)
	}

	// Обновляем предпросмотр при смене любого фильтра
	;['r-contractor', 'r-from', 'r-to', 'r-sort'].forEach(id => {
		document.getElementById(id).addEventListener('change', refreshPreview)
	})

	document.getElementById('exportBtn').addEventListener('click', handleExport)
})

// ── ЧИТАЕТ ТЕКУЩИЕ ЗНАЧЕНИЯ ФИЛЬТРОВ ─────────────────────────────────────────
function getFilters() {
	return {
		contractor: document.getElementById('r-contractor').value,
		from: document.getElementById('r-from').value,
		to: document.getElementById('r-to').value,
		sort: document.getElementById('r-sort').value,
	}
}

// ── ОБНОВИТЬ ПРЕДПРОСМОТР ─────────────────────────────────────────────────────
function refreshPreview() {
	const filtered = filterAndSort(allSales, getFilters())
	renderPreview(filtered)
}

// ── ЭКСПОРТ XLSX ──────────────────────────────────────────────────────────────
function handleExport() {
	const filtered = filterAndSort(allSales, getFilters())
	const filename = document.getElementById('r-filename').value || 'report.xlsx'
	const btn = document.getElementById('exportBtn')

	if (!filtered.length) {
		showExportResult('empty', '⚠️ Нет данных по заданным фильтрам')
		return
	}

	btn.disabled = true
	btn.textContent = '⏳ Генерация...'

	setTimeout(() => {
		// Model: строит данные для xlsx
		const wsData = buildXlsxData(filtered)

		const ws = XLSX.utils.aoa_to_sheet(wsData)
		ws['!cols'] = [
			{ wch: 30 },
			{ wch: 22 },
			{ wch: 16 },
			{ wch: 10 },
			{ wch: 16 },
			{ wch: 14 },
			{ wch: 14 },
			{ wch: 16 },
		]
		// Стиль заголовка
		const headerStyle = {
			font: { bold: true, color: { rgb: 'FFFFFF' } },
			fill: { fgColor: { rgb: '1565C0' } },
			alignment: { horizontal: 'center' },
		}
		;['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
			if (ws[col + '1']) ws[col + '1'].s = headerStyle
		})

		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Отчёт')
		const xlsxName = filename.endsWith('.xlsx') ? filename : filename + '.xlsx'
		XLSX.writeFile(wb, xlsxName)

		showExportResult(
			'success',
			`✅ Файл "${xlsxName}" скачан — ${filtered.length} строк`,
		)
		btn.disabled = false
		btn.textContent = '⬇ Скачать отчёт Excel'
	}, 200)
}
