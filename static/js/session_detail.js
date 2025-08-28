document.addEventListener('DOMContentLoaded', async function() {
    const pathParts = window.location.pathname.split('/');
    const sessionId = pathParts.length > 1 ? pathParts.pop() : null;

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

    let activeShooterId = null;
    let lastProcessedShotId = null;
    let connectionInterval;
    let dataFeedInterval;
    let shotHistory = []; // Lưu trữ lịch sử bắn

// <<< THÊM TOÀN BỘ KHỐI CODE NÀY VÀO ĐÂY >>>
    // --- LOGIC HỦY KÍCH HOẠT KHI RỜI TRANG ---
    window.addEventListener('beforeunload', function(event) {
        // navigator.sendBeacon đảm bảo yêu cầu được gửi đi một cách đáng tin cậy
        // ngay cả khi trang đang trong quá trình đóng lại.
        if (navigator.sendBeacon) {
            // Gửi một request trống đến API hủy kích hoạt
            navigator.sendBeacon('/api/deactivate_shooter', new Blob());
            console.log("Đã gửi yêu cầu hủy kích hoạt đến server.");
        }
        
        // Phần này để hiển thị cảnh báo cho người dùng (tùy chọn)
        // Lưu ý: Các trình duyệt hiện đại sẽ hiển thị thông báo mặc định của riêng chúng
        if (activeShooterId) {
            const confirmationMessage = 'Các thay đổi có thể không được lưu nếu bạn rời đi.';
            event.returnValue = confirmationMessage;
            return confirmationMessage;
        }
    });

    function updateConnectionStatus(isConnected) {
        if (isConnected) {
            connectionStatusBanner.className = 'mb-2 fw-bold alert alert-success';
            connectionText.textContent = 'Thiết bị đã kết nối';
            videoFeed.style.display = 'block';
            statusMessage.style.display = 'none';

            videoFeed.src = '/video_feed';
        } else {
            connectionStatusBanner.className = 'mb-2 fw-bold alert alert-danger';
            connectionText.textContent = 'Thiết bị ngắt kết nối';
            videoFeed.style.display = 'none';
            statusMessage.style.display = 'flex';
            // Xóa nguồn video khi ngắt kết nối để dừng việc tải và tránh lỗi console
            videoFeed.src = ''; 
        }
    }

    // Thêm hàm này vào sau hàm updateConnectionStatus
    function toggleResultPanel(state, message = 'Vui lòng chọn một xạ thủ để bắt đầu!') {
        const resultList = document.querySelector('#current-shooter-name').closest('.list-group');
        const targetImageContainer = document.getElementById('target-image-container');
        
        if (state === 'show') {
            resultList.style.display = 'block';
            targetImageContainer.style.display = 'block';
            // Xóa thông báo nếu có
            const notice = document.getElementById('shooter-notice');
            if (notice) notice.remove();
        } else { // 'hide' or any other state
            resultList.style.display = 'none';
            targetImageContainer.style.display = 'none';
            // Thêm thông báo nếu chưa có
            if (!document.getElementById('shooter-notice')) {
                const noticeElement = document.createElement('div');
                noticeElement.id = 'shooter-notice';
                noticeElement.className = 'd-flex flex-column justify-content-center align-items-center text-center h-100 text-muted';
                noticeElement.innerHTML = `<i class="fas fa-hand-pointer fa-2x mb-3"></i><p>${message}</p>`;
                targetImageContainer.parentNode.insertBefore(noticeElement, targetImageContainer);
            }
        }
    }

    function resetLatestResultPanel() {
    shotTime.textContent = '--:--:--';
    targetName.textContent = '--';
    shotScore.textContent = '--.-';
    // Ẩn ảnh và hiện lại thông báo
    targetImage.style.display = 'none';
    targetImageNotice.style.display = 'block';
    }
    async function checkConnectionStatus() {
        try {
            const response = await fetch('/connection-status');
            if (response.ok) {
                const data = await response.json();
                updateConnectionStatus(data.status === 'connected');
            } else {
                updateConnectionStatus(false);
            }
        } catch (error) {
            updateConnectionStatus(false);
        }
    }

    // THAY THẾ HOÀN TOÀN HÀM CŨ BẰNG HÀM NÀY
    async function updateProcessedData() {
        try {
            const response = await fetch('/data_feed');
            if (!response.ok) return;

            const data = await response.json();
            
            // Cập nhật thẻ "Kết quả Bắn Mới nhất" (luôn hiển thị)
            shotTime.textContent = data.time;
            targetName.textContent = data.target;
            shotScore.textContent = data.score;
            

            // Thay thế toàn bộ khối if cũ bằng khối lệnh này
            if (data.shot_id && data.shot_id !== lastProcessedShotId) {
                // Nếu không có xạ thủ nào đang hoạt động, không làm gì cả
                if (!activeShooterId) {
                    console.log("Bỏ qua phát bắn vì chưa chọn xạ thủ.");
                    lastProcessedShotId = data.shot_id; // Vẫn cập nhật ID để không xử lý lại
                    return; 
                }

                lastProcessedShotId = data.shot_id;
                if (data.image_data) {
                    targetImage.src = `data:image/jpeg;base64,${data.image_data}`;
                    // Hiện ảnh và ẩn thông báo đi
                    targetImage.style.display = 'block';
                    targetImageNotice.style.display = 'none';
                }
                const emptyMessage = document.getElementById('no-shots-message');
                if (emptyMessage) {
                    emptyMessage.remove(); // Hoặc shotStatusList.innerHTML = '';
                }
                
                // Lấy số thứ tự của phát bắn mới nhất
                const newShotNumber = await updateSessionOverview();

                const shooter = soldiers.find(s => s.id === activeShooterId);
                const shooterName = shooter ? `${shooter.rank} ${shooter.name}` : 'Không xác định';
                const statusItem = document.createElement('div');
                statusItem.innerHTML = `
                    <div class="flex-grow-1 d-flex align-items-center">
                        <span class="badge bg-primary me-3">${newShotNumber}</span>

                        <span class="me-4" style="line-height: 1.2;">
                            ${data.time} - <strong>${shooterName}</strong>
                        </span>
                        <div class="d-flex">
                            <span class="text-muted me-2">Mục tiêu:</span>
                            <strong>${data.target}</strong>
                        </div>
                    </div>

                    <div class="d-flex align-items-baseline" style="min-width: 80px;">
                        <span class="text-muted me-2">Điểm:</span>
                        <strong class="text-danger">${data.score}</strong>
                    </div>
                `;

                // GIẢM PADDING TỪ py-2 THÀNH py-1
                statusItem.className = 'd-flex justify-content-between align-items-center small py-1 border-bottom';
                shotStatusList.prepend(statusItem);

                // ----- Cập nhật số phát bắn cho xạ thủ đang hoạt động -----
                if (activeShooterId) {
                    // 1. Tìm đúng thẻ <a> chứa thông tin của xạ thủ
                    const shooterListItem = soldiersList.querySelector(`[data-soldier-item-id="${activeShooterId}"]`);
                    
                    if (shooterListItem) {
                        // 2. Tìm huy hiệu (badge) bên trong thẻ đó
                        const shotCountBadge = shooterListItem.querySelector('.badge');
                        
                        if (shotCountBadge) {
                            // 3. Lấy số hiện tại, +1, và cập nhật lại giao diện
                            const currentCountText = shotCountBadge.innerText.trim();
                            const currentCount = parseInt(currentCountText) || 0;
                            const newCount = currentCount + 1;
                            
                            // Cập nhật lại nội dung của badge, giữ nguyên icon
                            shotCountBadge.innerHTML = `<i class="fas fa-bullseye me-1"></i>${newCount}`;
                        }
                    }
                }

                if (shotStatusList.children.length > 15) {
                    shotStatusList.removeChild(shotStatusList.lastChild);
                }

                // Cập nhật lại các thông số khác khi có bắn mới
                //updateSessionOverview();
                // Bạn cũng có thể gọi lại hàm loadSessionDetails() để cập nhật số phát bắn của từng xạ thủ,
                // nhưng để tối ưu, chúng ta sẽ xử lý sau nếu cần.
            }
        } catch (error) {
            console.error("Lỗi khi cập nhật dữ liệu:", error);
        }
    }

    // Thay thế hoàn toàn hàm loadSessionDetails cũ bằng hàm này
    async function loadSessionDetails() {
        if (!sessionId) return;
        try {
            const response = await fetch(`/api/training_sessions/${sessionId}`);
            if (!response.ok) throw new Error('Không thể tải dữ liệu phiên tập.');
            const data = await response.json();

            // Cập nhật tên phiên ở header (luôn hiển thị)
            sessionNameHeader.textContent = data.session_name || `Phiên Tập #${data.id}`;

            // <<< LOGIC MỚI: KIỂM TRA VÀ THAY THẾ TOÀN BỘ NỘI DUNG >>>
            if (data.status === 'COMPLETED') {
                const mainContainer = document.querySelector('.container-fluid.px-4.mt-4');
                
                // Xóa nội dung cũ và chèn vào thông báo kết thúc
                mainContainer.innerHTML = `
                    <div class="text-center p-5">
                        <i class="fas fa-check-circle fa-5x text-success mb-4"></i>
                        <h2 class="display-6">Phiên tập này đã kết thúc.</h2>
                        <p class="lead text-muted">Mọi thao tác đã được vô hiệu hóa.</p>
                    </div>
                `;
                // Dừng hàm tại đây
                return 'COMPLETED';
            }

            // --- Nếu phiên chưa kết thúc, code sẽ tiếp tục chạy như bình thường ---
            exerciseNameDisplay.textContent = `Bài tập: ${data.exercise_name}`;
            soldiersList.innerHTML = '';
            soldiers = data.soldiers || [];
            shooterCountBadge.textContent = soldiers.length;

            if (soldiers.length > 0) {
                soldiers.forEach(soldier => {
                    const soldierItem = document.createElement('div');
                    soldierItem.dataset.soldierItemId = soldier.id;
                    soldierItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                    
                    // <<< THAY ĐỔI CẤU TRÚC innerHTML TẠI ĐÂY >>>
                    soldierItem.innerHTML = `
                        <div class="d-flex align-items-center">
                            <button class="btn btn-sm btn-outline-primary select-shooter-btn me-3" data-soldier-id="${soldier.id}">Chọn</button>
                            
                            <span>
                                ${soldier.rank} ${soldier.name}
                            </span>
                        </div>
                        
                        <span class="badge bg-secondary" title="Số phát bắn">
                            <i class="fas fa-bullseye me-1"></i>${soldier.shot_count}
                        </span>
                    `;
                    soldiersList.appendChild(soldierItem);
                });
            } else {
                soldiersList.innerHTML = '<div class="list-group-item">Không có xạ thủ nào trong phiên này.</div>';
            }
            
            const shooterWasSynced = await syncActiveShooterState();

            if (!shooterWasSynced) {
                toggleResultPanel('hide');
            }

        } catch (error) {
            console.error('Lỗi khi tải chi tiết phiên tập:', error);
            sessionNameHeader.textContent = 'Lỗi tải dữ liệu';
        }
    }

    async function handleSelectShooter(event) {
        event.preventDefault();
        const button = event.target.closest('.select-shooter-btn');
        if (!button) return;

        activeShooterId = parseInt(button.dataset.soldierId);

        toggleResultPanel('show');

        resetLatestResultPanel();
        
        const selectedSoldier = soldiers.find(s => s.id === activeShooterId);
        currentShooterName.textContent = selectedSoldier ? `${selectedSoldier.rank} ${selectedSoldier.name}` : 'Không xác định';

        document.querySelectorAll('#soldiers-list .list-group-item').forEach(item => {
            item.classList.remove('active');
        });
        button.closest('.list-group-item').classList.add('active');

        try {
            const response = await fetch('/api/activate_shooter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, soldier_id: activeShooterId })
            });
            if (!response.ok) {
                console.error("Lỗi khi kích hoạt xạ thủ.");
            }
        } catch (error) {
            console.error("Lỗi khi kích hoạt xạ thủ:", error);
        }
    }

    async function updateSessionOverview() {
        if (!sessionId) return; // Đảm bảo sessionId đã tồn tại

        try {
            const response = await fetch(`/api/sessions/${sessionId}/shots`);
            if (!response.ok) {
                console.error("Lỗi khi tải lịch sử bắn của phiên.");
                return;
            }
            const shots = await response.json();

            const totalShots = shots.length;
            
            if (totalShots === 0) {
                // Nếu chưa có phát bắn nào, trả về giá trị mặc định
                totalShotsEl.textContent = '0';
                hitRateEl.textContent = '0%';
                averageScoreEl.textContent = '0.0';
                return;
            }

            // 1. Tính tổng điểm
            const totalScore = shots.reduce((sum, shot) => sum + parseFloat(shot.score || 0), 0);
            
            // 2. Đếm số lần bắn trúng (điểm > 0)
            const hitCount = shots.filter(shot => parseFloat(shot.score || 0) > 0).length;

            // 3. Tính điểm trung bình
            const averageScore = totalScore / totalShots;

            // 4. Tính tỷ lệ trúng mục tiêu
            const hitRate = (hitCount / totalShots) * 100;
            
            // 5. Cập nhật lên giao diện
            totalShotsEl.textContent = totalShots;
            hitRateEl.textContent = `${hitCount}/${totalShots} - ${hitRate.toFixed(1)}%`; // Làm tròn 1 chữ số thập phân
            averageScoreEl.textContent = averageScore.toFixed(1); // Làm tròn 1 chữ số thập phân
            
            return totalShots;
        } catch (error) {
            console.error("Lỗi khi cập nhật tổng quan phiên:", error);
            return 0;
        }
    }

    // Thêm hàm này vào cuối file session_detail.js
    async function loadShotHistory() {
        if (!sessionId) return;
        try {
            const response = await fetch(`/api/sessions/${sessionId}/shots`);
            const shots = await response.json();

            shotStatusList.innerHTML = ''; // Xóa thông báo mặc định

            if (shots.length === 0) {
                shotStatusList.innerHTML = '<p id="no-shots-message" class="text-muted mb-0">Chưa có phát bắn nào được ghi nhận.</p>';
                return;
            }

        // Thay thế vòng lặp forEach cũ bằng đoạn mã này
            let shotCounter = shots.length; // Bắt đầu đếm từ tổng số phát bắn

            shots.forEach(shot => {
                const statusItem = document.createElement('div');

                statusItem.innerHTML = `
                    <div class="flex-grow-1 d-flex align-items-center">
                        <span class="badge bg-secondary me-3">${shotCounter}</span>
                        
                        <span class="me-4" style="line-height: 1.2;">
                            ${shot.shot_time} - <strong>${shot.soldier_rank} ${shot.soldier_name}</strong>
                        </span>
                        <div class="d-flex">
                            <span class="text-muted me-2">Mục tiêu:</span>
                            <strong>${shot.target_name}</strong>
                        </div>
                    </div>

                    <div class="d-flex align-items-baseline" style="min-width: 80px;">
                        <span class="text-muted me-2">Điểm:</span>
                        <strong class="text-danger">${shot.score}</strong>
                    </div>
                `;

                // GIẢM PADDING TỪ py-2 THÀNH py-1
                statusItem.className = 'd-flex justify-content-between align-items-center small py-1 border-bottom';
                shotStatusList.appendChild(statusItem);

                shotCounter--; // Giảm bộ đếm cho phát bắn cũ hơn
            });
        } catch (error) {
            console.error("Lỗi khi tải lịch sử bắn:", error);
        }
    }

    // Thêm hàm này vào sau hàm loadShotHistory
    async function syncActiveShooterState() {
        if (!sessionId) return;
        try {
            const response = await fetch(`/api/session/${sessionId}/active_shooter`, { cache: 'no-store' });
            const data = await response.json();

            if (data.active_soldier_id) {
                console.log(`Đồng bộ trạng thái: Xạ thủ #${data.active_soldier_id} đang hoạt động.`);
                
                // 1. Cập nhật biến activeShooterId
                activeShooterId = data.active_soldier_id;

                // 2. Tìm và hiển thị tên xạ thủ
                const selectedSoldier = soldiers.find(s => s.id === activeShooterId);
                if (selectedSoldier) {
                    currentShooterName.textContent = `${selectedSoldier.rank} ${selectedSoldier.name}`;
                }

                // 3. Highlight xạ thủ trong danh sách
                // Bỏ highlight cũ
                document.querySelectorAll('#soldiers-list .list-group-item').forEach(item => item.classList.remove('active'));
                // Highlight xạ thủ mới
                const shooterListItem = soldiersList.querySelector(`[data-soldier-item-id="${activeShooterId}"]`);
                if (shooterListItem) {
                    shooterListItem.classList.add('active');
                }

                // 4. Hiển thị lại khung kết quả
                toggleResultPanel('show');
                return true;
            }
        } catch (error) {
            console.error("Lỗi khi đồng bộ trạng thái xạ thủ:", error);
        }
        return false;
    }

    // Thêm hàm này vào file
    async function initializeLatestShotId() {
        try {
            const response = await fetch('/data_feed', { cache: 'no-store' });
            if (response.ok) {
                const data = await response.json();
                if (data && data.shot_id) {
                    lastProcessedShotId = data.shot_id;
                }
            }
        } catch (error) {
            console.error("Không thể khởi tạo ID phát bắn mới nhất:", error);
        }
    }

    async function startTrainingSession() {
        if (!sessionId) return;
        try {
            await fetch(`/api/training_sessions/${sessionId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            console.log(`Đã gửi yêu cầu bắt đầu cho phiên #${sessionId}`);
        } catch (error) {
            console.error('Lỗi khi gửi yêu cầu bắt đầu phiên:', error);
        }
    }
    // Thiết lập interval để kiểm tra kết nối và cập nhật dữ liệu
    connectionInterval = setInterval(checkConnectionStatus, 3000);
    dataFeedInterval = setInterval(updateProcessedData, 1000);

    // Tải thông tin phiên tập và danh sách xạ thủ
    let soldiers = [];
    // Gọi loadSessionDetails và đợi kết quả trạng thái
    const sessionStatus = await loadSessionDetails();

    // Chỉ gọi "start" nếu phiên chưa hoàn thành
    if (sessionStatus !== 'COMPLETED') {
        startTrainingSession();
    }

    // Gán sự kiện cho danh sách xạ thủ
    soldiersList.addEventListener('click', handleSelectShooter);
    // <<< THÊM TOÀN BỘ KHỐI CODE NÀY VÀO >>>
    const finishSessionBtn = document.getElementById('end-session-btn');
    if (finishSessionBtn) {
        finishSessionBtn.addEventListener('click', async () => {
            if (confirm('Bạn có chắc chắn muốn kết thúc phiên huấn luyện này không?')) {
                try {
                    const response = await fetch(`/api/training_sessions/${sessionId}/finish`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (response.ok) {
                        alert('Đã kết thúc phiên huấn luyện!');
                        // Chuyển hướng người dùng về trang chủ (hoặc trang quản lý phiên tập)
                        window.location.href = '/training'; 
                    } else {
                        alert('Có lỗi xảy ra, không thể kết thúc phiên.');
                    }
                } catch (error) {
                    console.error('Lỗi khi kết thúc phiên:', error);
                    alert('Lỗi kết nối. Vui lòng thử lại.');
                }
            }
        });
    }
    
});