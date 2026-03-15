// ── sales.js (ViewModel) ──────────────────────────────────────────────────────
// Точка входа страницы продаж. Только:
//   1. Загружает данные через сервисы
//   2. Передаёт в Model для обработки
//   3. Передаёт результат в View для отображения
// Никакой бизнес-логики и DOM-манипуляций здесь нет.

import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import {
	calcMultiProfit,
	calcSalesKPI,
	collectMultiItems,
	filterSales,
} from '../../models/salesModel.js'
import {
	addItem,
	deleteItem,
	getGoods,
	getSales,
	updateItem,
} from '../../services/firebaseService.js'
import { navigate, Routes } from '../../services/router.js'
import { normalizeDates } from '../../services/utils.js'
import {
	fillContractorFilter,
	fillGoodsDropdown,
	renderKPI,
	renderMultiRows,
	renderTable,
	resetContractorFilter,
	showError,
	showLoading,
	switchToMultiMode,
	switchToSingleMode,
	updateMultiProfitDisplay,
} from '../../view/salesView.js'

// ── СОСТОЯНИЕ ─────────────────────────────────────────────────────────────────
let allSales = []
let allGoods = []
let multiItems = []
let editingId = null
let deletingId = null

// ── СТАРТ ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
	// Дата в топбаре
	document.getElementById('sales-date').textContent = new Intl.DateTimeFormat(
		'ru-RU',
		{
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		},
	).format(new Date())

	showLoading()

	try {
		const [rawSales, rawGoods] = await Promise.all([getSales(), getGoods()])
		allSales = normalizeDates(rawSales)
		allGoods = normalizeDates(rawGoods)
		fillContractorFilter(allSales)
		refreshTable(allSales)
	} catch (e) {
		showError(e.message)
	}

	// ── ФИЛЬТРЫ ───────────────────────────────────────────────────────────────
	document.getElementById('applyBtn').addEventListener('click', () => {
		const filtered = filterSales(allSales, {
			contractor: document.getElementById('f-contractor').value,
			from: document.getElementById('f-from').value,
			to: document.getElementById('f-to').value,
		})
		refreshTable(filtered)
	})
	document.getElementById('resetBtn').addEventListener('click', () => {
		document.getElementById('f-contractor').value = ''
		document.getElementById('f-from').value = ''
		document.getElementById('f-to').value = ''
		refreshTable(allSales)
	})

	// Экспорт → страница отчётов
	document
		.getElementById('exportBtn')
		.addEventListener('click', () => navigate(Routes.REPORTS))

	// ── ОТКРЫТЬ МОДАЛКУ ДОБАВЛЕНИЯ ────────────────────────────────────────────
	document.getElementById('addSaleBtn').addEventListener('click', () => {
		editingId = null
		multiItems = []
		document.getElementById('modal-title').textContent = '➕ Новая продажа'
		clearModal()
		fillGoodsDropdown('m-good', allGoods)
		onGoodChange(document.getElementById('m-good').value)
		switchToSingleMode(false)
		document.getElementById('saleModal').classList.add('show')
	})

	document.getElementById('modalClose').addEventListener('click', closeModal)
	document.getElementById('modalCancel').addEventListener('click', closeModal)
	document.getElementById('saleModal').addEventListener('click', e => {
		if (e.target.id === 'saleModal') closeModal()
	})

	// Смена товара в одиночном дропдауне
	document.getElementById('m-good').addEventListener('change', function () {
		onGoodChange(this.value)
	})

	// Контроль кол-ва в одиночном режиме
	document.getElementById('m-qty').addEventListener('input', function () {
		const good = allGoods.find(
			g => g.id === document.getElementById('m-good').value,
		)
		const stock = good?.qty || 1
		if (Number(this.value) > stock) {
			this.value = stock
			setStockHint('m-stock-hint', `⚠️ Максимум ${stock} шт.!`, true)
		} else {
			setStockHint('m-stock-hint', `На складе: ${stock} шт.`, false)
		}
	})

	// + Добавить ещё позицию
	document.getElementById('addMoreBtn').addEventListener('click', onAddMore)

	// Сохранить
	document.getElementById('modalSave').addEventListener('click', onSave)

	// ── УДАЛЕНИЕ ──────────────────────────────────────────────────────────────
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
			const btn = document.getElementById('confirmDelete')
			btn.disabled = true
			btn.textContent = 'Удаление...'
			try {
				await deleteItem('sales', deletingId)
				await reloadData()
			} catch (e) {
				alert('Ошибка: ' + e.message)
			} finally {
				deletingId = null
				btn.disabled = false
				btn.textContent = 'Удалить'
				document.getElementById('confirmModal').classList.remove('show')
			}
		})
})

