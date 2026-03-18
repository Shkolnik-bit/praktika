// ── main.js (ViewModel) ───────────────────────────────────────────────────────

import {
	buildStats,
	calcTotals,
	groupProfitByDate,
} from '../../models/dashboardModel.js'
import {
	getContractors,
	getSales,
	logout,
	requireAuth, // НОВОЕ
} from '../../services/firebaseService.js'
import { navigate, Routes } from '../../services/router.js'
import { normalizeDates, setPageDate } from '../../services/utils.js'
import {
	renderDonut,
	renderError,
	renderKPI,
	renderLineChart,
} from '../../view/dashboardView.js'

document.addEventListener('DOMContentLoaded', async () => {
	setPageDate('today-date')

	// НОВОЕ: проверяем сессию и получаем пользователя
	let currentUser
	try {
		currentUser = await requireAuth()
	} catch (e) {
		return // requireAuth сам редиректит на /login.html
	}

	// НОВОЕ: обновляем аватар, имя и роль в сайдбаре
	const nameEl = document.getElementById('user-name')
	const roleEl = document.querySelector('.user-role')
	const avatarEl = document.getElementById('user-avatar')

	if (nameEl) nameEl.textContent = currentUser.name || currentUser.email
	if (roleEl)
		roleEl.textContent =
			currentUser.role === 'admin' ? 'Администратор' : 'Менеджер'
	if (avatarEl) {
		// Берём первые две буквы имени для аватара
		const initials = (currentUser.name || currentUser.email)
			.split(/[\s@]/)
			.filter(Boolean)
			.slice(0, 2)
			.map(w => w[0].toUpperCase())
			.join('')
		avatarEl.textContent = initials
	}

	// Навигация через sidebar
	document.querySelectorAll('.nav-item[data-page]').forEach(item => {
		item.addEventListener('click', () => {
			const routes = {
				sales: Routes.SALES,
				goods: Routes.GOODS,
				contractors: Routes.CONTRACTORS,
				reports: Routes.REPORTS,
			}
			if (routes[item.dataset.page]) navigate(routes[item.dataset.page])
		})
	})

	// Выход
	document.getElementById('logoutBtn').addEventListener('click', async () => {
		await logout()
		navigate(Routes.LOGIN)
	})

	// Загрузка и отображение данных
	try {
		const [salesRaw, contractorsRaw] = await Promise.all([
			getSales(),
			getContractors(),
		])

		const sales = normalizeDates(salesRaw)

		const { totalProfit, totalCount } = calcTotals(sales)
		const stats = buildStats(sales, contractorsRaw)
		const dateEntries = groupProfitByDate(sales)

		renderKPI({ totalProfit, totalCount, topContractor: stats[0] || null })
		renderLineChart(dateEntries)
		renderDonut(stats, totalCount)
	} catch (e) {
		console.error('Dashboard error:', e)
		renderError(e.message)
	}
})
