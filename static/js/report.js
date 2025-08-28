// static/js/report.js

document.addEventListener('DOMContentLoaded', function() {
    // --- KHAI BÁO BIẾN ---
    const reportTypeSelect = document.getElementById('report-type-select');
    const itemSelect = document.getElementById('item-select');
    const reportContainer = document.getElementById('report-container');
    const mainContainer = document.querySelector('.container-fluid[data-report-type]');
    
    // Biến để lưu trữ biểu đồ, giúp hủy biểu đồ cũ trước khi vẽ cái mới
    let mainChart = null;

    // --- CÁC HÀM RENDER GIAO DIỆN ---

    /**
     * Hiển thị tiêu đề của báo cáo
     */
    function renderReportTitle(data, reportType) {
        const reportTitle = document.getElementById('report-title');
        if (reportType === 'session') {
            reportTitle.innerHTML = `Báo cáo Phiên tập: <span class="text-primary">${data.session_name}</span>`;
        } else {
            reportTitle.innerHTML = `Báo cáo Xạ thủ: <span class="text-primary">${data.soldier_rank} ${data.soldier_name}</span>`;
        }
    }

    /**
     * Hiển thị các thẻ thông số chính (KPIs)
     */
    function renderKpiCards(data, reportType) {
        const kpiContainer = document.getElementById('kpi-cards-container');
        let stats = reportType === 'session' ? data : data.overall_stats;
        
        kpiContainer.innerHTML = `
            <div class="col-md-3">
                <div class="card stat-card shadow-sm">
                    <div class="card-body">
                        <div class="stat-value text-primary">${stats.total_shots}</div>
                        <div class="stat-label">Tổng phát bắn</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stat-card shadow-sm" style="border-left-color: var(--bs-success);">
                    <div class="card-body">
                        <div class="stat-value text-success">${stats.avg_score}</div>
                        <div class="stat-label">Điểm trung bình</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stat-card shadow-sm" style="border-left-color: var(--bs-warning);">
                    <div class="card-body">
                        <div class="stat-value text-warning">${stats.hit_rate}%</div>
                        <div class="stat-label">Tỷ lệ trúng</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stat-card shadow-sm" style="border-left-color: var(--bs-info);">
                    <div class="card-body">
                        <div class="stat-value text-info">${reportType === 'session' ? data.soldiers_performance.length : stats.total_sessions}</div>
                        <div class="stat-label">${reportType === 'session' ? 'Xạ thủ tham gia' : 'Phiên tham gia'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Hiển thị bảng dữ liệu chi tiết
     */
    function renderDetailsTable(data, reportType) {
        const tableContainer = document.getElementById('details-table-container');
        const tableTitle = document.getElementById('table-title');
        let tableHtml = '<table class="table table-striped table-hover"><thead><tr>';
        let items = [];

        if (reportType === 'session') {
            tableTitle.textContent = 'Thành tích Xạ thủ';
            tableHtml += '<th>#</th><th>Tên Xạ thủ</th><th>Điểm TB</th><th>Số phát bắn</th></tr></thead><tbody>';
            items = data.soldiers_performance;
            items.forEach((item, index) => {
                tableHtml += `<tr><td>${index + 1}</td><td>${item.rank} ${item.name}</td><td>${item.avg_score}</td><td>${item.total_shots}</td></tr>`;
            });
        } else {
            tableTitle.textContent = 'Lịch sử Phiên tập';
            tableHtml += '<th>#</th><th>Tên Phiên</th><th>Điểm TB</th><th>Số phát bắn</th></tr></thead><tbody>';
            items = data.sessions_performance;
            items.forEach((item, index) => {
                tableHtml += `<tr><td>${index + 1}</td><td>${item.session_name}</td><td>${item.avg_score}</td><td>${item.total_shots}</td></tr>`;
            });
        }

        tableHtml += '</tbody></table>';
        tableContainer.innerHTML = tableHtml;
    }

    /**
     * Vẽ biểu đồ chính
     */
    function renderMainChart(data, reportType) {
        const ctx = document.getElementById('main-chart').getContext('2d');
        let chartConfig = {};

        if (mainChart) {
            mainChart.destroy(); // Hủy biểu đồ cũ nếu có
        }

        if (reportType === 'session') {
            chartConfig = {
                type: 'bar',
                data: {
                    labels: data.soldiers_performance.map(s => `${s.rank} ${s.name}`),
                    datasets: [{
                        label: 'Điểm trung bình',
                        data: data.soldiers_performance.map(s => s.avg_score),
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: { y: { beginAtZero: true, max: 10 } },
                    responsive: true,
                    plugins: { legend: { display: false }, title: { display: true, text: 'So sánh Điểm trung bình các Xạ thủ' } }
                }
            };
        } else {
            chartConfig = {
                type: 'line',
                data: {
                    labels: data.sessions_performance.map(s => s.session_name).reverse(),
                    datasets: [{
                        label: 'Điểm trung bình',
                        data: data.sessions_performance.map(s => s.avg_score).reverse(),
                        fill: false,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }]
                },
                options: {
                    scales: { y: { beginAtZero: true, max: 10 } },
                    responsive: true,
                    plugins: { legend: { display: false }, title: { display: true, text: 'Biểu đồ Tiến bộ qua các Phiên tập' } }
                }
            };
        }
        mainChart = new Chart(ctx, chartConfig);
    }

    // --- CÁC HÀM LOGIC CHÍNH ---

    async function populateItemSelect(reportType) {
        let apiUrl = (reportType === 'session') ? '/api/training_sessions' : '/api/soldiers';
        
        itemSelect.innerHTML = '<option>Đang tải danh sách...</option>';
        itemSelect.disabled = true;

        try {
            const response = await fetch(apiUrl);
            const items = await response.json();
            itemSelect.innerHTML = `<option value="">-- Vui lòng chọn một mục --</option>`;
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = (reportType === 'session') ? (item.session_name || `Phiên tập #${item.id}`) : `${item.rank} ${item.name}`;
                itemSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Lỗi khi tải danh sách:', error);
            itemSelect.innerHTML = '<option>Lỗi tải dữ liệu</option>';
        } finally {
            itemSelect.disabled = false;
        }
    }

    async function generateReport(reportType, reportId) {
        if (!reportType || !reportId) return;

        console.log(`Yêu cầu tạo báo cáo: Loại=${reportType}, ID=${reportId}`);
        reportContainer.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-3 text-muted">Đang tải dữ liệu báo cáo...</p>
            </div>`;
        
        try {
            const response = await fetch(`/api/report/${reportType}/${reportId}`);
            const data = await response.json();

            // Xóa spinner và render giao diện báo cáo
            reportContainer.innerHTML = `
                <h3 id="report-title" class="mb-3"></h3>
                <div class="row g-3 mb-4" id="kpi-cards-container"></div>
                <div class="row g-3">
                    <div class="col-lg-8">
                        <div id="chart-container"><canvas id="main-chart"></canvas></div>
                    </div>
                    <div class="col-lg-4">
                        <div class="card shadow-sm h-100">
                            <div class="card-header fw-bold" id="table-title"></div>
                            <div class="card-body" id="details-table-container"></div>
                        </div>
                    </div>
                </div>
            `;

            // Gọi các hàm render chi tiết
            renderReportTitle(data, reportType);
            renderKpiCards(data, reportType);
            renderDetailsTable(data, reportType);
            renderMainChart(data, reportType);

        } catch (error) {
            console.error('Lỗi khi tạo báo cáo:', error);
            reportContainer.innerHTML = `<p class="text-center text-danger p-5">Không thể tải dữ liệu báo cáo.</p>`;
        }
    }

    // --- GÁN SỰ KIỆN ---

    reportTypeSelect.addEventListener('change', () => {
        populateItemSelect(reportTypeSelect.value);
        reportContainer.innerHTML = '<h3 id="report-title" class="mb-3">Vui lòng chọn một mục để xem báo cáo</h3>';
    });

    itemSelect.addEventListener('change', () => {
        if (itemSelect.value) {
            generateReport(reportTypeSelect.value, itemSelect.value);
        }
    });

    // --- KHỞI CHẠY LẦN ĐẦU ---

    async function initializePage() {
        const initialReportType = mainContainer.dataset.reportType;
        const initialReportId = mainContainer.dataset.reportId;
        
        if (initialReportType && initialReportType !== 'none' && initialReportId !== '0') {
            reportTypeSelect.value = initialReportType;
            await populateItemSelect(initialReportType);
            itemSelect.value = initialReportId;
            await generateReport(initialReportType, initialReportId);
        } else {
            await populateItemSelect(reportTypeSelect.value);
        }
    }
    
    initializePage();
});