// ── ОБРАБОТЧИК: СМЕНА ТОВАРА ──────────────────────────────────────────────────
function onGoodChange(goodId) {
	const good = allGoods.find(g => g.id === goodId)
	if (!good) return
	const stock = good.qty || 1
	document.getElementById('m-price').value = good.sellPrice || ''
	document.getElementById('m-purchase').value = good.price || ''
	document.getElementById('m-barcode').value = good.barcode || ''
	document.getElementById('m-name').value = good.name || ''
	document.getElementById('m-contractor').value = good.contractor || ''
	document.getElementById('m-qty').max = stock
	setStockHint('m-stock-hint', `На складе: ${stock} шт.`, false)
}

// ── ОБРАБОТЧИК: СМЕНА ТОВАРА В МУЛЬТИ-СТРОКЕ ─────────────────────────────────
function onMultiGoodChange(sel) {
	const row = sel.closest('.sale-row')
	const good = allGoods.find(g => g.id === sel.value)
	if (!good) return
	const stock = good.qty || 1
	row.querySelector('[data-sf="price"]').value = good.sellPrice || ''
	row.querySelector('[data-sf="purchase"]').value = good.price || ''
	row.querySelector('[data-sf="barcode"]').value = good.barcode || ''
	row.querySelector('[data-sf="contractor"]').value = good.contractor || ''
	const qtyInp = row.querySelector('[data-sf="qty"]')
	qtyInp.max = stock
	qtyInp.value = 1
	row.querySelector('.stock-hint').textContent = `На складе: ${stock} шт.`
	row.querySelector('.stock-hint').className = 'stock-hint'
	recalcMultiProfit()
}

// ── ОБРАБОТЧИК: КОЛ-ВО/ЦЕНА В МУЛЬТИ-СТРОКЕ ─────────────────────────────────
function onMultiQtyPriceInput(inp) {
	const row = inp.closest('.sale-row')
	const max = Number(inp.max)
	if (inp.dataset.sf === 'qty' && max && Number(inp.value) > max) {
		inp.value = max
		row.querySelector('.stock-hint').textContent = `⚠️ Максимум ${max} шт.!`
		row.querySelector('.stock-hint').className = 'stock-hint warn'
	} else if (inp.dataset.sf === 'qty') {
		row.querySelector('.stock-hint').textContent = `На складе: ${max} шт.`
		row.querySelector('.stock-hint').className = 'stock-hint'
	}
	recalcMultiProfit()
}

// ── ОБРАБОТЧИК: УДАЛИТЬ СТРОКУ ────────────────────────────────────────────────
function onRemoveMultiRow(index) {
	const collected = collectMultiItems(allGoods)
	collected.splice(index, 1)
	multiItems = collected
	redrawMultiRows()
}

function redrawMultiRows() {
	renderMultiRows(multiItems, allGoods, {
		onGoodChange: onMultiGoodChange,
		onQtyPriceInput: onMultiQtyPriceInput,
		onRemove: onRemoveMultiRow,
	})
	recalcMultiProfit()
}

function recalcMultiProfit() {
	const rows = [...document.querySelectorAll('#multi-list .sale-row')]
	const profit = calcMultiProfit(rows)
	updateMultiProfitDisplay(profit)
}

