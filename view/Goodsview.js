import {
	fillSelect,
	resetSelect,
	showTableError,
	showTableLoading,
} from '../services/utils.js'

export function renderKPI({ total, sum, avg }) {
	document.getElementById('kpi-total').textContent = total + ' шт.'
	document.getElementById('kpi-sum').textContent =
		sum.toLocaleString('ru-RU') + ' ₽'
	document.getElementById('kpi-avg').textContent =
		avg.toLocaleString('ru-RU') + ' ₽'
}

// НОВОЕ: принимает canDelete — если false, кнопка 🗑 не рендерится
export function renderTable(goods, { onSell, onEdit, onDelete, canDelete }) {
	document.getElementById('count-badge').textContent = goods.length + ' товаров'
	const tbody = document.getElementById('goods-tbody')

	if (!goods.length) {
		tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">📭</div>Ничего не найдено</div></td></tr>`
		return
	}

	tbody.innerHTML = goods
		.map(
			(g, i) => `<tr>
		<td class="text-soft">${i + 1}</td>
		<td><b>${g.name}</b></td>
		<td>${g.contractor}</td>
		<td>${g.saleDate ? new Date(g.saleDate).toLocaleDateString('ru-RU') : '—'}</td>
		<td class="text-center">${g.qty || 1}</td>
		<td class="text-soft text-sm">${g.barcode || '—'}</td>
		<td class="fw-600">${(g.price || 0).toLocaleString('ru-RU')} ₽</td>
		<td class="fw-600 text-accent">${g.sellPrice ? g.sellPrice.toLocaleString('ru-RU') + ' ₽' : '—'}</td>
		<td>
			<div class="actions-cell">
				<button class="action-btn sell-btn" data-id="${g.id}" title="Продать">💸</button>
				<button class="action-btn edit-btn" data-id="${g.id}" title="Редактировать">✏️</button>
				${canDelete ? `<button class="action-btn delete delete-btn" data-id="${g.id}" title="Удалить">🗑</button>` : ''}
			</div>
		</td>
	</tr>`,
		)
		.join('')

	tbody
		.querySelectorAll('.sell-btn')
		.forEach(b => b.addEventListener('click', () => onSell(b.dataset.id)))
	tbody
		.querySelectorAll('.edit-btn')
		.forEach(b => b.addEventListener('click', () => onEdit(b.dataset.id)))
	tbody
		.querySelectorAll('.delete-btn')
		.forEach(b => b.addEventListener('click', () => onDelete(b.dataset.id)))
}

export const fillContractorSelect = goods =>
	fillSelect('contractorFilter', goods, 'contractor')
export const resetContractorSelect = goods =>
	resetSelect('contractorFilter', goods, 'contractor')

export function renderMultiItems(multiItems, { onRemove, onPriceQtyChange }) {
	const list = document.getElementById('multi-items-list')
	list.innerHTML = multiItems
		.map(
			(item, i) => `
		<div class="item-row" data-index="${i}">
			<div class="item-row-header">
				<span>Товар ${i + 1}</span>
				${i > 0 ? `<button class="item-row-remove" data-remove="${i}">✕</button>` : ''}
			</div>
			<div class="modal-field"><label>Название</label><input type="text" data-field="name" value="${item.name}" /></div>
			<div class="modal-field"><label>Поставщик</label><input type="text" data-field="contractor" value="${item.contractor}" /></div>
			<div class="grid-3">
				<div class="modal-field"><label>Кол-во</label><input type="number" data-field="qty" value="${item.qty || 1}" min="1" /></div>
				<div class="modal-field"><label>Закуп. ₽</label><input type="number" data-field="price" value="${item.price || ''}" min="0" /></div>
				<div class="modal-field"><label>Прод. ₽</label><input type="number" data-field="sellPrice" value="${item.sellPrice || ''}" min="0" /></div>
			</div>
			<div class="grid-2">
				<div class="modal-field"><label>Штрих-код</label><input type="text" data-field="barcode" value="${item.barcode || ''}" /></div>
				<div class="modal-field"><label>Дата поступления</label><input type="date" data-field="date" value="${item.dateStr || ''}" /></div>
			</div>
		</div>`,
		)
		.join('')

	list
		.querySelectorAll('[data-remove]')
		.forEach(btn =>
			btn.addEventListener('click', () => onRemove(Number(btn.dataset.remove))),
		)
	list
		.querySelectorAll('[data-field="price"],[data-field="qty"]')
		.forEach(inp => inp.addEventListener('input', onPriceQtyChange))
}

