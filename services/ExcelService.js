// services/ExcelService.js
import ExcelJS from 'exceljs'

class ExcelService {
	/**
	 * Экспорт JSON данных в Excel
	 * @param {Array} data - массив объектов SoldGood
	 * @param {string} filename - имя создаваемого файла
	 */
	static async exportToExcel(data, filename = 'report.xlsx') {
		const workbook = new ExcelJS.Workbook()
		const worksheet = workbook.addWorksheet('Товары')

		worksheet.columns = [
			{ header: 'Название', key: 'name', width: 20 },
			{ header: 'Контрагент', key: 'contractor', width: 20 },
			{ header: 'Рейтинг', key: 'rating', width: 10 },
			{ header: 'Дата продажи', key: 'saleDate', width: 20 },
			{ header: 'Цена', key: 'price', width: 10 },
		]

		data.forEach(item => {
			worksheet.addRow({
				name: item.name,
				contractor: item.contractor,
				rating: item.rating,
				saleDate: item.saleDate,
				price: item.price,
			})
		})

		await workbook.xlsx.writeFile(filename)
		console.log(`Файл ${filename} создан!`)
	}

	/**
	 * Импорт Excel → JSON
	 * @param {string} filename - путь к Excel файлу
	 * @returns {Array} массив объектов SoldGood
	 */
	static async importFromExcel(filename) {
		const workbook = new ExcelJS.Workbook()
		await workbook.xlsx.readFile(filename)
		const worksheet = workbook.worksheets[0] // берем первую страницу

		const data = []
		worksheet.eachRow((row, rowNumber) => {
			if (rowNumber === 1) return // пропускаем заголовок
			const [name, contractor, rating, saleDate, price] = row.values.slice(1)
			data.push({
				name,
				contractor,
				rating,
				saleDate,
				price,
			})
		})

		console.log(`Импортировано ${data.length} записей из ${filename}`)
		return data
	}
}

export default ExcelService
