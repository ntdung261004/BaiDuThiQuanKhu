// === SKIN SELECT cho trang báo cáo ===
(function () {
  function ensureMenu() {
    let m = document.querySelector('.select-skin-menu');
    if (!m) {
      m = document.createElement('div');
      m.className = 'select-skin-menu';
      document.body.appendChild(m);
    }
    return m;
  }

  function placeMenu(menu, trigger) {
    const r = trigger.getBoundingClientRect();
    menu.style.top = (r.bottom + 6) + 'px';
    menu.style.left = r.left + 'px';
    menu.style.minWidth = r.width + 'px';
  }

  function skinOneSelect(selectEl) {
    if (!selectEl || selectEl.dataset.skinned === '1') return;

    // ẩn select thật
    selectEl.classList.add('select-hidden');

    // tạo nút trigger
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'select-skin-trigger';
    trigger.textContent = selectEl.selectedOptions[0]?.textContent || 'Chọn';

    // chèn ngay sau select trong input-group
    selectEl.parentElement.insertBefore(trigger, selectEl.nextSibling);

    let menu = null;

    function closeMenu() {
      if (!menu) return;
      menu.classList.remove('on');
      menu._cleanup && menu._cleanup();
    }

    function openMenu() {
      menu = ensureMenu();
      menu.innerHTML = '';

      Array.from(selectEl.options).forEach(opt => {
        const item = document.createElement('div');
        item.className = 'select-option' + (opt.value === selectEl.value ? ' active' : '');
        item.textContent = opt.textContent;
        item.addEventListener('click', () => {
          selectEl.value = opt.value;
          trigger.textContent = opt.textContent;
          closeMenu();
          // để report.js nghe được
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        });
        menu.appendChild(item);
      });

      placeMenu(menu, trigger);
      menu.classList.add('on');

      const onDoc = (e) => {
        if (e.target !== trigger && !menu.contains(e.target)) {
          closeMenu();
        }
      };
      const onEsc = (e) => { if (e.key === 'Escape') closeMenu(); };
      const onReflow = () => {
        if (menu.classList.contains('on')) placeMenu(menu, trigger);
      };

      document.addEventListener('click', onDoc, { once: true });
      document.addEventListener('keydown', onEsc, { once: true });
      window.addEventListener('scroll', onReflow, { passive: true });
      window.addEventListener('resize', onReflow);

      menu._cleanup = () => {
        document.removeEventListener('click', onDoc);
        document.removeEventListener('keydown', onEsc);
        window.removeEventListener('scroll', onReflow);
        window.removeEventListener('resize', onReflow);
      };
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const opened = document.querySelector('.select-skin-menu.on');
      if (opened && opened !== menu) {
        opened.classList.remove('on');
        opened._cleanup && opened._cleanup();
      }
      if (menu && menu.classList.contains('on')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // sync nếu value đổi từ code
    selectEl.addEventListener('change', () => {
      trigger.textContent = selectEl.selectedOptions[0]?.textContent || trigger.textContent;
    });

    selectEl.dataset.skinned = '1';
  }

  // export để report.js gọi lại sau khi load danh sách
  window.ReportSelectSkin = {
    skin: skinOneSelect,
    refresh(id) {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.dataset.skinned = '';
      const next = sel.nextElementSibling;
      if (next && next.classList.contains('select-skin-trigger')) {
        next.remove();
      }
      skinOneSelect(sel);
    }
  };

  // auto skin lúc DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    const rt = document.getElementById('report-type-select');
    const it = document.getElementById('item-select');
    if (rt) window.ReportSelectSkin.skin(rt);
    if (it) window.ReportSelectSkin.skin(it);
  });
})();

    

