// ── ROUTER ───────────────────────────────────────────────────────────────────
// Централизованная навигация между страницами

export const Routes = {
	LOGIN: 'login.html',
	DASHBOARD: 'index.html',
	SALES: 'sales.html',
	GOODS: 'goods.html',
	CONTRACTORS: 'contractors.html',
	REPORTS: 'reports.html',
}

export function navigate(route) {
	window.location.href = route
}