export function updateMultiTotalDisplay(total) {
	document.getElementById('multi-total').textContent =
		total.toLocaleString('ru-RU') + ' ₽'
}

export function addSellRow(
	allGoods,
	preselected,
	{ onGoodChange, onQtyInput, onRemove },
) {
	const list = document.getElementById('sell-items-list')
	const idx = list.querySelectorAll('.sell-row').length
	const row = document.createElement('div')
	row.className = 'sell-row'
	if (preselected) row.dataset.goodId = preselected.id

	const options = allGoods
		.map(
			g =>
				`<option value="${g.id}" ${preselected && g.id === preselected.id ? 'selected' : ''}>${g.name} (${g.qty || 1} шт.)</option>`,
		)
		.join('')
	const stock = preselected?.qty || allGoods[0]?.qty || 1
	const sellPrice = preselected?.sellPrice || allGoods[0]?.sellPrice || ''
	const purchase = preselected?.price || allGoods[0]?.price || ''
	const barcode = preselected?.barcode || allGoods[0]?.barcode || ''

	row.innerHTML = `
		<div class="sell-row-header">
			<span>Позиция ${idx + 1}</span>
			${idx > 0 ? '<button class="sell-row-remove" data-remove-row>✕</button>' : ''}
		</div>
		<div class="modal-field"><label>Товар</label><select data-sf="good">${options}</select></div>
		<div class="grid-3">
			<div class="modal-field">
				<label>Кол-во</label>
				<input type="number" data-sf="qty" value="1" min="1" max="${stock}" />
				<div class="stock-hint">На складе: ${stock} шт.</div>
			</div>
			<div class="modal-field"><label>Цена продажи (₽)</label><input type="number" data-sf="price" value="${sellPrice}" min="0" readonly /></div>
			<div class="modal-field"><label>Закуп. цена (₽)</label><input type="number" data-sf="purchase" value="${purchase}" readonly /></div>
		</div>
		<div class="modal-field"><label>Штрих-код</label><input type="text" data-sf="barcode" value="${barcode}" readonly /></div>`

	row.querySelector('[data-sf="good"]').addEventListener('change', function () {
		onGoodChange(this, row)
	})
	row.querySelector('[data-sf="qty"]').addEventListener('input', function () {
		onQtyInput(this, row)
	})
	const removeBtn = row.querySelector('[data-remove-row]')
	if (removeBtn) removeBtn.addEventListener('click', () => onRemove(row))
	list.appendChild(row)
}

export function renumberSellRows() {
	document.querySelectorAll('.sell-row-header span').forEach((s, i) => {
		s.textContent = `Позиция ${i + 1}`
	})
}

export function switchToSingleMode(isEditing) {
	document.getElementById('edit-fields').style.display = 'block'
	document.getElementById('multi-items-wrap').style.display = 'none'
	document.getElementById('addMoreBtn').style.display = isEditing
		? 'none'
		: 'inline-flex'
}
export function switchToMultiMode() {
	document.getElementById('edit-fields').style.display = 'none'
	document.getElementById('multi-items-wrap').style.display = 'block'
	document.getElementById('addMoreBtn').style.display = 'inline-flex'
}

export function showSellError(msg) {
	const el = document.getElementById('sell-error')
	el.textContent = msg
	el.classList.remove('hidden')
	setTimeout(() => el.classList.add('hidden'), 4000)
}

export function setImportStatus(type, text) {
	const el = document.getElementById('importStatus')
	el.className = 'import-status' + (type ? ' show ' + type : '')
	el.textContent = text
}

export function showToast(msg) {
	let t = document.getElementById('toast')
	if (!t) {
		t = document.createElement('div')
		t.id = 'toast'
		t.className = 'toast'
		document.body.appendChild(t)
	}
	t.textContent = msg
	t.style.opacity = '1'
	setTimeout(() => {
		t.style.opacity = '0'
	}, 3000)
}

export const showLoading = () => showTableLoading('goods-tbody', 9)
export const showError = msg => showTableError('goods-tbody', 9, msg)
