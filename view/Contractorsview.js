import { showTableError, showTableLoading } from '../services/utils.js'
// ── contractorsView.js (View) ─────────────────────────────────────────────────
// Отвечает только за отображение: KPI, таблица контрагентов.
// Не делает запросы к Firebase и не содержит бизнес-логики.

// ── KPI ───────────────────────────────────────────────────────────────────────
export function renderKPI({ total, topName }) {
	document.getElementById('kpi-total').textContent = total + ' шт.'
	document.getElementById('kpi-top').textContent = topName
	document.getElementById('count-badge').textContent = total + ' контрагентов'
}

// ── ТАБЛИЦА КОНТРАГЕНТОВ ──────────────────────────────────────────────────────
// Принимает готовый массив с уже посчитанной статистикой:
// [{ id, name, email, phone, soldQty, profit }]
export function renderTable(rows, { onEdit, onDelete }) {
	const tbody = document.getElementById('contractors-tbody')

	if (!rows.length) {
		tbody.innerHTML = `<tr><td colspan="7">
			<div class="empty-state"><div class="empty-state-icon">🤝</div>Нет контрагентов</div>
		</td></tr>`
		return
	}

	tbody.innerHTML = rows
		.map((c, i) => {
			const profitColor =
				c.profit > 0
					? 'var(--accent)'
					: c.profit < 0
						? 'var(--red)'
						: 'var(--text-soft)'
			return `<tr>
			<td class="text-soft">${i + 1}</td>
			<td><b>${c.name}</b></td>
			<td class="text-soft">${c.email || '—'}</td>
			<td class="text-soft">${c.phone || '—'}</td>
			<td class="text-center fw-600">${c.soldQty}</td>
			<td style="font-weight:600;color:${profitColor}">${c.profit.toLocaleString('ru-RU')} ₽</td>
			<td>
				<div class="actions-cell">
					<button class="action-btn edit-btn" data-id="${c.id}">✏️</button>
					<button class="action-btn delete delete-btn" data-id="${c.id}">🗑</button>
				</div>
			</td>
		</tr>`
		})
		.join('')

	tbody
		.querySelectorAll('.edit-btn')
		.forEach(b => b.addEventListener('click', () => onEdit(b.dataset.id)))
	tbody
		.querySelectorAll('.delete-btn')
		.forEach(b => b.addEventListener('click', () => onDelete(b.dataset.id)))
}

// ── СОСТОЯНИЯ ТАБЛИЦЫ ─────────────────────────────────────────────────────────
// showLoading/showError → используй showTableLoading/showTableError из utils.js
export const showLoading = () => showTableLoading('contractors-tbody', 7)
export const showError = msg => showTableError('contractors-tbody', 7, msg)
