// ── utils.js ──────────────────────────────────────────────────────────────────
// Общие утилиты для всего проекта.
// Импортируй нужное — не дублируй в каждом файле.

// ── ДАТА ──────────────────────────────────────────────────────────────────────

// Firestore Timestamp или строка → 'YYYY-MM-DD'
export const toDateStr = val => {
	if (!val) return ''
	if (val?.toDate) return val.toDate().toISOString().slice(0, 10)
	return String(val).slice(0, 10)
}

// Нормализует массив записей: конвертирует saleDate в строку
export const normalizeDates = (items, field = 'saleDate') =>
	items.map(item => ({ ...item, [field]: toDateStr(item[field]) }))

// Устанавливает текущую дату в элемент
export function setPageDate(elementId) {
	document.getElementById(elementId).textContent = new Intl.DateTimeFormat(
		'ru-RU',
		{
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		},
	).format(new Date())
}

// ── ТАБЛИЦА ───────────────────────────────────────────────────────────────────

// Показывает состояние загрузки в tbody
export function showTableLoading(tbodyId, colspan) {
	document.getElementById(tbodyId).innerHTML =
		`<tr><td colspan="${colspan}" class="table-state">⏳ Загрузка...</td></tr>`
}

// Показывает ошибку в tbody
export function showTableError(tbodyId, colspan, msg) {
	document.getElementById(tbodyId).innerHTML =
		`<tr><td colspan="${colspan}" class="table-state table-state--error">❌ Ошибка: ${msg}</td></tr>`
}

// ── МОДАЛКИ ───────────────────────────────────────────────────────────────────

// Вешает обработчик закрытия модалки по клику на оверлей + кнопки
export function bindModalClose(overlayId, closeFn, ...closeBtnIds) {
	document.getElementById(overlayId).addEventListener('click', e => {
		if (e.target.id === overlayId) closeFn()
	})
	closeBtnIds.forEach(id =>
		document.getElementById(id)?.addEventListener('click', closeFn),
	)
}

// Открывает модалку
export const openModal = id => document.getElementById(id).classList.add('show')
// Закрывает модалку
export const closeModal = id =>
	document.getElementById(id).classList.remove('show')

// ── КНОПКА СОХРАНЕНИЯ ─────────────────────────────────────────────────────────

// Блокирует кнопку на время async-операции, восстанавливает после
export async function withSaving(btnId, label, asyncFn) {
	const btn = document.getElementById(btnId)
	btn.disabled = true
	btn.textContent = 'Сохранение...'
	try {
		await asyncFn()
	} finally {
		btn.disabled = false
		btn.textContent = label
	}
}

// ── ДРОПДАУН ─────────────────────────────────────────────────────────────────

// Заполняет select уникальными значениями из массива объектов
export function fillSelect(selectId, items, valueKey, labelFn) {
	const sel = document.getElementById(selectId)
	;[...new Set(items.map(i => i[valueKey]).filter(Boolean))]
		.sort()
		.forEach(val => {
			const o = document.createElement('option')
			o.value = val
			o.textContent = labelFn ? labelFn(val) : val
			sel.appendChild(o)
		})
}

// Сбрасывает select до первого пункта и перезаполняет
export function resetSelect(selectId, items, valueKey, labelFn) {
	const sel = document.getElementById(selectId)
	while (sel.options.length > 1) sel.remove(1)
	fillSelect(selectId, items, valueKey, labelFn)
}

// ── ВИДИМОСТЬ ─────────────────────────────────────────────────────────────────
export const show = el => el.classList.remove('hidden')
export const hide = el => el.classList.add('hidden')
