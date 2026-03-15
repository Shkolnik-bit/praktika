import {
	fillSelect,
	resetSelect,
	showTableError,
	showTableLoading,
} from '../services/utils.js'
// ── salesView.js (View) ───────────────────────────────────────────────────────
// Отвечает только за отображение: рендер таблицы, KPI, модальных строк.
// Не делает запросы к Firebase и не содержит бизнес-логики.

// ── KPI ───────────────────────────────────────────────────────────────────────
export function renderKPI({ total, profit, avgCheck }) {
	document.getElementById('kpi-total').textContent = total + ' шт.'
	document.getElementById('kpi-revenue').textContent =
		profit.toLocaleString('ru-RU') + ' ₽'
	document.getElementById('kpi-avg').textContent =
		avgCheck.toLocaleString('ru-RU') + ' ₽'
}

// ── ТАБЛИЦА ПРОДАЖ ────────────────────────────────────────────────────────────
export function renderTable(sales, { onEdit, onDelete }) {
	document.getElementById('count-badge').textContent = sales.length + ' записей'
	const tbody = document.getElementById('sales-tbody')

	if (!sales.length) {
		tbody.innerHTML = `<tr><td colspan="10">
			<div class="empty-state"><div class="empty-state-icon">🔍</div>Нет данных</div>
		</td></tr>`
		return
	}

	tbody.innerHTML = sales
		.map((s, i) => {
			const p = (s.price - (s.purchasePrice || 0)) * (s.qty || 1)
			const pClr = p >= 0 ? 'var(--accent)' : 'var(--red)'
			return `<tr>
			<td class="text-soft">${i + 1}</td>
			<td><b>${s.name}</b></td>
			<td>${s.contractor}</td>
			<td>${new Date(s.saleDate).toLocaleDateString('ru-RU')}</td>
			<td class="text-center">${s.qty || 1}</td>
			<td class="text-soft text-sm">${s.barcode || '—'}</td>
			<td>${(s.price || 0).toLocaleString('ru-RU')} ₽</td>
			<td class="text-soft">${s.purchasePrice ? s.purchasePrice.toLocaleString('ru-RU') + ' ₽' : '—'}</td>
			<td style="color:${pClr};font-weight:600">${p >= 0 ? '+' : ''}${p.toLocaleString('ru-RU')} ₽</td>
			<td>
				<div class="actions-cell">
					<button class="action-btn edit-btn" data-id="${s.id}">✏️</button>
					<button class="action-btn delete delete-btn" data-id="${s.id}">🗑</button>
				</div>
			</td>
		</tr>`
		})
		.join('')

	// Вешаем обработчики на кнопки таблицы
	tbody
		.querySelectorAll('.edit-btn')
		.forEach(b => b.addEventListener('click', () => onEdit(b.dataset.id)))
	tbody
		.querySelectorAll('.delete-btn')
		.forEach(b => b.addEventListener('click', () => onDelete(b.dataset.id)))
}

// ── ДРОПДАУН ТОВАРОВ ──────────────────────────────────────────────────────────
export function fillGoodsDropdown(selectId, allGoods, selectedId) {
	document.getElementById(selectId).innerHTML = allGoods
		.map(
			g =>
				`<option value="${g.id}" ${g.id === selectedId ? 'selected' : ''}>
			${g.name} (${g.qty || 1} шт. на складе)
		</option>`,
		)
		.join('')
}

// ── ДРОПДАУН КОНТРАГЕНТОВ (фильтр) ───────────────────────────────────────────
// fillContractorFilter/reset → используют fillSelect/resetSelect из utils.js
export const fillContractorFilter = sales =>
	fillSelect('f-contractor', sales, 'contractor')
export const resetContractorFilter = sales =>
	resetSelect('f-contractor', sales, 'contractor')

