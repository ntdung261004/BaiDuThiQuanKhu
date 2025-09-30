document.addEventListener('DOMContentLoaded', async function() {
    // --- KHAI BÁO CÁC BIẾN & HẰNG SỐ ---

    // Lấy ID phiên tập từ URL
    const pathParts = window.location.pathname.split('/');
    const sessionId = pathParts[pathParts.length - 1];

    // Các biến trạng thái chính
    let isTrainingActive = false; // Cờ báo hiệu có ai đó đang tập không
    let currentShooterId = null;  // ID của xạ thủ đang tập
    let soldierTrainingData = {}; // Object lưu trữ kết quả tập của từng người
    let piConnectionStatus = false; // Trạng thái kết nối với Pi

    // Khởi tạo các đối tượng Modal của Bootstrap
    const endSessionModal = new bootstrap.Modal(document.getElementById('endSessionConfirmModal'));
    const summaryModal = new bootstrap.Modal(document.getElementById('soldierSummaryModal'));

    // Cache lại các element trên DOM để truy cập nhanh hơn
    const elements = {
        sessionNameHeader: document.getElementById('session-name-header'),
        exerciseNameDisplay: document.getElementById('exercise-name-display'),
        soldiersList: document.getElementById('soldiers-list'),
        shooterCountBadge: document.getElementById('shooter-count-badge'),
        connectionBanner: document.getElementById('connection-status-banner'),
        connectionText: document.getElementById('connection-text'),
        videoFeed: document.getElementById('video-feed'),
        statusMessage: document.getElementById('status-message'),
        currentShooterName: document.getElementById('current-shooter-name'),
        shotTime: document.getElementById('shot-time'),
        shotResult: document.getElementById('shot-result'),
        targetImage: document.getElementById('target-image'),
        targetImageNotice: document.getElementById('target-image-notice'),
        shotLogList: document.getElementById('shot-log-list'),
        totalShotsEl: document.getElementById('total-shots'),
        totalHitsEl: document.getElementById('total-hits'),
        completedShootersEl: document.getElementById('completed-shooters'),
        endSessionBtn: document.getElementById('end-session-btn'),
        confirmEndSessionBtn: document.getElementById('confirmEndSessionBtn'),
        // Livestream controls
        recenterBtn: document.getElementById('recenter-btn'),
        zoomSlider: document.getElementById('zoom-slider'),
        zoomValueDisplay: document.getElementById('zoom-value-display'),
        // Summary Modal Elements
        summarySoldierName: document.getElementById('summary-soldier-name'),
        summaryTotalShots: document.getElementById('summary-total-shots'),
        summaryTotalHits: document.getElementById('summary-total-hits'),
        summaryTotalMisses: document.getElementById('summary-total-misses'),
        summaryHitTargets: document.getElementById('summary-hit-targets'),
    };

    // --- CÁC HÀM LẤY VÀ HIỂN THỊ DỮ LIỆU ---

    /**
     * Lấy thông tin chi tiết của phiên và danh sách xạ thủ từ server.
     */
    async function fetchSessionDetails() {
        if (!sessionId) {
            console.error("Không tìm thấy ID phiên tập.");
            elements.sessionNameHeader.textContent = "Lỗi: ID phiên không hợp lệ";
            return;
        }
        try {
            // ===================================================================
            // === SỬA LỖI TẠI ĐÂY: Thêm "s" vào "training_sessions" ===
            // ===================================================================
            const response = await fetch(`/api/training_sessions/${sessionId}`);
            if (!response.ok) throw new Error('Không thể tải chi tiết phiên.');
            const data = await response.json();

            // Cập nhật tên phiên và bài tập
            elements.sessionNameHeader.textContent = data.session_name;
            elements.exerciseNameDisplay.textContent = `Bài tập: ${data.exercise_name}`;
            
            // Khởi tạo dữ liệu huấn luyện cho từng chiến sĩ
            data.soldiers.forEach(soldier => {
                soldierTrainingData[soldier.id] = {
                    name: soldier.name,
                    shots: 0,
                    hits: 0,
                    misses: 0,
                    hitTargets: [],
                    status: 'pending' // pending -> training -> completed
                };
            });

            renderSoldiersList();
            updateOverallStats();
            
        } catch (error) {
            console.error("Lỗi khi tải chi tiết phiên:", error);
            elements.soldiersList.innerHTML = `<div class="list-group-item text-danger">Lỗi tải dữ liệu. Vui lòng thử lại.</div>`;
        }
    }

    /**
     * Hiển thị danh sách xạ thủ ra giao diện.
     */
    function renderSoldiersList() {
        elements.soldiersList.innerHTML = ''; // Xóa nội dung cũ
        const soldierIds = Object.keys(soldierTrainingData);

        if (soldierIds.length === 0) {
            elements.soldiersList.innerHTML = `<p class="text-muted p-3">Không có xạ thủ nào trong phiên này.</p>`;
            return;
        }
        
        elements.shooterCountBadge.textContent = soldierIds.length;

        soldierIds.forEach(id => {
            const soldier = soldierTrainingData[id];
            const soldierId = parseInt(id);

            let statusBadge, actionButton;

            switch (soldier.status) {
                case 'pending':
                    statusBadge = `<span class="badge bg-secondary">Chưa tập</span>`;
                    actionButton = `<button class="btn btn-primary btn-sm start-training-btn" data-soldier-id="${soldierId}" ${isTrainingActive ? 'disabled' : ''}>
                                        <i class="fas fa-play me-1"></i>Bắt đầu
                                    </button>`;
                    break;
                case 'training':
                    statusBadge = `<span class="badge bg-warning text-dark">Đang tập...</span>`;
                    actionButton = `<button class="btn btn-danger btn-sm end-training-btn" data-soldier-id="${soldierId}">
                                        <i class="fas fa-stop me-1"></i>Kết thúc
                                    </button>`;
                    break;
                case 'completed':
                    statusBadge = `<span class="badge bg-success">Đã hoàn thành</span>`;
                    actionButton = `<button class="btn btn-outline-secondary btn-sm" disabled>
                                        <i class="fas fa-check me-1"></i>Đã xong
                                    </button>`;
                    break;
            }

            const soldierHtml = `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <span class="fw-bold">${soldier.name}</span><br>
                        ${statusBadge}
                    </div>
                    ${actionButton}
                </div>
            `;
            elements.soldiersList.insertAdjacentHTML('beforeend', soldierHtml);
        });
    }

    /**
     * Cập nhật các chỉ số tổng quan của phiên.
     */
    function updateOverallStats() {
        let totalShots = 0;
        let totalHits = 0;
        let completedCount = 0;
        const soldierIds = Object.keys(soldierTrainingData);

        soldierIds.forEach(id => {
            const data = soldierTrainingData[id];
            totalShots += data.shots;
            totalHits += data.hits;
            if (data.status === 'completed') {
                completedCount++;
            }
        });

        elements.totalShotsEl.textContent = totalShots;
        elements.totalHitsEl.textContent = totalHits;
        elements.completedShootersEl.textContent = `${completedCount} / ${soldierIds.length}`;
    }
    
    /**
     * Thêm một dòng log vào bảng Lịch sử/Nhật ký.
     * @param {string} message - Nội dung cần ghi log.
     * @param {string} type - 'info', 'hit', 'miss'.
     */
    function addLogEntry(message, type = 'info') {
        const time = new Date().toLocaleTimeString('vi-VN');
        let icon;

        switch(type) {
            case 'hit': icon = '<i class="fas fa-check-circle text-success me-2"></i>'; break;
            case 'miss': icon = '<i class="fas fa-times-circle text-danger me-2"></i>'; break;
            default: icon = '<i class="fas fa-info-circle text-primary me-2"></i>'; break;
        }

        // Xóa thông báo mặc định nếu có
        if (elements.shotLogList.querySelector('p')) {
            elements.shotLogList.innerHTML = '';
        }

        const logHtml = `<div class="d-flex small border-bottom pb-1 mb-1">
                            <span class="me-2 text-muted">[${time}]</span>
                            <span>${icon}${message}</span>
                         </div>`;
        elements.shotLogList.insertAdjacentHTML('afterbegin', logHtml);
    }


    // --- CÁC HÀM GIAO TIẾP VỚI SERVER & THIẾT BỊ ---

    /**
     * Kiểm tra trạng thái kết nối của Pi và cập nhật giao diện.
     */
    async function checkConnectionStatus() {
        try {
            const response = await fetch('/connection-status');
            const data = await response.json();
            const newStatus = data.status === 'connected';

            if (newStatus !== piConnectionStatus) {
                piConnectionStatus = newStatus;
                elements.connectionBanner.classList.toggle('bg-success', piConnectionStatus);
                elements.connectionBanner.classList.toggle('bg-danger', !piConnectionStatus);
                elements.connectionText.textContent = piConnectionStatus ? 'Đã kết nối thiết bị' : 'Mất kết nối thiết bị';
                elements.videoFeed.style.display = piConnectionStatus ? 'block' : 'none';
                elements.statusMessage.style.display = piConnectionStatus ? 'none' : 'flex';
                showToast(piConnectionStatus ? 'Đã kết nối với thiết bị.' : 'Mất kết nối với thiết bị!', piConnectionStatus ? 'success' : 'error');
                if(piConnectionStatus) {
                   elements.videoFeed.src = `/video_feed?t=${new Date().getTime()}`;
                }
            }
        } catch (error) {
            if (piConnectionStatus) { // Chỉ thay đổi nếu trạng thái trước đó là đang kết nối
                piConnectionStatus = false;
                elements.connectionBanner.className = 'ms-auto fw-bold bg-danger';
                elements.connectionText.textContent = 'Lỗi kết nối';
                showToast('Lỗi khi kiểm tra kết nối server.', 'error');
            }
        }
    }

    /**
     * Lấy kết quả bắn mới nhất từ server và xử lý.
     */
    async function updateLatestResult() {
        if (!piConnectionStatus) return; // Không làm gì nếu không có kết nối

        try {
            // Sửa lại URL cho khớp với route '/data_feed' trong pi_controller.py
            const response = await fetch('/data_feed');
            const data = await response.json();

            // Chỉ xử lý nếu có xạ thủ đang tập và có dữ liệu mới
            if (isTrainingActive && currentShooterId && data.timestamp > (this.lastTimestamp || 0)) {
                this.lastTimestamp = data.timestamp;

                const shooterData = soldierTrainingData[currentShooterId];
                shooterData.shots++;
                
                let logMessage, logType;
                
                if (data.score > 0) { // Coi như score > 0 là trúng
                    shooterData.hits++;
                    shooterData.hitTargets.push(data.target);
                    elements.shotResult.textContent = `Trúng (${data.target})`;
                    elements.shotResult.className = 'text-success fs-4';
                    logMessage = `${shooterData.name}: <strong class="text-success">Trúng mục tiêu ${data.target}</strong>`;
                    logType = 'hit';
                } else {
                    shooterData.misses++;
                    elements.shotResult.textContent = 'Trượt';
                    elements.shotResult.className = 'text-danger fs-4';
                    logMessage = `${shooterData.name}: <strong class="text-danger">Bắn trượt</strong>`;
                    logType = 'miss';
                }
                
                // Cập nhật giao diện
                elements.shotTime.textContent = data.time;
                elements.targetImage.src = `data:image/jpeg;base64,${data.image_data}`;
                elements.targetImage.style.display = 'block';
                elements.targetImageNotice.style.display = 'none';
                
                addLogEntry(logMessage, logType);
                updateOverallStats();
            }
        } catch (error) {
            console.error('Lỗi khi cập nhật kết quả:', error);
        }
    }

    /**
     * Gửi lệnh đến Pi (tái sử dụng từ session_detail.js)
     */
    async function sendPiCommand(endpoint, body) {
        try {
            await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        } catch (error) {
            console.error(`Lỗi khi gửi lệnh ${endpoint}:`, error);
            showToast('Không thể gửi lệnh đến thiết bị.', 'error');
        }
    }

    // --- CÁC HÀM XỬ LÝ SỰ KIỆN ---

    /**
     * Xử lý khi click vào các nút trong danh sách xạ thủ (Bắt đầu/Kết thúc).
     */
    async function handleSoldierAction(event) {
        const target = event.target.closest('button');
        if (!target) return;

        const soldierId = target.dataset.soldierId;
        
        // --- BẮT ĐẦU TẬP ---
        if (target.classList.contains('start-training-btn')) {
            if (isTrainingActive) {
                showToast('Một xạ thủ khác đang trong lượt tập!', 'error');
                return;
            }

            try {
                // Kích hoạt xạ thủ trên backend
                const response = await fetch('/api/activate_shooter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: sessionId, soldier_id: soldierId })
                });
                if (!response.ok) throw new Error('Không thể kích hoạt xạ thủ.');

                isTrainingActive = true;
                currentShooterId = soldierId;
                soldierTrainingData[soldierId].status = 'training';
                
                elements.currentShooterName.textContent = soldierTrainingData[soldierId].name;
                addLogEntry(`<strong>${soldierTrainingData[soldierId].name}</strong> đã bắt đầu lượt tập.`, 'info');
                
                // Cập nhật lại toàn bộ danh sách để disable các nút "Bắt đầu" khác
                renderSoldiersList();

            } catch(error) {
                 showToast(error.message, 'error');
            }
        }

        // --- KẾT THÚC TẬP ---
        else if (target.classList.contains('end-training-btn')) {
             try {
                // Hủy kích hoạt xạ thủ trên backend
                await fetch('/api/deactivate_shooter', { method: 'POST' });

                isTrainingActive = false;
                currentShooterId = null;
                soldierTrainingData[soldierId].status = 'completed';

                elements.currentShooterName.textContent = 'Chưa có';
                addLogEntry(`<strong>${soldierTrainingData[soldierId].name}</strong> đã kết thúc lượt tập.`, 'info');
                
                renderSoldiersList();
                updateOverallStats();
                showSummaryModal(soldierId);

            } catch(error) {
                showToast('Lỗi khi hủy kích hoạt xạ thủ.', 'error');
            }
        }
    }

    /**
     * Hiển thị modal tổng kết kết quả cho một xạ thủ.
     * @param {string} soldierId - ID của xạ thủ.
     */
    function showSummaryModal(soldierId) {
        const data = soldierTrainingData[soldierId];
        if (!data) return;

        elements.summarySoldierName.textContent = data.name;
        elements.summaryTotalShots.textContent = data.shots;
        elements.summaryTotalHits.textContent = data.hits;
        elements.summaryTotalMisses.textContent = data.misses;

        if (data.hitTargets.length > 0) {
            elements.summaryHitTargets.innerHTML = data.hitTargets
                .map(target => `<span class="badge bg-info me-1">${target}</span>`)
                .join('');
        } else {
            elements.summaryHitTargets.innerHTML = `<p class="text-muted small">Không có bia nào được bắn trúng.</p>`;
        }
        
        summaryModal.show();
    }

    /**
     * Xử lý việc kết thúc toàn bộ phiên tập.
     */
    async function handleEndSession() {
        try {
            // Sửa lại tên route cho khớp với training_controller
            const response = await fetch(`/api/training_sessions/${sessionId}/finish`, { method: 'POST' });
            if (!response.ok) throw new Error('Không thể kết thúc phiên.');
            
            showToast('Đã kết thúc phiên tập thành công!', 'success');
            setTimeout(() => {
                window.location.href = `/report/session/${sessionId}`;
            }, 1500);

        } catch (error) {
            console.error('Lỗi khi kết thúc phiên:', error);
            showToast(error.message, 'error');
        } finally {
            endSessionModal.hide();
        }
    }

    // --- KHỞI CHẠY VÀ GÁN SỰ KIỆN ---

    function initialize() {
        fetchSessionDetails();

        // Gán sự kiện bằng event delegation
        elements.soldiersList.addEventListener('click', handleSoldierAction);
        elements.endSessionBtn.addEventListener('click', () => endSessionModal.show());
        elements.confirmEndSessionBtn.addEventListener('click', handleEndSession);

        // Gán sự kiện cho livestream controls (tái sử dụng từ session_detail.js)
        if (elements.recenterBtn) {
            elements.recenterBtn.addEventListener('click', () => {
                showToast("Đã gửi lệnh hiệu chỉnh lại tâm ngắm");
                sendPiCommand('/set_center', { center: 'recenter' });
            });
        }
        if (elements.zoomSlider) {
            elements.zoomSlider.addEventListener('input', () => {
                const zoomValue = parseFloat(elements.zoomSlider.value);
                sendPiCommand('/set_zoom', { zoom: zoomValue }); 
                elements.zoomValueDisplay.textContent = `${zoomValue.toFixed(1)}x`;
            });
            elements.zoomSlider.addEventListener('change', () => {
                const zoomValue = parseFloat(elements.zoomSlider.value);
                showToast(`Đã tinh chỉnh zoom ${zoomValue.toFixed(1)}x`);
            });
        }

        // Thiết lập các vòng lặp cập nhật
        setInterval(checkConnectionStatus, 3000); // Kiểm tra kết nối mỗi 3 giây
        setInterval(updateLatestResult, 1000);   // Lấy kết quả mới mỗi giây
    }

    initialize();
});