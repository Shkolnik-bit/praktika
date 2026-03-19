// ── goods.js (ViewModel) ──────────────────────────────────────────────────────

import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import {
	addItem, // НОВОЕ: проверка сессии
	canDelete,
	deleteItem,
	getContractors,
	getGoods,
	requireAuth,
	updateItem,
} from '../services/firebaseService.js'
import { normalizeDates } from '../services/utils.js'
import {
	calcGoodsKPI,
	calcMultiTotal,
	collectMultiItems,
	filterAndSort,
	normalizeName,
	normKey,
	parseDate,
} from '../models/goodsModel.js'
import {
	addSellRow,
	fillContractorSelect,
	renderKPI,
	renderMultiItems,
	renderTable,
	renumberSellRows,
	resetContractorSelect,
	setImportStatus,
	showError,
	showLoading,
	showSellError,
	showToast,
	switchToMultiMode,
	switchToSingleMode,
	updateMultiTotalDisplay,
} from '../view/goodsView.js'

let allGoods = []
let importRows = []
let multiItems = []
let editingId = null
let deletingId = null

document.addEventListener('DOMContentLoaded', async () => {
	// НОВОЕ: проверяем сессию, получаем пользователя
	let currentUser
	try {
		currentUser = await requireAuth()
	} catch (e) {
		return // requireAuth сам редиректит на /login.html
	}

	// НОВОЕ: показываем имя и роль в сайдбаре (если элементы есть в HTML)
	const nameEl = document.getElementById('sidebar-user-name')
	const roleEl = document.getElementById('sidebar-user-role')
	if (nameEl) nameEl.textContent = currentUser.name || currentUser.email
	if (roleEl)
		roleEl.textContent =
			currentUser.role === 'admin' ? 'Администратор' : 'Менеджер'

	// НОВОЕ: кнопка логаута
	document.getElementById('logoutBtn')?.addEventListener('click', async () => {
		const { logout } = await import('../../services/firebaseService.js')
		await logout()
	})

	document.getElementById('goods-date').textContent = new Intl.DateTimeFormat(
		'ru-RU',
		{ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
	).format(new Date())

	showLoading()
	try {
		const raw = await getGoods()
		allGoods = normalizeDates(raw)
		fillContractorSelect(allGoods)
		refreshTable(allGoods)
	} catch (e) {
		showError(e.message)
	}

	document.getElementById('searchInput').addEventListener('input', applyFilters)
	document
		.getElementById('contractorFilter')
		.addEventListener('change', applyFilters)
	document.getElementById('sortSelect').addEventListener('change', applyFilters)
	document.getElementById('resetBtn').addEventListener('click', () => {
		document.getElementById('searchInput').value = ''
		document.getElementById('contractorFilter').value = ''
		document.getElementById('sortSelect').value = 'name'
		refreshTable(allGoods)
	})

	document.getElementById('addBtn').addEventListener('click', () => {
		editingId = null
		multiItems = []
		document.getElementById('good-modal-title').textContent = '➕ Новый товар'
		clearGoodModal()
		switchToSingleMode(false)
		document.getElementById('goodModal').classList.add('show')
	})
	document
		.getElementById('modalClose')
		.addEventListener('click', closeGoodModal)
	document
		.getElementById('modalCancel')
		.addEventListener('click', closeGoodModal)
	document.getElementById('goodModal').addEventListener('click', e => {
		if (e.target.id === 'goodModal') closeGoodModal()
	})

	document.getElementById('addMoreBtn').addEventListener('click', () => {
		if (multiItems.length === 0) {
			const first = readSingleFields()
			if (!first) return
			multiItems.push(first)
		}
		multiItems.push({
			name: '',
			contractor: '',
			qty: 1,
			barcode: '',
			price: '',
			sellPrice: '',
			dateStr: '',
		})
		redrawMultiItems()
		switchToMultiMode()
	})

	document.getElementById('modalSave').addEventListener('click', onSaveGood)

	document
		.getElementById('sellModalClose')
		.addEventListener('click', closeSellModal)
	document
		.getElementById('sellModalCancel')
		.addEventListener('click', closeSellModal)
	document.getElementById('sellModal').addEventListener('click', e => {
		if (e.target.id === 'sellModal') closeSellModal()
	})
	document.getElementById('sellAddMoreBtn').addEventListener('click', () => {
		addSellRow(allGoods, null, sellRowHandlers)
	})
	document.getElementById('sellSaveBtn').addEventListener('click', onSellSave)

	document.getElementById('confirmCancel').addEventListener('click', () => {
		deletingId = null
		document.getElementById('confirmModal').classList.remove('show')
	})
	document.getElementById('confirmModal').addEventListener('click', e => {
		if (e.target.id === 'confirmModal') {
			deletingId = null
			document.getElementById('confirmModal').classList.remove('show')
		}
	})
	document
		.getElementById('confirmDelete')
		.addEventListener('click', async () => {
			if (!deletingId) return
			// НОВОЕ: двойная проверка роли при подтверждении удаления
			if (!canDelete()) {
				alert('Недостаточно прав для удаления')
				return
			}
			const btn = document.getElementById('confirmDelete')
			btn.disabled = true
			btn.textContent = 'Удаление...'
			try {
				await deleteItem('goods', deletingId)
				await reloadGoods()
			} catch (e) {
				alert('Ошибка: ' + e.message)
			} finally {
				deletingId = null
				btn.disabled = false
				btn.textContent = 'Удалить'
				document.getElementById('confirmModal').classList.remove('show')
			}
		})

	document
		.getElementById('importBtn')
		.addEventListener('click', openImportModal)
	document
		.getElementById('importModalClose')
		.addEventListener('click', closeImportModal)
	document
		.getElementById('importModalCancel')
		.addEventListener('click', closeImportModal)
	document.getElementById('importModal').addEventListener('click', e => {
		if (e.target.id === 'importModal') closeImportModal()
	})
	const dropZone = document.getElementById('importDropZone')
	const fileInput = document.getElementById('importFileInput')
	dropZone.addEventListener('click', () => fileInput.click())
	dropZone.addEventListener('dragover', e => {
		e.preventDefault()
		dropZone.classList.add('drag-over')
	})
	dropZone.addEventListener('dragleave', () =>
		dropZone.classList.remove('drag-over'),
	)
	dropZone.addEventListener('drop', e => {
		e.preventDefault()
		dropZone.classList.remove('drag-over')
		handleFile(e.dataTransfer.files[0])
	})
	fileInput.addEventListener('change', e => handleFile(e.target.files[0]))
	document
		.getElementById('importConfirmBtn')
		.addEventListener('click', handleImportConfirm)
})

const sellRowHandlers = {
	onGoodChange(sel, row) {
		const good = allGoods.find(g => g.id === sel.value)
		if (!good) return
		const s = good.qty || 1
		row.dataset.goodId = good.id
		row.querySelector('[data-sf="price"]').value = good.sellPrice || ''
		row.querySelector('[data-sf="purchase"]').value = good.price || ''
		row.querySelector('[data-sf="barcode"]').value = good.barcode || ''
		row.querySelector('[data-sf="qty"]').max = s
		row.querySelector('[data-sf="qty"]').value = 1
		row.querySelector('.stock-hint').textContent = `На складе: ${s} шт.`
		row.querySelector('.stock-hint').className = 'stock-hint'
		document.getElementById('s-contractor').value = good.contractor || ''
	},
	onQtyInput(inp, row) {
		const max = Number(inp.max)
		const hint = row.querySelector('.stock-hint')
		if (Number(inp.value) > max) {
			inp.value = max
			hint.textContent = `⚠️ Максимум ${max} шт.!`
			hint.className = 'stock-hint warn'
		} else {
			hint.textContent = `На складе: ${max} шт.`
			hint.className = 'stock-hint'
		}
	},
	onRemove(row) {
		row.remove()
		renumberSellRows()
	},
}

async function onSaveGood() {
	const btn = document.getElementById('modalSave')
	btn.disabled = true
	btn.textContent = 'Сохранение...'
	try {
		if (editingId) {
			const f = readSingleFields()
			if (!f) return
			await updateItem('goods', editingId, {
				name: f.name,
				contractor: f.contractor,
				price: f.price,
				sellPrice: f.sellPrice,
				qty: f.qty,
				barcode: f.barcode,
				saleDate: Timestamp.fromDate(new Date(f.dateStr)),
			})
		} else if (multiItems.length > 0) {
			const items = collectMultiItems()
			const today = new Date().toISOString().slice(0, 10)
			const freshGoods = [...allGoods]
			for (const item of items) {
				if (!item.name || !item.contractor) continue
				const dup = findDuplicateByName(freshGoods, item.name)
				if (dup) {
					const newQty = (dup.qty || 1) + (Number(item.qty) || 1)
					await updateItem('goods', dup.id, {
						qty: newQty,
						price: Number(item.price) || dup.price,
						sellPrice: Number(item.sellPrice) || dup.sellPrice,
						barcode: item.barcode || dup.barcode,
					})
					dup.qty = newQty
				} else {
					const newGood = {
						name: item.name,
						contractor: item.contractor,
						price: Number(item.price) || 0,
						sellPrice: Number(item.sellPrice) || 0,
						qty: Number(item.qty) || 1,
						barcode: item.barcode || '',
						saleDate: Timestamp.fromDate(new Date(item.dateStr || today)),
					}
					await addItem('goods', newGood)
					freshGoods.push({ ...newGood, id: '_tmp_' + item.name })
				}
			}
		} else {
			const f = readSingleFields()
			if (!f) return
			const dup = findDuplicateByName(allGoods, f.name)
			if (dup) {
				const newQty = (dup.qty || 1) + (f.qty || 1)
				await updateItem('goods', dup.id, {
					qty: newQty,
					price: f.price || dup.price,
					sellPrice: f.sellPrice || dup.sellPrice,
					barcode: f.barcode || dup.barcode,
				})
				showToast(`🔗 «${f.name}» объединён — теперь ${newQty} шт.`)
			} else {
				await addItem('goods', {
					name: f.name,
					contractor: f.contractor,
					price: f.price,
					sellPrice: f.sellPrice,
					qty: f.qty,
					barcode: f.barcode,
					saleDate: Timestamp.fromDate(new Date(f.dateStr)),
				})
			}
		}
		await reloadGoods()
		closeGoodModal()
	} catch (e) {
		alert('Ошибка: ' + e.message)
	} finally {
		btn.disabled = false
		btn.textContent = 'Сохранить'
	}
}

async function onSellSave() {
	const contractor = document.getElementById('s-contractor').value.trim()
	const dateStr = document.getElementById('s-date').value
	if (!contractor || !dateStr) {
		showSellError('Заполните контрагента и дату')
		return
	}

	const rows = [...document.querySelectorAll('.sell-row')]
	const items = []
	for (const row of rows) {
		const good = allGoods.find(g => g.id === row.dataset.goodId)
		const qty = Number(row.querySelector('[data-sf="qty"]').value) || 1
		const price = Number(row.querySelector('[data-sf="price"]').value) || 0
		const barcode = row.querySelector('[data-sf="barcode"]').value || ''
		if (!good) continue
		if (qty > (good.qty || 1)) {
			showSellError(`«${good.name}»: на складе только ${good.qty || 1} шт.`)
			return
		}
		if (!price) {
			showSellError('Укажите цену продажи для всех товаров')
			return
		}
		items.push({ good, qty, price, barcode })
	}

	const btn = document.getElementById('sellSaveBtn')
	btn.disabled = true
	btn.textContent = '⏳ Сохранение...'
	try {
		const saleDate = Timestamp.fromDate(new Date(dateStr))
		for (const { good, qty, price, barcode } of items) {
			await addItem('sales', {
				name: good.name,
				contractor,
				price,
				purchasePrice: good.price || 0,
				qty,
				barcode,
				saleDate,
			})
			const newQty = (good.qty || 1) - qty
			newQty <= 0
				? await deleteItem('goods', good.id)
				: await updateItem('goods', good.id, { qty: newQty })
		}
		await reloadGoods()
		closeSellModal()
		showToast(`✅ Продано: ${items.map(i => i.good.name).join(', ')}`)
	} catch (e) {
		showSellError('Ошибка: ' + e.message)
	} finally {
		btn.disabled = false
		btn.textContent = '💸 Продать'
	}
}

function openImportModal() {
	importRows = []
	document.getElementById('importFileInput').value = ''
	document.getElementById('importConfirmBtn').disabled = true
	document
		.getElementById('importDropZone')
		.querySelector('.drop-zone-title').textContent =
		'Перетащите .xlsx файл сюда'
	document
		.getElementById('importDropZone')
		.querySelector('.drop-zone-sub').textContent = 'или нажмите для выбора'
	setImportStatus('', '')
	document.getElementById('importModal').classList.add('show')
}
function closeImportModal() {
	importRows = []
	document.getElementById('importModal').classList.remove('show')
}

function handleFile(file) {
	if (!file) return
	setImportStatus('loading', '⏳ Читаю файл...')
	document.getElementById('importConfirmBtn').disabled = true
	const reader = new FileReader()
	reader.onload = e => {
		try {
			const wb = XLSX.read(e.target.result, { type: 'array' })
			const ws = wb.Sheets[wb.SheetNames[0]]
			const raw = XLSX.utils.sheet_to_json(ws, { header: 1 })
			const dataRows = raw.filter((row, i) => {
				if (i === 0 && isNaN(Number(row[3]))) return false
				return row[0]
			})
			if (!dataRows.length) {
				setImportStatus('error', '❌ Файл пустой или неверный формат')
				return
			}
			importRows = dataRows
				.map(row => ({
					name: String(row[0] || '').trim(),
					contractor: String(row[1] || '').trim(),
					saleDate: parseDate(row[2]),
					price: Number(row[3]) || 0,
					sellPrice: Number(row[4]) || 0,
					barcode: String(row[5] || '').trim(),
					qty: Number(row[6]) || 1,
				}))
				.filter(r => r.name)
			if (!importRows.length) {
				setImportStatus('error', '❌ Нет данных для импорта')
				return
			}
			document
				.getElementById('importDropZone')
				.querySelector('.drop-zone-title').textContent = file.name
			document
				.getElementById('importDropZone')
				.querySelector('.drop-zone-sub').textContent =
				`${(file.size / 1024).toFixed(1)} KB`
			setImportStatus(
				'success',
				`✅ Распознано ${importRows.length} товаров — нажмите «Загрузить в базу»`,
			)
			document.getElementById('importConfirmBtn').disabled = false
		} catch (err) {
			setImportStatus('error', '❌ Ошибка: ' + err.message)
		}
	}
	reader.readAsArrayBuffer(file)
}

async function handleImportConfirm() {
	if (!importRows.length) return
	const btn = document.getElementById('importConfirmBtn')
	btn.disabled = true
	btn.textContent = '⏳ Загрузка...'
	setImportStatus('loading', '⏳ Проверяю контрагентов...')
	try {
		const existing = await getContractors()
		const contractorMap = {}
		existing.forEach(c => {
			contractorMap[normKey(c.name)] = normalizeName(c.name)
		})
		const uniqueNames = [
			...new Set(importRows.map(r => r.contractor).filter(Boolean)),
		]
		for (const rawName of uniqueNames) {
			const key = normKey(rawName)
			if (!contractorMap[key]) {
				const canonical = formatContractorName(rawName)
				await addItem('contractors', { name: canonical, email: '', phone: '' })
				contractorMap[key] = canonical
			}
		}
		let done = 0,
			merged = 0
		setImportStatus('loading', `⏳ Загружаю ${importRows.length} товаров...`)
		const freshGoods = [...allGoods]
		for (const row of importRows) {
			const saleDate = row.saleDate
				? Timestamp.fromDate(new Date(row.saleDate))
				: Timestamp.fromDate(new Date())
			const canonical =
				contractorMap[normKey(row.contractor)] || formatContractorName(row.contractor)
			const dup = findDuplicateByName(freshGoods, row.name)
			if (dup) {
				const newQty = (dup.qty || 1) + (row.qty || 1)
				await updateItem('goods', dup.id, {
					qty: newQty,
					price: row.price || dup.price,
					sellPrice: row.sellPrice || dup.sellPrice,
					barcode: row.barcode || dup.barcode,
				})
				dup.qty = newQty
				merged++
			} else {
				const newGood = {
					name: row.name,
					contractor: canonical,
					price: row.price,
					sellPrice: row.sellPrice,
					barcode: row.barcode,
					qty: row.qty,
					saleDate,
				}
				await addItem('goods', newGood)
				freshGoods.push({ ...newGood, id: '_tmp_' + row.name })
			}
			setImportStatus(
				'loading',
				`⏳ Обработано ${++done} из ${importRows.length}...`,
			)
		}
		setImportStatus(
			'success',
			`✅ Добавлено: ${done - merged}, объединено дублей: ${merged}`,
		)
		await reloadGoods()
		setTimeout(() => closeImportModal(), 1500)
	} catch (e) {
		setImportStatus('error', '❌ Ошибка: ' + e.message)
	} finally {
		btn.textContent = '⬆ Загрузить в базу'
	}
}

function findDuplicateByName(goods, name) {
	const nKey = n => (n || '').trim().replace(/\s+/g, ' ').toLowerCase()
	return goods.find(g => nKey(g.name) === nKey(name)) || null
}

function readSingleFields() {
	const name = document.getElementById('m-name').value.trim()
	const contractor = document.getElementById('m-contractor').value.trim()
	const dateStr = document.getElementById('m-date').value
	if (!name || !contractor || !dateStr) {
		alert('Заполните название, поставщика и дату')
		return null
	}
	return {
		name,
		contractor,
		dateStr,
		price: Number(document.getElementById('m-price').value) || 0,
		sellPrice: Number(document.getElementById('m-sell-price').value) || 0,
		qty: Number(document.getElementById('m-qty').value) || 1,
		barcode: document.getElementById('m-barcode').value.trim(),
	}
}

function redrawMultiItems() {
	renderMultiItems(multiItems, {
		onRemove(index) {
			multiItems = collectMultiItems()
			multiItems.splice(index, 1)
			redrawMultiItems()
		},
		onPriceQtyChange() {
			updateMultiTotalDisplay(
				calcMultiTotal([...document.querySelectorAll('.item-row')]),
			)
		},
	})
	updateMultiTotalDisplay(
		calcMultiTotal([...document.querySelectorAll('.item-row')]),
	)
}

function openEdit(id) {
	const g = allGoods.find(x => x.id === id)
	if (!g) return
	editingId = id
	multiItems = []
	document.getElementById('good-modal-title').textContent =
		'✏️ Редактировать товар'
	document.getElementById('m-name').value = g.name || ''
	document.getElementById('m-contractor').value = g.contractor || ''
	document.getElementById('m-price').value = g.price || ''
	document.getElementById('m-sell-price').value = g.sellPrice || ''
	document.getElementById('m-qty').value = g.qty || 1
	document.getElementById('m-barcode').value = g.barcode || ''
	document.getElementById('m-date').value = g.saleDate || ''
	switchToSingleMode(true)
	document.getElementById('goodModal').classList.add('show')
}

// НОВОЕ: проверяем роль перед показом модалки удаления
function openDelete(id) {
	if (!canDelete()) {
		showToast('🚫 Удаление доступно только администратору')
		return
	}
	const g = allGoods.find(x => x.id === id)
	if (!g) return
	deletingId = id
	document.getElementById('confirm-text').textContent =
		`«${g.name}» будет удалён из каталога. Это действие нельзя отменить.`
	document.getElementById('confirmModal').classList.add('show')
}

function openSell(id) {
	const g = allGoods.find(x => x.id === id)
	if (!g) return
	document.getElementById('s-contractor').value = g.contractor || ''
	document.getElementById('s-date').value = new Date()
		.toISOString()
		.slice(0, 10)
	document.getElementById('sell-items-list').innerHTML = ''
	document.getElementById('sell-error').classList.add('hidden')
	addSellRow(allGoods, g, sellRowHandlers)
	document.getElementById('sellModal').classList.add('show')
}

function formatContractorName(str) {
    const abbrs = [
        'ооо', 'оао', 'зао', 'пао', 'ао',
        'ип', 'пбоюл',
        'гуп', 'муп', 'фгуп', 'фгбу', 'фгку', 'фгаоу',
        'унп', 'гп',
        'нко', 'ано', 'нао', 'но',
        'фонд', 'снт', 'тсж', 'жск', 'гск',
        'пк', 'спк', 'нп', 'сро',
        'кфх', 'фл', 'юл',
    ]
    return str
        .split(' ')
        .map(word => {
            if (abbrs.includes(word.toLowerCase())) {
                return word.toUpperCase()
            }
            return word.charAt(0).toUpperCase() + word.slice(1)
        })
        .join(' ')
}

function closeGoodModal() {
	editingId = null
	multiItems = []
	document.getElementById('goodModal').classList.remove('show')
	clearGoodModal()
}
function clearGoodModal() {
	;[
		'm-name',
		'm-contractor',
		'm-price',
		'm-sell-price',
		'm-barcode',
		'm-date',
	].forEach(id => {
		document.getElementById(id).value = ''
	})
	document.getElementById('m-qty').value = 1
	document.getElementById('multi-items-list').innerHTML = ''
	document.getElementById('multi-total').textContent = '0 ₽'
}
function closeSellModal() {
	document.getElementById('sellModal').classList.remove('show')
	document.getElementById('sell-items-list').innerHTML = ''
	document.getElementById('sell-error').classList.add('hidden')
}

function applyFilters() {
	const result = filterAndSort(allGoods, {
		search: document.getElementById('searchInput').value.toLowerCase(),
		contractor: document.getElementById('contractorFilter').value,
		sort: document.getElementById('sortSelect').value,
	})
	refreshTable(result)
}

// НОВОЕ: передаём canDelete() в renderTable чтобы View знал показывать ли кнопку удаления
function refreshTable(goods) {
	renderKPI(calcGoodsKPI(goods))
	renderTable(goods, {
		onSell: openSell,
		onEdit: openEdit,
		onDelete: openDelete,
		canDelete: canDelete(),
	})
}

async function reloadGoods() {
	const raw = await getGoods()
	allGoods = normalizeDates(raw)
	resetContractorSelect(allGoods)
	refreshTable(allGoods)
}
