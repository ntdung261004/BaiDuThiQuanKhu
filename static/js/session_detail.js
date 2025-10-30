document.addEventListener('DOMContentLoaded', async function() {
    // --- KHAI BÁO CÁC BIẾN GIAO DIỆN (GIỮ NGUYÊN TỪ FILE GỐC CỦA BẠN) ---
    const pathParts = window.location.pathname.split('/');
    const sessionId = pathParts.length > 2 ? pathParts[pathParts.length - 1] : null;

    const sessionNameHeader = document.getElementById('session-name-header');
    const exerciseNameDisplay = document.getElementById('exercise-name-display');
    const soldiersList = document.getElementById('soldiers-list');
    const shooterCountBadge = document.getElementById('shooter-count-badge');
    const connectionStatusBanner = document.getElementById('connection-status-banner');
    const connectionText = document.getElementById('connection-text');
    const videoFeed = document.getElementById('video-feed');
    const statusMessage = document.getElementById('status-message');
    const currentShooterName = document.getElementById('current-shooter-name');
    const shotTime = document.getElementById('shot-time');
    const targetName = document.getElementById('target-name');
    const shotScore = document.getElementById('shot-score');
    const targetImage = document.getElementById('target-image');
    const targetImageNotice = document.getElementById('target-image-notice');
    const shotStatusList = document.getElementById('shot-status-list');
    const totalShotsEl = document.getElementById('total-shots');
    const hitRateEl = document.getElementById('hit-rate');
    const averageScoreEl = document.getElementById('average-score');
    const livestreamControls = document.getElementById('livestream-controls');

    let activeShooterId = null;
    let lastProcessedShotId = null;
    let connectionInterval;
    let dataFeedInterval;
    let soldiers = [];
    let isUserDraggingZoom = false;
    let isConnected = false; // Thêm biến isConnected để quản lý trạng thái


    // --- LOGIC KẾT THÚC PHIÊN (GIỮ NGUYÊN TỪ FILE GỐC CỦA BẠN) ---
    const finishSessionBtn = document.getElementById('end-session-btn');
    const endSessionModalEl = document.getElementById('endSessionConfirmModal');

    if (finishSessionBtn && endSessionModalEl) {
        const endSessionModal = new bootstrap.Modal(endSessionModalEl);
        const confirmEndSessionBtn = document.getElementById('confirmEndSessionBtn');

        finishSessionBtn.addEventListener('click', () => {
            endSessionModal.show();
        });

        confirmEndSessionBtn.addEventListener('click', async () => {
            confirmEndSessionBtn.disabled = true;
            confirmEndSessionBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...`;
            try {
                const response = await fetch(`/api/training_sessions/${sessionId}/finish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const result = await response.json();
                if (response.ok) {
                    endSessionModal.hide();
                    showToast('Phiên tập đã kết thúc thành công!');
                    setTimeout(() => {
                        window.location.href = '/training';
                    }, 2000);
                } else {
                    throw new Error(result.message || 'Có lỗi không xác định.');
                }
            } catch (error) {
                console.error('Lỗi khi kết thúc phiên:', error);
                endSessionModal.hide();
                showToast(`Lỗi: ${error.message}`, 'danger');
            } finally {
                confirmEndSessionBtn.disabled = false;
                confirmEndSessionBtn.innerHTML = 'Xác nhận';
            }
        });
    }

    // === BẮT ĐẦU: THAY THẾ CÁC HÀM XỬ LÝ VIDEO BẰNG PHIÊN BẢN ĐÃ HOẠT ĐỘNG TỐT ===

    function updateConnectionStatus(connected) {
        isConnected = connected; // Cập nhật trạng thái toàn cục
        if (connected) {
            // Giao diện khi kết nối
            statusMessage.style.display = 'none';
            videoFeed.style.display = 'block';
            if (livestreamControls) livestreamControls.style.display = 'block';
            
            // Sử dụng class gốc của bạn
            connectionStatusBanner.className = 'ms-auto fw-bold connected';
            connectionText.innerHTML = '<i class="fas fa-check-circle"></i> Đã kết nối';
            
            // Chỉ gán src một lần để bắt đầu luồng video
            const videoSrc = window.location.origin + '/video_feed';
            if (videoFeed.src !== videoSrc) {
                videoFeed.src = '/video_feed';
            }
        } else {
            // Giao diện khi mất kết nối
            statusMessage.style.display = 'flex';
            videoFeed.style.display = 'none';
            if (livestreamControls) livestreamControls.style.display = 'none';

            // Sử dụng class gốc của bạn
            connectionStatusBanner.className = 'ms-auto fw-bold disconnected';
            connectionText.innerHTML = '<i class="fas fa-times-circle"></i> Mất kết nối';
            videoFeed.src = ""; // Ngắt luồng để tránh lỗi
        }
    }

    async function checkConnectionStatus() {
        try {
            const response = await fetch('/connection-status');
            const data = await response.json();
            const newStatus = response.ok && data.status === 'connected';

            // Chỉ cập nhật giao diện nếu trạng thái thay đổi
            if (newStatus !== isConnected) {
                updateConnectionStatus(newStatus);
            }

            // Đồng bộ zoom nếu đang kết nối (giữ nguyên logic gốc của bạn)
            if (newStatus && !isUserDraggingZoom) {
                const currentZoom = data.zoom || 1.0;
                const zoomSlider = document.getElementById('zoom-slider');
                const zoomValueDisplay = document.getElementById('zoom-value-display');
                if (zoomSlider && zoomValueDisplay) {
                    zoomSlider.value = currentZoom;
                    zoomValueDisplay.textContent = `${parseFloat(currentZoom).toFixed(1)}x`;
                }
            }
        } catch (error) {
            if (isConnected) {
                updateConnectionStatus(false);
            }
        }
    }

    // === KẾT THÚC THAY THẾ ===


    // --- CÁC HÀM GỐC CỦA BẠN (GIỮ NGUYÊN 100%) ---
    window.addEventListener('beforeunload', function(event) {
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/deactivate_shooter', new Blob());
            console.log("Đã gửi yêu cầu hủy kích hoạt đến server một cách thầm lặng.");
        }
    });

    function toggleResultPanel(state, message = 'Vui lòng chọn một xạ thủ để bắt đầu!') {
        const resultList = document.querySelector('#current-shooter-name').closest('.list-group');
        const targetImageContainer = document.getElementById('target-image-container');
        const existingNotice = document.getElementById('shooter-notice');
        if (existingNotice) existingNotice.remove();
        
        if (state === 'show') {
            if(resultList) resultList.style.display = 'block';
            if(targetImageContainer) targetImageContainer.style.display = 'flex';
        } else {
            if(resultList) resultList.style.display = 'none';
            if(targetImageContainer) targetImageContainer.style.display = 'none';
            const noticeElement = document.createElement('div');
            noticeElement.id = 'shooter-notice';
            noticeElement.className = 'd-flex flex-column justify-content-center align-items-center text-center h-100 text-muted';
            noticeElement.innerHTML = `<i class="fas fa-hand-pointer fa-2x mb-3"></i><p>${message}</p>`;
            if(targetImageContainer) targetImageContainer.parentNode.insertBefore(noticeElement, targetImageContainer.nextSibling);
        }
    }

    function resetLatestResultPanel() {
        shotTime.textContent = '--:--:--';
        targetName.textContent = '--';
        shotScore.textContent = '--.-';
        targetImage.style.display = 'none';
        targetImageNotice.style.display = 'flex';
    }
    
    async function updateProcessedData() {
        try {
            const response = await fetch('/data_feed');
            if (!response.ok) return;

            const data = await response.json();
            
            shotTime.textContent = data.time;
            targetName.textContent = data.target;
            shotScore.textContent = data.score;
            
            if (data.shot_id && data.shot_id !== lastProcessedShotId) {
                if (!activeShooterId) {
                    console.log("Bỏ qua phát bắn vì chưa chọn xạ thủ.");
                    lastProcessedShotId = data.shot_id;
                    return; 
                }

                lastProcessedShotId = data.shot_id;
                if (data.image_data) {
                    targetImage.src = `data:image/jpeg;base64,${data.image_data}`;
                    targetImage.style.display = 'block';
                    targetImageNotice.style.display = 'none';
                }
                
                await loadShotHistory();
                await updateSessionOverview();

                const shooterListItem = soldiersList.querySelector(`[data-soldier-item-id="${activeShooterId}"]`);
                if (shooterListItem) {
                    const shotCountBadge = shooterListItem.querySelector('.badge');
                    if (shotCountBadge) {
                        const currentCount = parseInt(shotCountBadge.innerText.trim()) || 0;
                        shotCountBadge.innerHTML = `<i class="fas fa-bullseye me-1"></i>${currentCount + 1}`;
                    }
                }
            }
        } catch (error) {
            console.error("Lỗi khi cập nhật dữ liệu:", error);
        }
    }

    async function loadSessionDetails() {
        if (!sessionId) return 'ERROR';
        try {
            const response = await fetch(`/api/training_sessions/${sessionId}`);
            if (!response.ok) throw new Error('Không thể tải dữ liệu phiên tập.');
            const data = await response.json();

            sessionNameHeader.textContent = data.session_name || `Phiên Tập #${data.id}`;

            if (data.status === 'COMPLETED') {
                document.getElementById('session-dashboard-grid').innerHTML = `
                    <div class="text-center p-5" style="grid-column: 1 / -1;">
                        <i class="fas fa-check-circle fa-5x text-success mb-4"></i>
                        <h2 class="display-6">Phiên tập này đã kết thúc.</h2>
                        <p class="lead text-muted">Mọi thao tác đã được vô hiệu hóa.</p>
                        <a href="/training" class="btn btn-primary mt-3">Quay lại trang quản lý</a>
                    </div>`;
                return 'COMPLETED';
            }

            exerciseNameDisplay.textContent = `Bài tập: ${data.exercise_name}`;
            soldiersList.innerHTML = '';
            soldiers = data.soldiers || [];
            shooterCountBadge.textContent = soldiers.length;

            soldiers.forEach(soldier => {
                const soldierItem = document.createElement('div');
                soldierItem.dataset.soldierItemId = soldier.id;
                soldierItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                soldierItem.innerHTML = `
                    <div class="d-flex align-items-center">
                        <button class="btn btn-sm btn-outline-primary select-shooter-btn me-3" data-soldier-id="${soldier.id}">Chọn</button>
                        <span>${soldier.rank} ${soldier.name}</span>
                    </div>
                    <span class="badge bg-secondary" title="Số phát bắn"><i class="fas fa-bullseye me-1"></i>${soldier.shot_count}</span>
                `;
                soldiersList.appendChild(soldierItem);
            });
            
            if (!await syncActiveShooterState()) {
                toggleResultPanel('hide');
            }
            await loadShotHistory();
            return data.status;

        } catch (error) {
            console.error('Lỗi khi tải chi tiết phiên tập:', error);
            sessionNameHeader.textContent = 'Lỗi tải dữ liệu';
            return 'ERROR';
        }
    }

    async function handleSelectShooter(event) {
        const button = event.target.closest('.select-shooter-btn');
        if (!button) return;
        event.preventDefault();

        activeShooterId = parseInt(button.dataset.soldierId);
        toggleResultPanel('show');
        resetLatestResultPanel();
        
        const selectedSoldier = soldiers.find(s => s.id === activeShooterId);
        currentShooterName.textContent = selectedSoldier ? `${selectedSoldier.rank} ${selectedSoldier.name}` : 'Không xác định';

        document.querySelectorAll('#soldiers-list .list-group-item').forEach(item => item.classList.remove('active'));
        button.closest('.list-group-item').classList.add('active');

        try {
            await fetch('/api/activate_shooter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, soldier_id: activeShooterId })
            });
        } catch (error) {
            console.error("Lỗi khi kích hoạt xạ thủ:", error);
        }
        await updateSessionOverview(); 
    }

    async function updateSessionOverview() {
        if (!activeShooterId) {
            totalShotsEl.textContent = '0';
            hitRateEl.textContent = '0%';
            averageScoreEl.textContent = '0.0';
            return 0;
        }

        try {
            const response = await fetch(`/api/sessions/${sessionId}/soldier_stats/${activeShooterId}`);
            if (!response.ok) throw new Error('Lỗi tải thành tích.');
            const stats = await response.json();
            
            totalShotsEl.textContent = stats.total_shots;
            hitRateEl.textContent = stats.hit_rate;
            averageScoreEl.textContent = stats.average_score;
            return stats.total_shots; 
        } catch (error) {
            console.error("Lỗi khi cập nhật thành tích:", error);
            return 0;
        }
    }

    async function loadShotHistory() {
        if (!sessionId) return;
        try {
            const response = await fetch(`/api/sessions/${sessionId}/shots`);
            const shots = await response.json();
            shotStatusList.innerHTML = '';

            if (shots.length === 0) {
                shotStatusList.innerHTML = '<p class="text-muted p-3 text-center">Chưa có phát bắn nào.</p>';
                return;
            }
            
            let shotCounter = shots.length;
            shots.forEach(shot => {
                const statusItem = document.createElement('div');
                statusItem.className = 'd-flex justify-content-between align-items-center small py-1 border-bottom';
                statusItem.innerHTML = `
                    <div class="d-flex align-items-center">
                        <span class="badge bg-secondary me-3">${shotCounter}</span>
                        <span class="me-4">${shot.soldier_name}</span>
                        <span>Mục tiêu: <strong>${shot.target_name}</strong></span>
                    </div>
                    <span>Điểm: <strong class="text-danger">${shot.score}</strong></span>
                `;
                shotStatusList.appendChild(statusItem);
                shotCounter--;
            });
        } catch (error) {
            console.error("Lỗi khi tải lịch sử bắn:", error);
        }
    }

    async function syncActiveShooterState() {
        if (!sessionId) return false;
        try {
            const response = await fetch(`/api/session/${sessionId}/active_shooter`, { cache: 'no-store' });
            const data = await response.json();
            if (data.active_soldier_id) {
                activeShooterId = data.active_soldier_id;
                const selectedSoldier = soldiers.find(s => s.id === activeShooterId);
                if (selectedSoldier) {
                    currentShooterName.textContent = `${selectedSoldier.rank} ${selectedSoldier.name}`;
                }
                document.querySelectorAll('#soldiers-list .list-group-item').forEach(item => item.classList.remove('active'));
                const shooterListItem = soldiersList.querySelector(`[data-soldier-item-id="${activeShooterId}"]`);
                if (shooterListItem) shooterListItem.classList.add('active');
                toggleResultPanel('show');
                await updateSessionOverview(); 
                return true;
            }
        } catch (error) {
            console.error("Lỗi đồng bộ trạng thái:", error);
        }
        return false;
    }

    async function startTrainingSession() {
        if (!sessionId) return;
        try {
            await fetch(`/api/training_sessions/${sessionId}/start`, { method: 'POST' });
            console.log(`Đã gửi yêu cầu bắt đầu cho phiên #${sessionId}`);
        } catch (error) {
            console.error('Lỗi khi gửi yêu cầu bắt đầu phiên:', error);
        }
    }

    // --- KHỞI CHẠY ---
    const sessionStatus = await loadSessionDetails();
    if (sessionStatus !== 'COMPLETED') {
        startTrainingSession();
        updateSessionOverview();
        
        // Bắt đầu kiểm tra kết nối để hiển thị video
        checkConnectionStatus(); 
        connectionInterval = setInterval(checkConnectionStatus, 3000);
        dataFeedInterval = setInterval(updateProcessedData, 1000);
        soldiersList.addEventListener('click', handleSelectShooter);
        
        // Logic điều khiển livestream (GIỮ NGUYÊN TỪ FILE GỐC CỦA BẠN)
        const recenterBtn = document.getElementById('recenter-btn');
        const zoomSlider = document.getElementById('zoom-slider');
        const zoomValueDisplay = document.getElementById('zoom-value-display');
        let isCenteringMode = false;

        async function sendPiCommand(endpoint, body, successMessage = null) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (response.ok) {
                    if (successMessage) showToast(successMessage);
                } else {
                    const result = await response.json();
                    showToast(result.message || 'Lệnh không thành công', 'danger');
                }
            } catch (error) {
                console.error(`Lỗi khi gửi lệnh đến ${endpoint}:`, error);
            }
        }

        if (recenterBtn) {
            recenterBtn.addEventListener('click', () => {
                isCenteringMode = !isCenteringMode;
                recenterBtn.classList.toggle('btn-success', isCenteringMode);
                recenterBtn.classList.toggle('btn-secondary', !isCenteringMode);
                videoFeed.style.cursor = isCenteringMode ? 'crosshair' : 'default';
            });
        }
        if (videoFeed) {
            videoFeed.addEventListener('click', (event) => {
                if (!isCenteringMode) return;
                const rect = videoFeed.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                const nativeWidth = 480; const nativeHeight = 640;
                const scaledX = Math.round((x / videoFeed.clientWidth) * nativeWidth);
                const scaledY = Math.round((y / videoFeed.clientHeight) * nativeHeight);
                sendPiCommand('/set_center', { center: { x: scaledX, y: scaledY } }, "Đã hiệu chỉnh tâm ngắm mới");
                isCenteringMode = false;
                recenterBtn.classList.remove('btn-success');
                recenterBtn.classList.add('btn-secondary');
                videoFeed.style.cursor = 'default';
            });
        }
        if (zoomSlider) {
            zoomSlider.addEventListener('input', () => {
                const zoomValue = parseFloat(zoomSlider.value);
                sendPiCommand('/set_zoom', { zoom: zoomValue }); 
                zoomValueDisplay.textContent = `${zoomValue.toFixed(1)}x`;
            });
            zoomSlider.addEventListener('change', () => {
                const zoomValue = parseFloat(zoomSlider.value);
                showToast(`Đã tinh chỉnh zoom ${zoomValue.toFixed(1)}x`);
            });
        }
    }
});