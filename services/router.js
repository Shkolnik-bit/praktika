// ── ROUTER ───────────────────────────────────────────────────────────────────

export const Routes = {
	LOGIN:       '/view/login.html',
	DASHBOARD:   '/view/index.html',
	SALES:       '/view/sales.html',
	GOODS:       '/view/goods.html',
	CONTRACTORS: '/view/contractors.html',
	REPORTS:     '/view/reports.html',
	FORBIDDEN:   '/view/403.html',
}

export function navigate(route) {
	window.location.href = route
}

// Редирект после входа в зависимости от роли
export function navigateByRole(role) {
	if (role === 'admin')        navigate(Routes.DASHBOARD)
	else if (role === 'cashier') navigate(Routes.SALES)
	else                         navigate(Routes.FORBIDDEN)
}