// ── + ДОБАВИТЬ ЕЩЁ ПОЗИЦИЮ ───────────────────────────────────────────────────
function onAddMore() {
	if (multiItems.length === 0) {
		// Фиксируем текущую одиночную строку
		const goodId = document.getElementById('m-good').value
		const good = allGoods.find(g => g.id === goodId)
		if (!good) {
			alert('Выберите товар')
			return
		}
		const qty = Number(document.getElementById('m-qty').value) || 1
		if (qty > (good.qty || 1)) {
			alert(`На складе только ${good.qty || 1} шт.`)
			return
		}
		document.getElementById('m-date-multi').value =
			document.getElementById('m-date').value
		multiItems.push({
			goodId,
			name: good.name,
			contractor: good.contractor || '',
			qty,
			price: Number(document.getElementById('m-price').value) || 0,
			purchasePrice: good.price || 0,
			barcode: good.barcode || '',
		})
	}
	// Добавляем пустую строку с первым товаром из склада
	const g0 = allGoods[0]
	multiItems.push({
		goodId: g0?.id || '',
		name: g0?.name || '',
		contractor: g0?.contractor || '',
		qty: 1,
		price: g0?.sellPrice || 0,
		purchasePrice: g0?.price || 0,
		barcode: g0?.barcode || '',
	})
	redrawMultiRows()
	switchToMultiMode()
}

// ── СОХРАНИТЬ ─────────────────────────────────────────────────────────────────
async function onSave() {
	const btn = document.getElementById('modalSave')
	btn.disabled = true
	btn.textContent = 'Сохранение...'
	try {
		if (editingId) {
			// Редактирование
			const f = readEditFields()
			if (!f) return
			await updateItem('sales', editingId, f)
		} else if (multiItems.length > 0) {
			// Мульти-режим
			const items = collectMultiItems(allGoods)
			const dateStr = document.getElementById('m-date-multi').value
			if (!dateStr) {
				alert('Укажите дату продажи')
				return
			}
			const saleDate = Timestamp.fromDate(new Date(dateStr))
			for (const item of items) {
				if (!item.goodId) continue
				await addItem('sales', {
					name: item.name,
					contractor: item.contractor,
					price: Number(item.price) || 0,
					purchasePrice: Number(item.purchasePrice) || 0,
					qty: Number(item.qty) || 1,
					barcode: item.barcode || '',
					saleDate,
				})
				await deductStock(item.goodId, Number(item.qty) || 1)
			}
		} else {
			// Одиночный режим
			const goodId = document.getElementById('m-good').value
			const good = allGoods.find(g => g.id === goodId)
			if (!good) {
				alert('Выберите товар')
				return
			}
			const dateStr = document.getElementById('m-date').value
			const qty = Number(document.getElementById('m-qty').value) || 1
			const price = Number(document.getElementById('m-price').value) || 0
			if (!dateStr) {
				alert('Укажите дату продажи')
				return
			}
			if (qty > (good.qty || 1)) {
				alert(`На складе только ${good.qty || 1} шт.`)
				return
			}
			const saleDate = Timestamp.fromDate(new Date(dateStr))
			await addItem('sales', {
				name: good.name,
				contractor: document.getElementById('m-contractor').value,
				price,
				purchasePrice: good.price || 0,
				qty,
				barcode: good.barcode || '',
				saleDate,
			})
			await deductStock(goodId, qty)
		}
		await reloadData()
		closeModal()
	} catch (e) {
		alert('Ошибка: ' + e.message)
	} finally {
		btn.disabled = false
		btn.textContent = 'Сохранить'
	}
}

// ── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ───────────────────────────────────────────────────

