document.addEventListener('DOMContentLoaded', async function() {
    // --- KHAI BÁO BIẾN GỐC CỦA TRANG (GIỮ NGUYÊN) ---
    const pathParts = window.location.pathname.split('/');
    const sessionId = pathParts.length > 2 ? pathParts[pathParts.length - 1] : null;

    const sessionNameHeader = document.getElementById('session-name-header');
    const exerciseNameDisplay = document.getElementById('exercise-name-display');
    const soldiersList = document.getElementById('soldiers-list');
    const shooterCountBadge = document.getElementById('shooter-count-badge');
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
    let activeShooterId = null;
    let lastProcessedShotId = null;
    let soldiers = [];
    let isUserDraggingZoom = false;


    // --- KHỐI LOGIC VIDEO ĐÚNG (TỪ STREAM.JS) ---
    const connectionBanner = document.getElementById('connection-status-banner');
    const connectionText = document.getElementById('connection-text');
    const videoFeed = document.getElementById('video-feed');
    const statusMessage = document.getElementById('status-message');
    const livestreamControls = document.getElementById('livestream-controls');
    let isUiConnected = false;
    let reconnectInterval = null;
    const canvas = document.createElement('canvas');

    if (videoFeed) {
        canvas.style.display = 'none'; 
        videoFeed.parentElement.appendChild(canvas);
    }

    const freezeDetector = {
        canvas: document.createElement('canvas'),
        timeout: null,
        lastImageDataUrl: '',
        consecutiveMatches: 0,
        start: function() {
            this.stop();
            this.timeout = setInterval(this.check.bind(this), 2500);
        },
        stop: function() {
            clearInterval(this.timeout);
            this.timeout = null; this.consecutiveMatches = 0; this.lastImageDataUrl = '';
        },
        check: function() {
             if (videoFeed.naturalWidth === 0) return;
             try {
                const isAuthenticating = !isUiConnected;
                this.canvas.width = videoFeed.naturalWidth;
                this.canvas.height = videoFeed.naturalHeight;
                const context = this.canvas.getContext('2d');
                context.drawImage(videoFeed, 0, 0, this.canvas.width, this.canvas.height);
                const currentData = this.canvas.toDataURL('image/jpeg', 0.5);
                
                if (this.lastImageDataUrl && this.lastImageDataUrl !== currentData) {
                    if (isAuthenticating) {
                        handleConnectionSuccess();
                    }
                    this.consecutiveMatches = 0;
                } else {
                    this.consecutiveMatches++;
                    if (this.consecutiveMatches >= 2 && isUiConnected) {
                        handleDisconnection();
                    }
                }
                this.lastImageDataUrl = currentData;
             } catch(e) { if(isUiConnected) handleDisconnection(); }
        }
    };

    function handleConnectionSuccess() {
        if (isUiConnected) return;
        isUiConnected = true;
        clearInterval(reconnectInterval);
        reconnectInterval = null;

        videoFeed.style.opacity = '1';
        statusMessage.style.display = 'none'; // **SỬA LỖI: Luôn ẩn thông báo khi kết nối thành công**
        if (livestreamControls) livestreamControls.style.display = 'flex';
        
        connectionBanner.className = 'ms-auto fw-bold connected';
        connectionText.innerHTML = '<i class="fas fa-check-circle"></i> Đã kết nối';
        
        freezeDetector.start();
    }

    function handleDisconnection() {
        if (!isUiConnected && reconnectInterval) return;
        isUiConnected = false;
        freezeDetector.stop();
        videoFeed.src = '';
        videoFeed.style.display = 'none';

        statusMessage.style.display = 'flex'; // **SỬA LỖI: Luôn hiện thông báo khi ngắt kết nối**
        if (livestreamControls) livestreamControls.style.display = 'none';
        connectionBanner.className = 'ms-auto fw-bold disconnected';
        connectionText.innerHTML = '<i class="fas fa-plug"></i> Mất kết nối, đang thử lại...';
        
        if (reconnectInterval) clearInterval(reconnectInterval);
        reconnectInterval = setInterval(() => {
            videoFeed.src = `/video_feed?timestamp=${new Date().getTime()}`;
        }, 5000);
    }

    function handleConnectionAttempt() {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
        
        videoFeed.style.display = 'block';
        videoFeed.style.opacity = '0';
        statusMessage.style.display = 'flex';
        
        connectionBanner.className = 'ms-auto fw-bold connected';
        connectionText.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Đang xác thực luồng...';
        
        freezeDetector.start();

        setTimeout(() => {
            if (!isUiConnected) {
                handleDisconnection();
            }
        }, 7000);
    }
    
    if (videoFeed) {
        videoFeed.addEventListener('load', handleConnectionAttempt);
        videoFeed.addEventListener('error', () => {
            if (isUiConnected || !reconnectInterval) {
                handleDisconnection();
            }
        });
    }

    // --- LOGIC GỐC CỦA BẠN (GIỮ NGUYÊN VÀ CẬP NHẬT) ---
    const finishSessionBtn = document.getElementById('end-session-btn');
    const endSessionModalEl = document.getElementById('endSessionConfirmModal');
    if (finishSessionBtn && endSessionModalEl) {
        const endSessionModal = new bootstrap.Modal(endSessionModalEl);
        const confirmEndSessionBtn = document.getElementById('confirmEndSessionBtn');
        finishSessionBtn.addEventListener('click', () => endSessionModal.show());
        confirmEndSessionBtn.addEventListener('click', async () => {
            confirmEndSessionBtn.disabled = true;
            confirmEndSessionBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...`;
            try {
                const response = await fetch(`/api/training_sessions/${sessionId}/finish`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
                const result = await response.json();
                if (response.ok) {
                    endSessionModal.hide();
                    showToast('Phiên tập đã kết thúc thành công!');
                    setTimeout(() => { window.location.href = '/training'; }, 2000);
                } else { throw new Error(result.message || 'Có lỗi không xác định.'); }
            } catch (error) {
                endSessionModal.hide();
                showToast(`Lỗi: ${error.message}`, 'danger');
            } finally {
                confirmEndSessionBtn.disabled = false;
                confirmEndSessionBtn.innerHTML = 'Xác nhận';
            }
        });
    }
    window.addEventListener('beforeunload', function(event) { if (navigator.sendBeacon) { navigator.sendBeacon('/api/deactivate_shooter', new Blob()); } });
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
            shotTime.textContent = data.time || '--:--:--';
            targetName.textContent = data.target || '--';
            shotScore.textContent = data.score || '--.-';
            if (data.shot_id && data.shot_id !== lastProcessedShotId) {
                if (!activeShooterId) { lastProcessedShotId = data.shot_id; return; }
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
                        const currentCount = parseInt(shotCountBadge.innerText.trim().replace('<i class="fas fa-bullseye me-1"></i>', '')) || 0;
                        shotCountBadge.innerHTML = `<i class="fas fa-bullseye me-1"></i>${currentCount + 1}`;
                    }
                }
            }
        } catch (error) {}
    }
    async function loadSessionDetails() {
        if (!sessionId) return 'ERROR';
        try {
            const response = await fetch(`/api/training_sessions/${sessionId}`);
            if (!response.ok) throw new Error('Không thể tải dữ liệu phiên tập.');
            const data = await response.json();
            sessionNameHeader.textContent = data.session_name || `Phiên Tập #${data.id}`;
            if (data.status === 'COMPLETED') {
                document.getElementById('session-dashboard-grid').innerHTML = `<div class="text-center p-5" style="grid-column: 1 / -1;"><i class="fas fa-check-circle fa-5x text-success mb-4"></i><h2 class="display-6">Phiên tập này đã kết thúc.</h2><p class="lead text-muted">Mọi thao tác đã được vô hiệu hóa.</p><a href="/training" class="btn btn-primary mt-3">Quay lại trang quản lý</a></div>`;
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
                soldierItem.innerHTML = `<div class="d-flex align-items-center"><button class="btn btn-sm btn-outline-primary select-shooter-btn me-3" data-soldier-id="${soldier.id}">Chọn</button><span>${soldier.rank} ${soldier.name}</span></div><span class="badge bg-secondary" title="Số phát bắn"><i class="fas fa-bullseye me-1"></i>${soldier.shot_count}</span>`;
                soldiersList.appendChild(soldierItem);
            });
            if (!await syncActiveShooterState()) { toggleResultPanel('hide'); }
            await loadShotHistory();
            return data.status;
        } catch (error) {
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
        try { await fetch('/api/activate_shooter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, soldier_id: activeShooterId }) });
        } catch (error) {}
        await updateSessionOverview(); 
    }
    async function updateSessionOverview() {
        if (!activeShooterId) { totalShotsEl.textContent = '0'; hitRateEl.textContent = '0%'; averageScoreEl.textContent = '0.0'; return 0; }
        try {
            const response = await fetch(`/api/sessions/${sessionId}/soldier_stats/${activeShooterId}`);
            if (!response.ok) throw new Error('Lỗi tải thành tích.');
            const stats = await response.json();
            totalShotsEl.textContent = stats.total_shots;
            hitRateEl.textContent = stats.hit_rate;
            averageScoreEl.textContent = stats.average_score;
            return stats.total_shots; 
        } catch (error) { return 0; }
    }

    // === YÊU CẦU 2: CẬP NHẬT HÀM ĐỂ TẠO GIAO DIỆN LỊCH SỬ BẮN MỚI ===
    async function loadShotHistory() {
        if (!sessionId) return;
        try {
            const response = await fetch(`/api/sessions/${sessionId}/shots`);
            const shots = await response.json();
            shotStatusList.innerHTML = '';

            if (shots.length === 0) {
                shotStatusList.innerHTML = '<p class="text-muted p-3 text-center mb-0">Chưa có phát bắn nào.</p>';
                return;
            }
            
            shots.forEach((shot, index) => {
                const shotNumber = shots.length - index;
                const shotItem = document.createElement('div');
                shotItem.className = 'shot-history-item';

                let scoreClass = 'text-dark';
                if (shot.score >= 9) scoreClass = 'text-success fw-bold';
                else if (shot.score >= 7) scoreClass = 'text-primary';
                else if (shot.score > 0) scoreClass = 'text-warning';
                else scoreClass = 'text-danger';

                shotItem.innerHTML = `
                    <div class="shot-history-number">${shotNumber}</div>
                    <div class="shot-history-details">
                        <div class="shot-history-soldier">${shot.soldier_name || 'Không rõ'}</div>
                        <div class="shot-history-meta">
                            <span>${shot.target_name || 'Không có'}</span> &bull; <span>${shot.timestamp || '--:--:--'}</span>
                        </div>
                    </div>
                    <div class="shot-history-score ${scoreClass}">
                        ${shot.score}
                    </div>
                `;
                shotStatusList.appendChild(shotItem);
            });
        } catch (error) {
            console.error("Lỗi khi tải lịch sử bắn:", error);
        }
    }
    // === KẾT THÚC CẬP NHẬT ===

    async function syncActiveShooterState() {
        if (!sessionId) return false;
        try {
            const response = await fetch(`/api/session/${sessionId}/active_shooter`, { cache: 'no-store' });
            const data = await response.json();
            if (data.active_soldier_id) {
                activeShooterId = data.active_soldier_id;
                const selectedSoldier = soldiers.find(s => s.id === activeShooterId);
                if (selectedSoldier) { currentShooterName.textContent = `${selectedSoldier.rank} ${selectedSoldier.name}`; }
                document.querySelectorAll('#soldiers-list .list-group-item').forEach(item => item.classList.remove('active'));
                const shooterListItem = soldiersList.querySelector(`[data-soldier-item-id="${activeShooterId}"]`);
                if (shooterListItem) shooterListItem.classList.add('active');
                toggleResultPanel('show');
                await updateSessionOverview(); 
                return true;
            }
        } catch (error) {}
        return false;
    }
    async function startTrainingSession() { if (!sessionId) return; try { await fetch(`/api/training_sessions/${sessionId}/start`, { method: 'POST' }); } catch (error) {} }

    // --- KHỞI CHẠY ---
    (async () => {
        const sessionStatus = await loadSessionDetails();
        if (sessionStatus !== 'COMPLETED') {
            await startTrainingSession();
            await updateSessionOverview();
            
            setInterval(updateProcessedData, 1000);
            soldiersList.addEventListener('click', handleSelectShooter);
            
            const recenterBtn = document.getElementById('recenter-btn');
            const zoomSlider = document.getElementById('zoom-slider');
            const zoomValueDisplay = document.getElementById('zoom-value-display');
            let isCenteringMode = false;
            
            async function sendPiCommand(endpoint, body, successMessage = null) {
                try {
                    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                    if (response.ok) { if (successMessage) showToast(successMessage); }
                    else { const result = await response.json(); showToast(result.message || 'Lệnh không thành công', 'danger'); }
                } catch (error) {}
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
                    isUserDraggingZoom = true;
                    const zoomValue = parseFloat(zoomSlider.value);
                    sendPiCommand('/set_zoom', { zoom: zoomValue }); 
                    zoomValueDisplay.textContent = `${zoomValue.toFixed(1)}x`;
                });
                zoomSlider.addEventListener('mouseup', () => { isUserDraggingZoom = false; });
                zoomSlider.addEventListener('touchend', () => { isUserDraggingZoom = false; });
            }

            // KHỞI ĐỘNG LOGIC VIDEO
            handleDisconnection();
            setTimeout(() => {
                if (!isUiConnected) {
                     videoFeed.src = `/video_feed?timestamp=${new Date().getTime()}`;
                }
            }, 1000);
        }
    })();
});