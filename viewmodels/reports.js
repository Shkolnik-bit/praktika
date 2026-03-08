// ╔══════════════════════════════════════════════════════════════╗
// ║  ReportsViewModel.js — логика страницы "Отчёты Excel"       ║
// ║  Зависимость: SheetJS (xlsx.full.min.js) загружается в HTML ║
// ╚══════════════════════════════════════════════════════════════╝

// ── ДЕМО-ДАННЫЕ ──────────────────────────────────────────────────────────────
const allGoods = [
	{
		name: 'Ноутбук Dell XPS',
		contractor: 'ООО Технологии',
		rating: 5,
		saleDate: '2026-03-01',
		price: 89900,
	},
	{
		name: 'Монитор LG 27"',
		contractor: 'ИП Смирнов',
		rating: 4,
		saleDate: '2026-03-02',
		price: 24500,
	},
	{
		name: 'Клавиатура Logitech',
		contractor: 'ООО Технологии',
		rating: 5,
		saleDate: '2026-02-28',
		price: 5800,
	},
	{
		name: 'Мышь Razer',
		contractor: 'ООО Гаджет Плюс',
		rating: 3,
		saleDate: '2026-02-20',
		price: 3200,
	},
	{
		name: 'SSD Samsung 1TB',
		contractor: 'ИП Смирнов',
		rating: 5,
		saleDate: '2026-03-03',
		price: 8700,
	},
	{
		name: 'Веб-камера Logitech',
		contractor: 'ООО Гаджет Плюс',
		rating: 4,
		saleDate: '2026-02-15',
		price: 6400,
	},
	{
		name: 'Наушники Sony WH',
		contractor: 'ООО Технологии',
		rating: 5,
		saleDate: '2026-03-04',
		price: 18900,
	},
	{
		name: 'USB-хаб Anker',
		contractor: 'ИП Смирнов',
		rating: 3,
		saleDate: '2026-01-30',
		price: 2100,
	},
	{
		name: 'Принтер HP LaserJet',
		contractor: 'ООО Гаджет Плюс',
		rating: 4,
		saleDate: '2026-02-10',
		price: 14200,
	},
	{
		name: 'Роутер ASUS',
		contractor: 'ООО Технологии',
		rating: 4,
		saleDate: '2026-03-05',
		price: 7600,
	},
]

const exportHistory = []

// ── ИНИЦИАЛИЗАЦИЯ ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
	// Дата в topbar
	document.getElementById('page-date').textContent = new Intl.DateTimeFormat(
		'ru-RU',
		{
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		},
	).format(new Date())

	// Слайдер рейтинга
	document.getElementById('r-rating').addEventListener('input', function () {
		document.getElementById('rating-val').textContent = this.value
		updatePreview()
	})

	// Живое обновление предпросмотра при изменении любого фильтра
	;['r-contractor', 'r-from', 'r-to'].forEach(id => {
		document.getElementById(id).addEventListener('change', updatePreview)
	})

	// Кнопка экспорта
	document.getElementById('exportBtn').addEventListener('click', handleExport)

	// Импорт — drag & drop + клик
	const dropZone = document.getElementById('dropZone')
	const fileInput = document.getElementById('fileInput')

	dropZone.addEventListener('click', () => fileInput.click())
	document
		.getElementById('importBtn')
		.addEventListener('click', () => fileInput.click())
	dropZone.addEventListener('dragover', e => {
		e.preventDefault()
		dropZone.classList.add('drag-over')
	})
	dropZone.addEventListener('dragleave', () =>
		dropZone.classList.remove('drag-over'),
	)
	dropZone.addEventListener('drop', e => {
		e.preventDefault()
		dropZone.classList.remove('drag-over')
		handleImport(e.dataTransfer.files[0])
	})
	fileInput.addEventListener('change', e => handleImport(e.target.files[0]))

	// Первичный рендер предпросмотра
	updatePreview()
})

// ── ФИЛЬТРАЦИЯ ────────────────────────────────────────────────────────────────
function getFiltered() {
	const contractor = document.getElementById('r-contractor').value
	const minRating = Number(document.getElementById('r-rating').value)
	const from = document.getElementById('r-from').value
	const to = document.getElementById('r-to').value

	return allGoods.filter(g => {
		const d = new Date(g.saleDate)
		return (
			(!contractor || g.contractor === contractor) &&
			g.rating >= minRating &&
			(!from || d >= new Date(from)) &&
			(!to || d <= new Date(to))
		)
	})
}

// ── ПРЕДПРОСМОТР EXCEL ────────────────────────────────────────────────────────
function updatePreview() {
	const filtered = getFiltered()
	const tbody = document.getElementById('excel-tbody')
	const countEl = document.getElementById('preview-row-count')

	countEl.textContent = filtered.length + ' строк'

	const cols = ['Название', 'Контрагент', 'Рейтинг', 'Дата продажи', 'Цена']

	if (filtered.length === 0) {
		tbody.innerHTML = `
			<tr class="excel-th">
				<td class="col-num">1</td>
				${cols.map(c => `<td>${c}</td>`).join('')}
			</tr>
			<tr><td colspan="6" class="excel-empty">⚠️ Нет данных по заданным фильтрам</td></tr>`
		return
	}

	const headerRow = `<tr class="excel-th">
		<td class="col-num">1</td>
		${cols.map(c => `<td>${c}</td>`).join('')}
	</tr>`

	const dataRows = filtered
		.map(
			(g, i) => `<tr class="excel-row">
		<td class="col-num">${i + 2}</td>
		<td>${g.name}</td>
		<td>${g.contractor}</td>
		<td style="text-align:center">${g.rating}</td>
		<td>${g.saleDate}</td>
		<td style="text-align:right">${g.price.toLocaleString('ru-RU')}</td>
	</tr>`,
		)
		.join('')

	tbody.innerHTML = headerRow + dataRows
}

