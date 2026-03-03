// viewmodels/ReportViewModel.js
import ExcelService from '../services/ExcelService.js'

class ReportViewModel {
	constructor(goodsData = []) {
		this.goods = goodsData // массив объектов SoldGood
	}

	// Фильтруем данные
	getFilteredData({
		minRating = 0,
		startDate = null,
		endDate = null,
		contractor = null,
	} = {}) {
		return this.goods.filter(good => {
			const saleDate = new Date(good.saleDate)
			return (
				good.rating >= minRating &&
				(!startDate || saleDate >= startDate) &&
				(!endDate || saleDate <= endDate) &&
				(!contractor || good.contractor === contractor)
			)
		})
	}

	// Экспорт в Excel выбранных данных
	async exportReport(config, filename = 'report.xlsx') {
		const filtered = this.getFilteredData(config)
		await ExcelService.exportToExcel(filtered, filename)
	}

	// Импорт из Excel
	async importReport(filename) {
		const importedData = await ExcelService.importFromExcel(filename)
		this.goods = importedData // обновляем внутренние данные
		return importedData
	}
}

export default ReportViewModel
