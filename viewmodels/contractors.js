const allContractors = [
	{
		name: 'ООО Технологии',
		email: 'tech@techno.ru',
		phone: '+7 495 123-45-67',
		orders: 4,
		revenue: 122200,
		rating: 4.8,
	},
	{
		name: 'ИП Смирнов',
		email: 'smirnov@mail.ru',
		phone: '+7 916 234-56-78',
		orders: 3,
		revenue: 35300,
		rating: 4.3,
	},
	{
		name: 'ООО Гаджет Плюс',
		email: 'gadget@gadgetplus.ru',
		phone: '+7 812 345-67-89',
		orders: 3,
		revenue: 23800,
		rating: 3.7,
	},
]

// Дата
document.getElementById('page-date').textContent = new Intl.DateTimeFormat(
	'ru-RU',
	{
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	},
).format(new Date())

// Первичный рендер
render(allContractors)

// Поиск
document.getElementById('searchInput').addEventListener('input', () => {
	const q = document.getElementById('searchInput').value.toLowerCase()
	render(
		allContractors.filter(
			c =>
				c.name.toLowerCase().includes(q) ||
				c.email.toLowerCase().includes(q) ||
				c.phone.includes(q),
		),
	)
})

document.getElementById('resetBtn').addEventListener('click', () => {
	document.getElementById('searchInput').value = ''
	render(allContractors)
})

document.getElementById('addBtn').addEventListener('click', () => {
	alert('Потом сделаю')
})

function render(contractors) {
	const total = contractors.length
	const revenue = contractors.reduce((s, c) => s + c.revenue, 0)
	const orders = contractors.reduce((s, c) => s + c.orders, 0)
	const top = [...contractors].sort((a, b) => b.revenue - a.revenue)[0]

	document.getElementById('kpi-total').textContent = total + ' шт.'
	document.getElementById('kpi-revenue').textContent =
		revenue.toLocaleString('ru-RU') + ' ₽'
	document.getElementById('kpi-orders').textContent = orders + ' шт.'
	document.getElementById('kpi-top').textContent = top ? top.name : '—'
	document.getElementById('count-badge').textContent = total + ' контрагентов'

	renderCards(contractors)
	renderTable(contractors)
}

function renderCards(contractors) {
	const grid = document.getElementById('contractors-grid')

	if (contractors.length === 0) {
		grid.innerHTML = ''
		return
	}

	grid.innerHTML = contractors
		.map(c => {
			const initials = c.name
				.split(' ')
				.map(w => w[0])
				.join('')
				.slice(0, 2)
				.toUpperCase()
			const starsF = Math.round(c.rating)
			const stars = '★'.repeat(starsF)
			const starsE = '★'.repeat(5 - starsF)

			return `<div class="contractor-card">
						<div class="contractor-card-header">
							<div class="contractor-avatar">${initials}</div>
							<div>
								<div class="contractor-name">${c.name}</div>
								<div class="contractor-email">${c.email}</div>
							</div>
						</div>
						<div class="contractor-stats">
							<div class="stat-box">
								<div class="stat-box-label">Заказов</div>
								<div class="stat-box-val">${c.orders}</div>
							</div>
							<div class="stat-box">
								<div class="stat-box-label">Выручка</div>
								<div class="stat-box-val" style="font-size:13px">${c.revenue.toLocaleString('ru-RU')} ₽</div>
							</div>
						</div>
						<div class="contractor-footer">
							<div>
								<span class="stars">${stars}</span>
								<span class="stars-empty">${starsE}</span>
								<span style="font-size:12px;color:var(--text-soft);margin-left:4px">${c.rating}</span>
							</div>
							<div class="contractor-phone">${c.phone}</div>
						</div>
					</div>`
		})
		.join('')
}

function renderTable(contractors) {
	const tbody = document.getElementById('contractors-tbody')

	if (contractors.length === 0) {
		tbody.innerHTML = `<tr><td colspan="7">
						<div class="empty-state">
							<div class="empty-state-icon">🏢</div>
							Контрагенты не найдены
						</div>
					</td></tr>`
		return
	}

	tbody.innerHTML = contractors
		.map((c, i) => {
			const starsF = Math.round(c.rating)
			const stars = '★'.repeat(starsF)
			const starsE = '★'.repeat(5 - starsF)
			const badge =
				c.rating >= 4.5
					? '<span class="badge badge-green">Отлично</span>'
					: c.rating >= 3.5
						? '<span class="badge badge-blue">Хорошо</span>'
						: '<span class="badge badge-orange">Средне</span>'

			return `<tr>
						<td style="color:var(--text-soft)">${i + 1}</td>
						<td><b>${c.name}</b></td>
						<td style="color:var(--text-soft)">${c.email}</td>
						<td style="color:var(--text-soft)">${c.phone}</td>
						<td>${c.orders}</td>
						<td style="font-weight:600;color:var(--text)">${c.revenue.toLocaleString('ru-RU')} ₽</td>
						<td>
							<span class="stars">${stars}</span>
							<span class="stars-empty">${starsE}</span>
							<span style="margin-left:6px">${badge}</span>
						</td>
					</tr>`
		})
		.join('')
}