// Читает поля формы редактирования
function readEditFields() {
	const name = document.getElementById('m-name').value.trim()
	const dateStr = document.getElementById('m-date').value
	if (!name || !dateStr) {
		alert('Заполните все поля')
		return null
	}
	return {
		name,
		contractor: document.getElementById('m-contractor').value.trim(),
		price: Number(document.getElementById('m-price').value) || 0,
		purchasePrice: Number(document.getElementById('m-purchase').value) || 0,
		qty: Number(document.getElementById('m-qty').value) || 1,
		barcode: document.getElementById('m-barcode').value.trim(),
		saleDate: Timestamp.fromDate(new Date(dateStr)),
	}
}

// Уменьшает кол-во товара на складе
async function deductStock(goodId, qty) {
	const good = allGoods.find(g => g.id === goodId)
	if (!good) return
	const newQty = (good.qty || 1) - qty
	newQty <= 0
		? await deleteItem('goods', goodId)
		: await updateItem('goods', goodId, { qty: newQty })
}

// Открыть редактирование записи
function openEdit(id) {
	const sale = allSales.find(s => s.id === id)
	if (!sale) return
	editingId = id
	multiItems = []
	document.getElementById('modal-title').textContent =
		'✏️ Редактировать продажу'
	// В режиме редактирования разблокируем поля
	;['m-name', 'm-barcode', 'm-purchase', 'm-contractor'].forEach(id => {
		const el = document.getElementById(id)
		el.removeAttribute('readonly')
	})
	document.getElementById('m-name').value = sale.name || ''
	document.getElementById('m-contractor').value = sale.contractor || ''
	document.getElementById('m-price').value = sale.price || ''
	document.getElementById('m-purchase').value = sale.purchasePrice || ''
	document.getElementById('m-qty').value = sale.qty || 1
	document.getElementById('m-barcode').value = sale.barcode || ''
	document.getElementById('m-date').value = sale.saleDate || ''
	document.getElementById('m-stock-hint').textContent = ''
	// Скрываем дропдаун товара при редактировании
	document
		.getElementById('single-sale-row')
		.querySelector('[id="m-good"]').parentElement.style.display = 'none'
	switchToSingleMode(true)
	document.getElementById('saleModal').classList.add('show')
}

// Открыть подтверждение удаления
function openDelete(id) {
	const sale = allSales.find(s => s.id === id)
	if (!sale) return
	deletingId = id
	document.getElementById('confirm-text').textContent =
		`«${sale.name}» — ${sale.contractor}. Это действие нельзя отменить.`
	document.getElementById('confirmModal').classList.add('show')
}

function closeModal() {
	editingId = null
	multiItems = []
	document.getElementById('saleModal').classList.remove('show')
	clearModal()
}

function clearModal() {
	;[
		'm-contractor',
		'm-price',
		'm-purchase',
		'm-barcode',
		'm-name',
		'm-date',
	].forEach(id => {
		const el = document.getElementById(id)
		if (el) {
			el.value = ''
			el.setAttribute('readonly', '')
		}
	})
	const goodField = document
		.getElementById('single-sale-row')
		?.querySelector('[id="m-good"]')?.parentElement
	if (goodField) goodField.style.display = 'block'
	document.getElementById('m-qty').value = 1
	document.getElementById('m-stock-hint').textContent = '—'
	document.getElementById('multi-list').innerHTML = ''
	document.getElementById('multi-profit').textContent = '0 ₽'
	document.getElementById('m-date-multi').value = ''
	// Всегда возвращаем одиночный режим при закрытии
	switchToSingleMode(false)
}

function setStockHint(id, text, isWarn) {
	const el = document.getElementById(id)
	el.textContent = text
	el.className = 'stock-hint' + (isWarn ? ' warn' : '')
}

function refreshTable(sales) {
	renderKPI(calcSalesKPI(sales))
	renderTable(sales, { onEdit: openEdit, onDelete: openDelete })
}

async function reloadData() {
	const [rawSales, rawGoods] = await Promise.all([getSales(), getGoods()])
	allSales = normalizeDates(rawSales)
	allGoods = normalizeDates(rawGoods)
	resetContractorFilter(allSales)
	refreshTable(allSales)
}
