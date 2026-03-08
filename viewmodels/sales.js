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

// Дата
document.getElementById('sales-date').textContent = new Intl.DateTimeFormat(
	'ru-RU',
	{
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	},
).format(new Date())

// Заполнить select контрагентов
const sel = document.getElementById('f-contractor')
;[...new Set(allGoods.map(g => g.contractor))].forEach(c => {
	const o = document.createElement('option')
	o.value = c
	o.textContent = c
	sel.appendChild(o)
})

// Первичный рендер
render(allGoods)

document
	.getElementById('applyBtn')
	.addEventListener('click', () => render(getFiltered()))

document.getElementById('resetBtn').addEventListener('click', () => {
	document.getElementById('f-contractor').value = ''
	document.getElementById('f-from').value = ''
	document.getElementById('f-to').value = ''
	render(allGoods)
})

document.getElementById('exportBtn').addEventListener('click', () => {
	alert('Экспорт доступен при запуске через Node.js сервер')
})

function getFiltered() {
	const contractor = document.getElementById('f-contractor').value
	const from = document.getElementById('f-from').value
	const to = document.getElementById('f-to').value
	return allGoods.filter(g => {
		const d = new Date(g.saleDate)
		return (
			(!contractor || g.contractor === contractor) &&
			(!from || d >= new Date(from)) &&
			(!to || d <= new Date(to))
		)
	})
}

function render(goods) {
	const total = goods.length
	const revenue = goods.reduce((s, g) => s + g.price, 0)
	const avg = total > 0 ? Math.round(revenue / total) : 0

	document.getElementById('kpi-total').textContent = total + ' шт.'
	document.getElementById('kpi-revenue').textContent =
		revenue.toLocaleString('ru-RU') + ' ₽'
	document.getElementById('kpi-avg').textContent =
		avg.toLocaleString('ru-RU') + ' ₽'
	document.getElementById('count-badge').textContent = total + ' записей'

	const tbody = document.getElementById('sales-tbody')

	if (total === 0) {
		tbody.innerHTML = `<tr><td colspan="7">
					<div class="empty-state">
						<div class="empty-state-icon">🔍</div>
						Нет данных по заданным фильтрам
					</div>
				</td></tr>`
		return
	}

	tbody.innerHTML = goods
		.map(
			(g, i) => `<tr>
				<td style="color:var(--text-soft)">${i + 1}</td>
				<td><b>${g.name}</b></td>
				<td>${g.contractor}</td>
				<td>${new Date(g.saleDate).toLocaleDateString('ru-RU')}</td>
				<td>
					<span class="stars">${'★'.repeat(g.rating)}</span>
					<span class="stars-empty">${'★'.repeat(5 - g.rating)}</span>
				</td>
				<td>${g.price.toLocaleString('ru-RU')} ₽</td>
				<td><span class="badge badge-green">Продан</span></td>
			</tr>`,
		)
		.join('')
}