// ── СТРОКИ МУЛЬТИ-РЕЖИМА ──────────────────────────────────────────────────────
export function renderMultiRows(
	multiItems,
	allGoods,
	{ onGoodChange, onQtyPriceInput, onRemove },
) {
	const list = document.getElementById('multi-list')

	list.innerHTML = multiItems
		.map((item, i) => {
			const opts = allGoods
				.map(
					g =>
						`<option value="${g.id}" ${g.id === item.goodId ? 'selected' : ''}>
				${g.name} (${g.qty || 1} шт.)
			</option>`,
				)
				.join('')
			const stock = allGoods.find(g => g.id === item.goodId)?.qty || 1
			const contractor =
				item.contractor ||
				allGoods.find(g => g.id === item.goodId)?.contractor ||
				''

			return `
		<div class="sale-row" data-index="${i}">
			<div class="sale-row-header">
				<span>Позиция ${i + 1}</span>
				${i > 0 ? `<button class="sale-row-remove" data-remove="${i}">✕</button>` : ''}
			</div>
			<div class="modal-field">
				<label>Товар</label>
				<select data-sf="good">${opts}</select>
			</div>
			<div class="grid-2">
				<div class="modal-field">
					<label>Контрагент (поставщик)</label>
					<input type="text" data-sf="contractor" value="${contractor}" readonly />
				</div>
				<div class="modal-field">
					<label>Штрих-код</label>
					<input type="text" data-sf="barcode" value="${item.barcode || ''}" readonly />
				</div>
			</div>
			<div class="grid-3">
				<div class="modal-field">
					<label>Кол-во</label>
					<input type="number" data-sf="qty" value="${item.qty || 1}" min="1" max="${stock}" />
					<div class="stock-hint">На складе: ${stock} шт.</div>
				</div>
				<div class="modal-field">
					<label>Цена продажи (₽)</label>
					<input type="number" data-sf="price" value="${item.price || ''}" min="0" />
				</div>
				<div class="modal-field">
					<label>Закуп. цена (₽)</label>
					<input type="number" data-sf="purchase" value="${item.purchasePrice || ''}" min="0" readonly />
				</div>
			</div>
		</div>`
		})
		.join('')

	// Обработчики строк
	list
		.querySelectorAll('[data-remove]')
		.forEach(btn =>
			btn.addEventListener('click', () => onRemove(Number(btn.dataset.remove))),
		)
	list
		.querySelectorAll('[data-sf="good"]')
		.forEach(sel => sel.addEventListener('change', () => onGoodChange(sel)))
	list
		.querySelectorAll('[data-sf="qty"],[data-sf="price"]')
		.forEach(inp => inp.addEventListener('input', () => onQtyPriceInput(inp)))
}

// ── ИТОГО ПРИБЫЛЬ В МУЛЬТИ-РЕЖИМЕ ────────────────────────────────────────────
export function updateMultiProfitDisplay(profit) {
	const el = document.getElementById('multi-profit')
	el.textContent = profit.toLocaleString('ru-RU') + ' ₽'
	el.className =
		'multi-profit ' + (profit >= 0 ? 'multi-profit--pos' : 'multi-profit--neg')
}

// ── ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ МОДАЛКИ ──────────────────────────────────────────────
export function switchToSingleMode(isEditing) {
	document.getElementById('edit-fields').style.display = 'block'
	document.getElementById('multi-wrap').style.display = 'none'
	document.getElementById('addMoreBtn').style.display = isEditing
		? 'none'
		: 'inline-flex'
}
export function switchToMultiMode() {
	document.getElementById('edit-fields').style.display = 'none'
	document.getElementById('multi-wrap').style.display = 'block'
	document.getElementById('addMoreBtn').style.display = 'inline-flex'
}

// ── СОСТОЯНИЯ ТАБЛИЦЫ ─────────────────────────────────────────────────────────
// showLoading/showError → используй showTableLoading/showTableError из utils.js
export const showLoading = () => showTableLoading('sales-tbody', 10)
export const showError = msg => showTableError('sales-tbody', 10, msg)
