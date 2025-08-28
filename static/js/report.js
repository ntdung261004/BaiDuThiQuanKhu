// static/js/report.js

document.addEventListener('DOMContentLoaded', function() {
    // --- KHAI BÁO BIẾN ---
    const reportTypeSelect = document.getElementById('report-type-select');
    const itemSelect = document.getElementById('item-select');
    const reportContainer = document.getElementById('report-container');
    const mainContainer = document.querySelector('.container-fluid[data-report-type]');
    
    Chart.register(ChartDataLabels);

    // Biến để lưu trữ biểu đồ, giúp hủy biểu đồ cũ trước khi vẽ cái mới
    let mainChart = null;

    // --- CÁC HÀM RENDER GIAO DIỆN ---

    /**
     * Hiển thị tiêu đề của báo cáo
     */
    function renderReportTitle(data, reportType) {
        const reportTitle = document.getElementById('report-title');
        if (reportType === 'session') {
            reportTitle.innerHTML = `Báo cáo Phiên tập: <span class="text-primary">${data.session_name}</span>
                             <p class="text-muted fs-6 mb-0">${data.exercise_name}</p>`;
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
    // Thay thế hoàn toàn hàm renderDetailsTable hiện tại của bạn bằng hàm này

    /**
     * Hiển thị bảng dữ liệu chi tiết, có khả năng lọc theo bài tập
     */
    function renderDetailsTable(data, reportType, exerciseFilter = 'all') {
        const tableContainer = document.getElementById('details-table-container');
        const tableTitle = document.getElementById('table-title');
        let tableHtml = '<table class="table table-striped table-hover"><thead><tr>';
        let items = [];

        if (reportType === 'session') {
            tableTitle.textContent = 'Thành tích Xạ thủ';
            tableHtml += '<th>#</th><th>Tên Xạ thủ</th><th>Điểm TB</th><th>Số phát bắn</th><th>Tỷ lệ trúng</th><th>Phân tích</th></tr></thead><tbody>';
            
            items = data.soldiers_performance;
            items.forEach((item, index) => {
                const hitRate = item.total_shots > 0 ? ((item.hit_shots / item.total_shots) * 100).toFixed(0) : 0;
                tableHtml += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.rank} ${item.name}</td>
                        <td>${item.avg_score}</td>
                        <td>${item.total_shots}</td>
                        <td>${item.hit_shots}/${item.total_shots} - <strong>${hitRate}%</strong></td>
                        <td><a href="#" class="view-process-btn" data-soldier-id="${item.id}" data-session-id="${data.session_id}">Xem quá trình</a></td>
                    </tr>
                `;
            });
        } else { // reportType === 'soldier'
            const filterText = exerciseFilter === 'all' ? 'Tất cả bài tập' : exerciseFilter;
            tableTitle.textContent = `Lịch sử Phiên tập - ${filterText}`;
            
            // <<< SỬA LẠI TIÊU ĐỀ BẢNG: Bỏ cột "Bài tập", thêm cột "Phân tích" >>>
            tableHtml += '<th>#</th><th>Tên Phiên</th><th>Điểm TB</th><th>Số phát bắn</th><th>Tỷ lệ trúng</th><th>Phân tích</th></tr></thead><tbody>';
            
            items = (exerciseFilter === 'all')
                ? data.sessions_performance
                : data.sessions_performance.filter(s => s.exercise_name === exerciseFilter);

            if (items.length === 0) {
                tableHtml += '<tr><td colspan="5" class="text-center text-muted p-3">Không có dữ liệu cho lựa chọn này.</td></tr>';
            } else {
                items.forEach((item, index) => {
                    const hitRate = item.total_shots > 0 ? ((item.hit_shots / item.total_shots) * 100).toFixed(0) : 0;
                
                    // <<< SỬA LẠI NỘI DUNG HÀNG: Bỏ tên bài tập, thêm link "Xem quá trình" >>>
                    tableHtml += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.session_name}</td>
                            <td>${item.avg_score}</td>
                            <td>${item.total_shots}</td>
                            <td>${item.hit_shots}/${item.total_shots} - <strong>${hitRate}%</strong></td>
                            <td><a href="#" class="view-process-btn" data-session-id="${item.session_id}" data-soldier-id="${data.soldier_id}">Xem quá trình</a></td>
                        </tr>
                    `;
                });
            }
        }

        tableHtml += '</tbody></table>';
        tableContainer.innerHTML = tableHtml;
    }
    /**
     * Vẽ biểu đồ chính
     */
    // Thay thế hoàn toàn hàm renderMainChart cũ
    /**
     * Vẽ biểu đồ chính, có khả năng thay đổi dựa vào bộ lọc
     */
    function renderMainChart(data, reportType, exerciseFilter = 'all') {
        const ctx = document.getElementById('main-chart').getContext('2d');
        let chartConfig = {};

        if (mainChart) {
            mainChart.destroy(); // Hủy biểu đồ cũ nếu có
        }

        if (reportType === 'session') {
            // --- Vẽ biểu đồ cho Báo cáo Phiên tập (giữ nguyên) ---
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
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'So sánh Điểm trung bình các Xạ thủ' },
                        datalabels: {
                            anchor: 'end', align: 'top', color: '#495057',
                            font: { weight: 'bold' },
                            formatter: (value) => Math.round(value * 10) / 10
                        }
                    }
                }
            };
        } else { // reportType === 'soldier'
            // --- LOGIC MỚI: Vẽ biểu đồ cho Báo cáo Chiến sĩ dựa vào bộ lọc ---
            if (exerciseFilter === 'all') {
                // Nếu chọn "Tất cả", vẽ biểu đồ cột so sánh các bài tập
                chartConfig = {
                    type: 'bar',
                    data: {
                        labels: data.performance_by_exercise.map(e => e.exercise_name),
                        datasets: [{
                            label: 'Điểm trung bình',
                            data: data.performance_by_exercise.map(e => e.avg_score),
                            backgroundColor: 'rgba(75, 192, 192, 0.6)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: { y: { beginAtZero: true, max: 10 } },
                        responsive: true,
                        plugins: {
                            legend: { display: false },
                            title: { display: true, text: 'So sánh Điểm trung bình theo Bài tập' }
                        }
                    }
                };
            } else {
                // Nếu chọn 1 bài tập cụ thể, vẽ biểu đồ đường thể hiện tiến độ
                const filteredSessions = data.sessions_performance.filter(s => s.exercise_name === exerciseFilter);
                chartConfig = {
                    type: 'line',
                    data: {
                        labels: filteredSessions.map(s => s.session_name).reverse(),
                        datasets: [{
                            label: 'Điểm trung bình',
                            data: filteredSessions.map(s => s.avg_score).reverse(),
                            fill: false,
                            borderColor: 'rgb(255, 99, 132)',
                            tension: 0.1
                        }]
                    },
                    options: {
                        scales: { y: { beginAtZero: true, max: 10 } },
                        responsive: true,
                        plugins: {
                            legend: { display: false },
                            title: { display: true, text: `Tiến độ bài tập "${exerciseFilter}"` }
                        }
                    }
                };
            }
        }
        mainChart = new Chart(ctx, chartConfig);
    }
    /**
     * Vẽ bộ lọc bài tập cho báo cáo chiến sĩ
     */
    function renderExerciseFilter(data) {
        // Tìm đến vị trí sẽ đặt bộ lọc (chúng ta sẽ tạo vị trí này ở dưới)
        const filterContainer = document.getElementById('chart-filter-container');
        if (!filterContainer) return;

        // Lấy ra danh sách các bài tập mà chiến sĩ đã thực hiện
        const exercises = data.performance_by_exercise || [];

        // Tạo HTML cho bộ lọc
        let filterHtml = `
            <div class="d-flex justify-content-end align-items-center">
                <label for="exercise-filter-select" class="form-label me-2 mb-0 small">Lọc theo bài tập:</label>
                <select class="form-select form-select-sm w-auto" id="exercise-filter-select">
                    <option value="all">Tất cả bài tập</option>
        `;

        exercises.forEach(ex => {
            filterHtml += `<option value="${ex.exercise_name}">${ex.exercise_name}</option>`;
        });

        filterHtml += `</select></div>`;

        // Đưa bộ lọc vào giao diện
        filterContainer.innerHTML = filterHtml;
        // <<< THÊM KHỐI CODE NÀY ĐỂ GÁN SỰ KIỆN >>>
        const exerciseFilterSelect = document.getElementById('exercise-filter-select');
        if (exerciseFilterSelect) {
            exerciseFilterSelect.addEventListener('change', () => {
                const selectedExercise = exerciseFilterSelect.value;
                // Gọi lại hàm vẽ biểu đồ với giá trị bộ lọc mới
                renderMainChart(data, 'soldier', selectedExercise);
                renderDetailsTable(data, 'soldier', selectedExercise); 
            });
        }
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
                
                // <<< DÒNG NÀY ĐÃ ĐƯỢC SỬA LẠI ĐỂ THÊM TÊN BÀI TẬP >>>
                option.textContent = (reportType === 'session') 
                    ? `${item.session_name || `Phiên tập #${item.id}`} (${item.exercise_name})` 
                    : `${item.rank} ${item.name}`;

                itemSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Lỗi khi tải danh sách:', error);
            itemSelect.innerHTML = '<option>Lỗi tải dữ liệu</option>';
        } finally {
            itemSelect.disabled = false;
        }
    }

    // Thay thế hoàn toàn hàm generateReport cũ
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
                
                <div class="row g-3 mb-4">
                    <div class="col-12">
                        <div id="chart-filter-container" class="mb-3"></div>
                        
                        <div id="chart-container">
                            <canvas id="main-chart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="row g-3">
                    <div class="col-12">
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
            
            // <<< GỌI HÀM RENDER BỘ LỌC (CHỈ KHI XEM THEO CHIẾN SĨ) >>>
            if (reportType === 'soldier') {
                renderExerciseFilter(data);
            }

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