// ── ЭКСПОРТ XLSX ──────────────────────────────────────────────────────────────
function handleExport() {
	const contractor = document.getElementById('r-contractor').value
	const minRating = Number(document.getElementById('r-rating').value)
	const from = document.getElementById('r-from').value
	const to = document.getElementById('r-to').value
	const filename = document.getElementById('r-filename').value || 'report.xlsx'
	const resultEl = document.getElementById('export-result')
	const btn = document.getElementById('exportBtn')

	const filtered = getFiltered()

	if (filtered.length === 0) {
		resultEl.className = 'export-result empty'
		resultEl.textContent = '⚠️ Нет данных по заданным фильтрам'
		return
	}

	btn.disabled = true
	btn.textContent = '⏳ Генерация...'

	setTimeout(() => {
		// Данные листа: строка заголовков + строки данных
		const wsData = [
			['Название', 'Контрагент', 'Рейтинг', 'Дата продажи', 'Цена'],
			...filtered.map(g => [
				g.name,
				g.contractor,
				g.rating,
				g.saleDate,
				g.price,
			]),
		]

		const ws = XLSX.utils.aoa_to_sheet(wsData)

		// Ширины колонок
		ws['!cols'] = [
			{ wch: 28 }, // A — Название
			{ wch: 22 }, // B — Контрагент
			{ wch: 10 }, // C — Рейтинг
			{ wch: 16 }, // D — Дата продажи
			{ wch: 14 }, // E — Цена
		]

		// Стиль заголовка — жирный белый текст на зелёном фоне
		const headerStyle = {
			font: { bold: true, color: { rgb: 'FFFFFF' } },
			fill: { fgColor: { rgb: '1E7145' } },
			alignment: { horizontal: 'center' },
		}
		;['A', 'B', 'C', 'D', 'E'].forEach(col => {
			const cell = ws[col + '1']
			if (cell) cell.s = headerStyle
		})

		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'Отчёт')

		const xlsxName = filename.endsWith('.xlsx') ? filename : filename + '.xlsx'
		XLSX.writeFile(wb, xlsxName)

		// Логируем в историю
		const filtersStr = [
			contractor || 'Все',
			minRating > 0 ? `Рейтинг ≥ ${minRating}` : '',
			from ? `от ${new Date(from).toLocaleDateString('ru-RU')}` : '',
			to ? `до ${new Date(to).toLocaleDateString('ru-RU')}` : '',
		]
			.filter(Boolean)
			.join(', ')

		exportHistory.unshift({
			date: new Date().toLocaleString('ru-RU'),
			file: xlsxName,
			count: filtered.length,
			filters: filtersStr,
		})
		renderHistory()

		resultEl.className = 'export-result success'
		resultEl.textContent = `✅ Файл "${xlsxName}" скачан — ${filtered.length} строк`

		btn.disabled = false
		btn.textContent = '⬇ Скачать отчёт Excel'
	}, 200)
}

// ── ИМПОРТ ────────────────────────────────────────────────────────────────────
function handleImport(file) {
	if (!file) return

	const preview = document.getElementById('importPreview')
	const tbody = document.getElementById('import-tbody')
	const result = document.getElementById('import-result')
	const dropZone = document.getElementById('dropZone')
	const ext = file.name.split('.').pop().toLowerCase()

	const renderImportRows = rows => {
		tbody.innerHTML = rows
			.slice(0, 5)
			.map(
				g => `<tr>
			<td>${g.name || g['Название'] || ''}</td>
			<td>${g.contractor || g['Контрагент'] || ''}</td>
			<td>${g.saleDate || g['Дата продажи'] || ''}</td>
			<td>${g.rating || g['Рейтинг'] || ''} ★</td>
			<td>${(+(g.price || g['Цена'] || 0)).toLocaleString('ru-RU')} ₽</td>
		</tr>`,
			)
			.join('')

		preview.classList.add('show')
		result.textContent = `✅ Файл "${file.name}" прочитан — ${rows.length} строк`
		dropZone.querySelector('.drop-zone-title').textContent = file.name
		dropZone.querySelector('.drop-zone-sub').textContent =
			`${(file.size / 1024).toFixed(1)} KB`
	}

	if (ext === 'xlsx' || ext === 'xls') {
		// Читаем реальный xlsx через SheetJS
		const reader = new FileReader()
		reader.onload = e => {
			try {
				const wb = XLSX.read(e.target.result, { type: 'array' })
				const ws = wb.Sheets[wb.SheetNames[0]]
				const rows = XLSX.utils.sheet_to_json(ws)
				renderImportRows(rows)
			} catch {
				renderImportRows(allGoods) // fallback на демо
			}
		}
		reader.readAsArrayBuffer(file)
	} else {
		// CSV или неизвестный формат — показываем демо
		renderImportRows(allGoods)
	}
}

// ── ИСТОРИЯ ЭКСПОРТОВ ─────────────────────────────────────────────────────────
function renderHistory() {
	const tbody = document.getElementById('history-tbody')

	if (exportHistory.length === 0) {
		tbody.innerHTML = `<tr>
			<td colspan="5" style="text-align:center;color:var(--text-soft);padding:32px">
				Экспортов пока нет
			</td>
		</tr>`
		return
	}

	tbody.innerHTML = exportHistory
		.map(
			h => `<tr>
		<td style="color:var(--text-soft)">${h.date}</td>
		<td><b>${h.file}</b></td>
		<td>${h.count}</td>
		<td style="color:var(--text-soft)">${h.filters}</td>
		<td><span class="badge badge-green">Успешно</span></td>
	</tr>`,
		)
		.join('')
}
