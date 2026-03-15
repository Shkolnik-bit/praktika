// ── dashboardView.js (View) ───────────────────────────────────────────────────
// Отвечает только за отображение: обновляет DOM, рисует SVG-графики.
// Не делает запросы к Firebase, не считает бизнес-логику.

const COLORS = [
	'#1565c0',
	'#42a5f5',
	'#00c853',
	'#ff6d00',
	'#ab47bc',
	'#ef5350',
	'#26c6da',
	'#ffca28',
]

// ── KPI КАРТОЧКИ ──────────────────────────────────────────────────────────────
export function renderKPI({ totalProfit, totalCount, topContractor }) {
	document.getElementById('kpi-revenue').textContent =
		totalProfit.toLocaleString('ru-RU') + ' ₽'
	document.getElementById('kpi-count').textContent = totalCount + ' шт.'

	if (topContractor) {
		document.getElementById('kpi-top').textContent = topContractor.name
		document.getElementById('kpi-top-sub').textContent =
			topContractor.profit.toLocaleString('ru-RU') + ' ₽ прибыли'
	}
}

// ── ЛИНЕЙНЫЙ ГРАФИК (SVG) ─────────────────────────────────────────────────────
// Принимает массив [['2026-03-01', 1500], ['2026-03-02', 3000], ...]
export function renderLineChart(dateEntries) {
	const wrap = document.getElementById('bar-chart-wrap')

	if (!dateEntries.length) {
		wrap.innerHTML = '<div class="chart-loading">Нет данных</div>'
		return
	}

	// Форматируем метки оси X
	const labels = dateEntries.map(([d]) => {
		const dt = new Date(d)
		return isNaN(dt)
			? d
			: dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
	})
	const values = dateEntries.map(([, v]) => v)
	const n = values.length

	// Размеры и отступы SVG
	const W = 480,
		H = 170
	const padL = 32,
		padR = 20,
		padT = 16,
		padB = 28
	const chartW = W - padL - padR
	const chartH = H - padT - padB

	const maxV = Math.max(...values, 1)
	const minV = Math.min(0, ...values)
	const range = maxV - minV || 1

	// Координаты точек
	const xs = values.map(
		(_, i) => padL + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW),
	)
	const ys = values.map(v => padT + chartH - ((v - minV) / range) * chartH)

	// Строки SVG-элементов
	const pts = xs.map((x, i) => `${x},${ys[i]}`).join(' ')
	const areaD =
		`M${xs[0]},${ys[0]} ` +
		xs
			.slice(1)
			.map((x, i) => `L${x},${ys[i + 1]}`)
			.join(' ') +
		` L${xs[n - 1]},${padT + chartH} L${xs[0]},${padT + chartH} Z`

	// Подписи X — не чаще 6 меток
	const step = Math.max(1, Math.floor(n / 6))
	const labelsX = labels
		.map((lbl, i) =>
			i % step === 0 || i === n - 1
				? `<text x="${xs[i]}" y="${H - 4}" text-anchor="middle"
				fill="#7986cb" font-size="9" font-family="Geologica,sans-serif">${lbl}</text>`
				: '',
		)
		.join('')

	// Горизонтальная сетка
	const grids = [0.25, 0.5, 0.75, 1]
		.map(f => {
			const y = padT + chartH - f * chartH
			const val = Math.round(minV + f * range)
			const vs = val >= 1000 ? (val / 1000).toFixed(0) + 'к' : val
			return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e8eaf6" stroke-width="1"/>
			<text x="${padL - 4}" y="${y + 3}" text-anchor="end"
				fill="#b0bec5" font-size="8" font-family="Geologica,sans-serif">${vs}</text>`
		})
		.join('')

	wrap.style.display = 'block'
	wrap.innerHTML = `
		<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">
			<defs>
				<linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#00c853" stop-opacity="0.2"/>
					<stop offset="100%" stop-color="#00c853" stop-opacity="0"/>
				</linearGradient>
				<marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
					<polygon points="0,0 10,5 0,10" fill="#00c853"/>
				</marker>
			</defs>
			${grids}
			<path d="${areaD}" fill="url(#lineGrad)"/>
			<polyline points="${pts}" fill="none" stroke="#00c853" stroke-width="2.5"
				stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrowhead)"/>
			${xs
				.map(
					(x, i) =>
						`<circle cx="${x}" cy="${ys[i]}" r="3" fill="#00c853" stroke="#fff" stroke-width="1.5"/>`,
				)
				.join('')}
			${labelsX}
		</svg>`
}

// ── ДОНАТ-ДИАГРАММА ───────────────────────────────────────────────────────────
// Принимает массив stats [{name, profit, orders}] и общее кол-во
export function renderDonut(stats, total) {
	const svg = document.getElementById('donut-svg')
	const legend = document.getElementById('donut-legend')

	document.getElementById('donut-val').textContent = total + ' шт.'

	if (!stats.length || !total) {
		legend.innerHTML = '<div class="chart-loading">Нет данных</div>'
		return
	}

	const C = 2 * Math.PI * 38
	let offset = 0,
		circles = '',
		legendHTML = ''

	stats.forEach((s, i) => {
		const share = s.orders / total
		const dash = share * C
		const color = COLORS[i % COLORS.length]
		const pct = Math.round(share * 100)
		// Убираем «ООО» и кавычки для компактности
		const label = s.name
			.replace(/ООО\s?/g, '')
			.replace(/[«»]/g, '')
			.trim()

		circles += `<circle cx="50" cy="50" r="38" fill="none"
			stroke="${color}" stroke-width="12"
			stroke-dasharray="${dash.toFixed(2)} ${C.toFixed(2)}"
			stroke-dashoffset="${(-offset).toFixed(2)}"/>`

		legendHTML += `<div class="legend-item">
			<div class="legend-dot" style="background:${color}"></div>
			${label} — ${pct}% (${s.orders} шт.)
		</div>`

		offset += dash
	})

	svg.innerHTML = `<circle cx="50" cy="50" r="38" fill="none" stroke="#E8EAF6" stroke-width="12"/>${circles}`
	legend.innerHTML = legendHTML
}

// ── ОШИБКА ЗАГРУЗКИ ───────────────────────────────────────────────────────────
export function renderError(message) {
	document.getElementById('bar-chart-wrap').innerHTML =
		`<div class="chart-loading" style="color:var(--red)">❌ ${message}</div>`
}
