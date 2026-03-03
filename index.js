// index.js
import SoldGood from './models/SoldGood.js'
import ReportViewModel from './viewmodels/ReportViewModel.js'

async function main() {
	const goods = [
		new SoldGood('Товар 1', 'Поставщик 1', 5, '2026-03-01', 100),
		new SoldGood('Товар 2', 'Поставщик 2', 3, '2026-02-20', 200),
		new SoldGood('Товар 3', 'Поставщик 1', 4, '2026-03-02', 150),
	]

	const vm = new ReportViewModel(goods)

	// Экспорт в Excel
	await vm.exportReport(
		{
			minRating: 4,
			startDate: new Date('2026-02-01'),
			endDate: new Date('2026-03-31'),
		},
		'exported-report.xlsx',
	)

	// Импорт из Excel
	const imported = await vm.importReport('exported-report.xlsx')
	console.log('Импортированные данные:', imported)

	// Экспорт снова после фильтрации по поставщику
	await vm.exportReport({ contractor: 'Поставщик 1' }, 'filtered-report.xlsx')
}

main()