// static/js/report.js
document.addEventListener('DOMContentLoaded', function() {
    // ====== PHẦN PHẦN TỬ CHÍNH ======
    const reportContainer = document.getElementById('report-container');

    // select thật (ẩn) – để JS xử lý
    const reportTypeSelect = document.getElementById('report-type-select');
    const itemSelect       = document.getElementById('item-select');

    // ====== POPUP XEM QUÁ TRÌNH BẮN ======
    const shotDetailModal   = new bootstrap.Modal(document.getElementById('shotDetailModal'));
    const shotDetailImage   = document.getElementById('shot-detail-image');
    const shotDetailLoading = document.getElementById('shot-detail-loading');
    const shotDetailTime    = document.getElementById('shot-detail-time');
    const shotDetailTarget  = document.getElementById('shot-detail-target');
    const shotDetailScore   = document.getElementById('shot-detail-score');
    const shotCounter       = document.getElementById('shot-counter');
    const prevShotBtn       = document.getElementById('prev-shot-btn');
    const nextShotBtn       = document.getElementById('next-shot-btn');

    let currentShots = [];
    let currentIndex = 0;

    function displayShot(idx) {
        if (!currentShots.length) return;
        currentIndex = idx;
        const shot = currentShots[idx];

        shotDetailImage.style.display = 'none';
        shotDetailLoading.style.display = 'block';

        shotDetailTime.textContent   = shot.shot_time;
        shotDetailTarget.textContent = shot.target_name;
        shotDetailScore.textContent  = shot.score;
        shotCounter.textContent      = `Phát ${idx + 1} / ${currentShots.length}`;

        prevShotBtn.disabled = (idx === 0);
        nextShotBtn.disabled = (idx === currentShots.length - 1);

        if (shot.result_image_path) {
            shotDetailImage.src = `/user_data/${shot.result_image_path}`;
            shotDetailImage.onload = () => {
                shotDetailLoading.style.display = 'none';
                shotDetailImage.style.display = 'block';
            };
            shotDetailImage.onerror = () => {
                shotDetailImage.src = '/static/image/placeholder_image.png';
                shotDetailLoading.style.display = 'none';
                shotDetailImage.style.display = 'block';
            };
        } else {
            shotDetailImage.src = '/static/image/placeholder_image.png';
            shotDetailLoading.style.display = 'none';
            shotDetailImage.style.display = 'block';
        }
    }

    reportContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.view-process-btn');
        if (!btn) return;
        e.preventDefault();

        const sessionId = btn.dataset.sessionId;
        const soldierId = btn.dataset.soldierId;
        if (!sessionId || !soldierId) return;

        shotDetailModal.show();
        shotDetailImage.style.display = 'none';
        shotDetailLoading.style.display = 'block';
        shotDetailLoading.innerHTML = '<div class="spinner-border mb-3"></div><p>Đang tải dữ liệu...</p>';

        try {
            const res = await fetch(`/api/report/shot_details?session_id=${sessionId}&soldier_id=${soldierId}`);
            currentShots = await res.json();
            if (currentShots.length) {
                displayShot(0);
            } else {
                shotDetailLoading.innerHTML = '<p class="text-warning">Không có dữ liệu chi tiết.</p>';
            }
        } catch (err) {
            console.error(err);
            shotDetailLoading.innerHTML = '<p class="text-danger">Lỗi khi tải dữ liệu.</p>';
        }
    });

    nextShotBtn.addEventListener('click', () => {
        if (currentIndex < currentShots.length - 1) displayShot(currentIndex + 1);
    });
    prevShotBtn.addEventListener('click', () => {
        if (currentIndex > 0) displayShot(currentIndex - 1);
    });

    // ====== CHART SETUP ======
    Chart.register(ChartDataLabels);
    let mainChart = null;

    function renderReportTitle(data, reportType) {
        const reportTitle = document.getElementById('report-title');
        if (reportType === 'session') {
            reportTitle.innerHTML = `Báo cáo Phiên tập: <span class="text-primary">${data.session_name}</span>
                <p class="text-muted fs-6 mb-0">${data.exercise_name}</p>`;
        } else {
            reportTitle.innerHTML = `Báo cáo Xạ thủ: <span class="text-primary">${data.soldier_rank} ${data.soldier_name}</span>`;
        }
    }

    function renderKpiCards(data, reportType) {
        const kpiContainer = document.getElementById('kpi-cards-container');
        const stats = reportType === 'session' ? data : data.overall_stats;

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
                        <div class="stat-value text-info">
                            ${reportType === 'session' ? data.soldiers_performance.length : stats.total_sessions}
                        </div>
                        <div class="stat-label">
                            ${reportType === 'session' ? 'Xạ thủ tham gia' : 'Phiên tham gia'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderDetailsTable(data, reportType, exerciseFilter = 'all') {
        const tableContainer = document.getElementById('details-table-container');
        const tableTitle     = document.getElementById('table-title');
        let html = '<table class="table table-striped table-hover"><thead><tr>';

        if (reportType === 'session') {
            tableTitle.textContent = 'Thành tích Xạ thủ';
            html += '<th>#</th><th>Tên Xạ thủ</th><th>Điểm TB</th><th>Số phát bắn</th><th>Tỷ lệ trúng</th><th>Phân tích</th></tr></thead><tbody>';
            data.soldiers_performance.forEach((it, idx) => {
                const hitRate = it.total_shots ? ((it.hit_shots / it.total_shots) * 100).toFixed(0) : 0;
                html += `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${it.rank} ${it.name}</td>
                        <td>${it.avg_score}</td>
                        <td>${it.total_shots}</td>
                        <td>${it.hit_shots}/${it.total_shots} - <strong>${hitRate}%</strong></td>
                        <td><a href="#" class="view-process-btn" data-session-id="${data.session_id}" data-soldier-id="${it.id}">Xem quá trình</a></td>
                    </tr>
                `;
            });
        } else {
            const list = (exerciseFilter === 'all')
                ? data.sessions_performance
                : data.sessions_performance.filter(s => s.exercise_name === exerciseFilter);
            tableTitle.textContent = `Lịch sử Phiên tập - ${exerciseFilter === 'all' ? 'Tất cả bài tập' : exerciseFilter}`;
            html += '<th>#</th><th>Tên Phiên</th><th>Điểm TB</th><th>Số phát bắn</th><th>Tỷ lệ trúng</th><th>Phân tích</th></tr></thead><tbody>';

            if (!list.length) {
                html += '<tr><td colspan="6" class="text-center text-muted p-3">Không có dữ liệu.</td></tr>';
            } else {
                list.forEach((it, idx) => {
                    const hitRate = it.total_shots ? ((it.hit_shots / it.total_shots) * 100).toFixed(0) : 0;
                    html += `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${it.session_name}</td>
                            <td>${it.avg_score}</td>
                            <td>${it.total_shots}</td>
                            <td>${it.hit_shots}/${it.total_shots} - <strong>${hitRate}%</strong></td>
                            <td><a href="#" class="view-process-btn" data-session-id="${it.session_id}" data-soldier-id="${data.soldier_id}">Xem quá trình</a></td>
                        </tr>
                    `;
                });
            }
        }

        html += '</tbody></table>';
        tableContainer.innerHTML = html;
    }

    function renderMainChart(data, reportType, exerciseFilter = 'all') {
        const ctx = document.getElementById('main-chart').getContext('2d');

        if (mainChart) mainChart.destroy();

        let config;

        if (reportType === 'session') {
            config = {
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
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'So sánh Điểm trung bình các Xạ thủ' },
                        datalabels: {
                            anchor: 'end', align: 'top', color: '#495057',
                            font: { weight: 'bold' },
                            formatter: v => Math.round(v * 10) / 10
                        }
                    }
                }
            };
        } else {
            if (exerciseFilter === 'all') {
                config = {
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
                        plugins: { legend: { display: false }, title: { display: true, text: 'So sánh Điểm trung bình theo Bài tập' } }
                    }
                };
            } else {
                const filtered = data.sessions_performance.filter(s => s.exercise_name === exerciseFilter).reverse();
                config = {
                    type: 'line',
                    data: {
                        labels: filtered.map(s => s.session_name),
                        datasets: [{
                            label: 'Điểm trung bình',
                            data: filtered.map(s => s.avg_score),
                            borderColor: 'rgb(255, 99, 132)',
                            tension: 0.1
                        }]
                    },
                    options: {
                        scales: { y: { beginAtZero: true, max: 10 } },
                        plugins: { legend: { display: false }, title: { display: true, text: `Tiến độ bài tập "${exerciseFilter}"` } }
                    }
                };
            }
        }

        mainChart = new Chart(ctx, config);
    }

    function renderExerciseFilter(data) {
        const filterContainer = document.getElementById('chart-filter-container');
        if (!filterContainer) return;
        const exercises = data.performance_by_exercise || [];
        let html = `
            <div class="d-flex justify-content-end align-items-center">
                <label for="exercise-filter-select" class="form-label me-2 mb-0 small">Lọc theo bài tập:</label>
                <select class="form-select form-select-sm w-auto" id="exercise-filter-select">
                    <option value="all">Tất cả bài tập</option>
        `;
        exercises.forEach(ex => {
            html += `<option value="${ex.exercise_name}">${ex.exercise_name}</option>`;
        });
        html += '</select></div>';
        filterContainer.innerHTML = html;

        document.getElementById('exercise-filter-select').addEventListener('change', (e) => {
            const v = e.target.value;
            renderMainChart(data, 'soldier', v);
            renderDetailsTable(data, 'soldier', v);
        });
    }

    // ====== LOAD DANH SÁCH ĐỐI TƯỢNG ======
    async function populateItemSelect(reportType) {
        const apiUrl = (reportType === 'session') ? '/api/training_sessions' : '/api/soldiers/all';

        // báo đang tải
        itemSelect.innerHTML = '<option value="">Đang tải...</option>';
        if (window.ReportSelectSkin) window.ReportSelectSkin.refresh('item-select');

        try {
            const res = await fetch(apiUrl);
            const items = await res.json();

            itemSelect.innerHTML = '<option value="">-- Vui lòng chọn một mục --</option>';
            items.forEach(it => {
                const opt = document.createElement('option');
                if (reportType === 'session') {
                    opt.value = it.id;
                    opt.textContent = `${it.session_name || `Phiên tập #${it.id}`} (${it.exercise_name})`;
                } else {
                    opt.value = it.id;
                    opt.textContent = `${it.rank} ${it.name}`;
                }
                itemSelect.appendChild(opt);
            });

            // >>> rất quan trọng: refresh lại select giả
            if (window.ReportSelectSkin) window.ReportSelectSkin.refresh('item-select');

        } catch (err) {
            console.error('Lỗi khi tải danh sách:', err);
            itemSelect.innerHTML = '<option value="">Lỗi tải dữ liệu</option>';
            if (window.ReportSelectSkin) window.ReportSelectSkin.refresh('item-select');
        }
    }

    // ====== TẠO BÁO CÁO ======
    async function generateReport(reportType, reportId, updateHistory = true) {
        if (!reportType || !reportId) return;

        if (updateHistory) {
            const newUrl = `/report/${reportType}/${reportId}`;
            window.history.pushState({ reportType, reportId }, '', newUrl);
        }

        reportContainer.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary"></div>
                <p class="mt-3 text-muted">Đang tải dữ liệu báo cáo...</p>
            </div>
        `;

        try {
            const res  = await fetch(`/api/report/${reportType}/${reportId}`);
            const data = await res.json();

            // nếu phiên chưa hoàn thành
            if (reportType === 'session' && data.status && data.status !== 'COMPLETED') {
                const statusText = data.status === 'IN_PROGRESS' ? 'đang huấn luyện' : 'chưa bắt đầu';
                reportContainer.innerHTML = `
                    <div class="text-center p-5">
                        <i class="fas fa-info-circle fa-4x text-info mb-4"></i>
                        <h3 class="mb-3">Phiên tập này chưa kết thúc</h3>
                        <p class="lead text-muted">Báo cáo chi tiết sẽ có sau khi phiên được đánh dấu "Đã huấn luyện".</p>
                        <p class="text-muted">Trạng thái hiện tại: <strong>${statusText}</strong></p>
                    </div>
                `;
                return;
            }

            // render khung
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

            renderReportTitle(data, reportType);
            renderKpiCards(data, reportType);
            renderDetailsTable(data, reportType, 'all');
            renderMainChart(data, reportType, 'all');
            if (reportType === 'soldier') renderExerciseFilter(data);

        } catch (err) {
            console.error(err);
            reportContainer.innerHTML = `<p class="text-center text-danger p-5">Không thể tải dữ liệu báo cáo.</p>`;
        }
    }

    // ====== SỰ KIỆN ======
    // khi đổi loại báo cáo
    reportTypeSelect.addEventListener('change', async () => {
        const type = reportTypeSelect.value;
        await populateItemSelect(type);
        // reset khung
        reportContainer.innerHTML = `<h3 id="report-title" class="mb-3">Vui lòng chọn một mục để xem báo cáo</h3>
            <div class="row g-3 mb-4" id="kpi-cards-container"></div>
            <div class="row g-3 mb-4"><div class="col-12"><div id="chart-container" class="bg-white rounded shadow-sm p-3">
            <canvas id="main-chart"></canvas></div></div></div>`;
    });

    // khi chọn đối tượng
    itemSelect.addEventListener('change', () => {
        const id   = itemSelect.value;
        const type = reportTypeSelect.value;
        if (id) generateReport(type, id);
    });

    // ====== KHỞI TẠO BAN ĐẦU ======
    (async function init() {
        // skin 2 cái select ngay từ đầu (nếu file skin-select đã load)
        if (window.ReportSelectSkin) {
            window.ReportSelectSkin.skin(reportTypeSelect);
            window.ReportSelectSkin.skin(itemSelect);
        }

        // đọc URL để auto load
        const parts = window.location.pathname.split('/');
        // /report/<type>/<id>
        if (parts[1] === 'report' && parts[2] && parts[3]) {
            const t = parts[2];
            const id = parts[3];

            reportTypeSelect.value = t;
            if (window.ReportSelectSkin) window.ReportSelectSkin.refresh('report-type-select');

            await populateItemSelect(t);
            itemSelect.value = id;
            if (window.ReportSelectSkin) window.ReportSelectSkin.refresh('item-select');

            await generateReport(t, id, false);
        } else {
            // mặc định: load danh sách của "session"
            await populateItemSelect(reportTypeSelect.value || 'session');
        }
    })();
});
