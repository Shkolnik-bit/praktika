// ── main.js (ViewModel) ───────────────────────────────────────────────────────
// Точка входа дашборда. Только:
//   1. Загружает данные через сервисы
//   2. Передаёт данные в Model для обработки
//   3. Передаёт результат в View для отображения

import {
	buildStats,
	calcTotals,
	groupProfitByDate,
} from '../../models/dashboardModel.js'
import {
	getContractors,
	getSales,
	logout,
} from '../../services/firebaseService.js'
import { navigate, Routes } from '../../services/router.js'
import { normalizeDates, setPageDate } from '../../services/utils.js'
import {
	renderDonut,
	renderError,
	renderKPI,
	renderLineChart,
} from '../../view/dashboardView.js'

// ── СТАРТ ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
	setPageDate('today-date')

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

		// Нормализуем даты через utils
		const sales = normalizeDates(salesRaw)

		// Model: вычисляем
		const { totalProfit, totalCount } = calcTotals(sales)
		const stats = buildStats(sales, contractorsRaw)
		const dateEntries = groupProfitByDate(sales)

		// View: отображаем
		renderKPI({ totalProfit, totalCount, topContractor: stats[0] || null })
		renderLineChart(dateEntries)
		renderDonut(stats, totalCount)
	} catch (e) {
		console.error('Dashboard error:', e)
		renderError(e.message)
	}
})
