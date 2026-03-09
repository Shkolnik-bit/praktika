const allGoods = [
	{
		name: 'Ноутбук Dell XPS',
		contractor: 'ООО Технологии',
		rating: 5,
		saleDate: '2026-03-01',
		price: 89900,
		status: 'sold',
	},
	{
		name: 'Монитор LG 27"',
		contractor: 'ИП Смирнов',
		rating: 4,
		saleDate: '2026-03-02',
		price: 24500,
		status: 'sold',
	},
	{
		name: 'Клавиатура Logitech',
		contractor: 'ООО Технологии',
		rating: 5,
		saleDate: '2026-02-28',
		price: 5800,
		status: 'sold',
	},
	{
		name: 'Мышь Razer',
		contractor: 'ООО Гаджет Плюс',
		rating: 3,
		saleDate: '2026-02-20',
		price: 3200,
		status: 'pending',
	},
	{
		name: 'SSD Samsung 1TB',
		contractor: 'ИП Смирнов',
		rating: 5,
		saleDate: '2026-03-03',
		price: 8700,
		status: 'sold',
	},
	{
		name: 'Веб-камера Logitech',
		contractor: 'ООО Гаджет Плюс',
		rating: 4,
		saleDate: '2026-02-15',
		price: 6400,
		status: 'sold',
	},
	{
		name: 'Наушники Sony WH',
		contractor: 'ООО Технологии',
		rating: 5,
		saleDate: '2026-03-04',
		price: 18900,
		status: 'sold',
	},
	{
		name: 'USB-хаб Anker',
		contractor: 'ИП Смирнов',
		rating: 3,
		saleDate: '2026-01-30',
		price: 2100,
		status: 'pending',
	},
	{
		name: 'Принтер HP LaserJet',
		contractor: 'ООО Гаджет Плюс',
		rating: 4,
		saleDate: '2026-02-10',
		price: 14200,
		status: 'sold',
	},
	{
		name: 'Роутер ASUS',
		contractor: 'ООО Технологии',
		rating: 4,
		saleDate: '2026-03-05',
		price: 7600,
		status: 'sold',
	},
]

// Дата
document.getElementById('goods-date').textContent = new Intl.DateTimeFormat(
	'ru-RU',
	{
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	},
).format(new Date())

// Заполнить select поставщиков
const contractorFilter = document.getElementById('contractorFilter')
;[...new Set(allGoods.map(g => g.contractor))].forEach(c => {
	const o = document.createElement('option')
	o.value = c
	o.textContent = c
	contractorFilter.appendChild(o)
})

// Первичный рендер
render(allGoods)

// Обработчики
document.getElementById('searchInput').addEventListener('input', applyFilters)
document
	.getElementById('contractorFilter')
	.addEventListener('change', applyFilters)
document.getElementById('sortSelect').addEventListener('change', applyFilters)

document.getElementById('resetBtn').addEventListener('click', () => {
	document.getElementById('searchInput').value = ''
	document.getElementById('contractorFilter').value = ''
	document.getElementById('sortSelect').value = 'name'
	render(allGoods)
})

document.getElementById('addBtn').addEventListener('click', () => {
	alert('ещё не сделал :)')
})

// Фильтрация + сортировка
function applyFilters() {
	const search = document.getElementById('searchInput').value.toLowerCase()
	const contractor = document.getElementById('contractorFilter').value
	const sort = document.getElementById('sortSelect').value

	let result = allGoods.filter(
		g =>
			(!search ||
				g.name.toLowerCase().includes(search) ||
				g.contractor.toLowerCase().includes(search)) &&
			(!contractor || g.contractor === contractor),
	)

	if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
	if (sort === 'price-desc') result.sort((a, b) => b.price - a.price)
	if (sort === 'price-asc') result.sort((a, b) => a.price - b.price)
	if (sort === 'rating-desc') result.sort((a, b) => b.rating - a.rating)
	if (sort === 'date-desc')
		result.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))

	render(result)
}

// Рендер таблицы и KPI
function render(goods) {
	const total = goods.length
	const sum = goods.reduce((s, g) => s + g.price, 0)
	const avg = total > 0 ? Math.round(sum / total) : 0
	const rating =
		total > 0
			? (goods.reduce((s, g) => s + g.rating, 0) / total).toFixed(1)
			: '—'

	document.getElementById('kpi-total').textContent = total + ' шт.'
	document.getElementById('kpi-sum').textContent =
		sum.toLocaleString('ru-RU') + ' ₽'
	document.getElementById('kpi-avg').textContent =
		avg.toLocaleString('ru-RU') + ' ₽'
	document.getElementById('kpi-rating').textContent = rating + ' ★'
	document.getElementById('count-badge').textContent = total + ' товаров'

	const tbody = document.getElementById('goods-tbody')

	if (total === 0) {
		tbody.innerHTML = `<tr><td colspan="7">
						<div class="empty-state">
							<div class="empty-state-icon">📭</div>
							Ничего не найдено
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
					<td style="font-weight:600;color:var(--text)">${g.price.toLocaleString('ru-RU')} ₽</td>
					<td>${
						g.status === 'sold'
							? '<span class="badge badge-green">Продан</span>'
							: '<span class="badge badge-orange">Ожидание</span>'
					}</td>
				</tr>`,
		)
		.join('')
}
