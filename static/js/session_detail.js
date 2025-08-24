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

    const shotStatusList = document.getElementById('shot-status-list');

    let activeShooterId = null;
    let connectionInterval;
    let dataFeedInterval;
    let shotHistory = []; // Lưu trữ lịch sử bắn

    function updateConnectionStatus(isConnected) {
        if (isConnected) {
            connectionStatusBanner.className = 'mb-2 fw-bold alert alert-success';
            connectionText.textContent = 'Thiết bị đã kết nối';
            videoFeed.style.display = 'block';
            statusMessage.style.display = 'none';
        } else {
            connectionStatusBanner.className = 'mb-2 fw-bold alert alert-danger';
            connectionText.textContent = 'Thiết bị ngắt kết nối';
            videoFeed.style.display = 'none';
            statusMessage.style.display = 'flex';
        }
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

    async function updateProcessedData() {
        try {
            const response = await fetch('/data_feed');
            if (response.ok) {
                const data = await response.json();
                shotTime.textContent = data.time;
                targetName.textContent = data.target;
                shotScore.textContent = data.score;
                if (data.image_data) {
                    targetImage.src = `data:image/jpeg;base64,${data.image_data}`;
                }

                // Thêm trạng thái bắn mới vào danh sách
                if (data.score !== '--.-') {
                    const statusItem = document.createElement('p');
                    const shooter = soldiers.find(s => s.id === activeShooterId);
                    const shooterName = shooter ? `${shooter.rank} ${shooter.name}` : 'Không xác định';
                    statusItem.textContent = `${data.time} - ${shooterName}: Điểm ${data.score}, Mục tiêu ${data.target}`;
                    shotStatusList.prepend(statusItem); // Thêm lên đầu
                    if (shotStatusList.children.length > 10) {
                        shotStatusList.removeChild(shotStatusList.lastChild); // Giữ tối đa 10 dòng
                    }
                }
            }
        } catch (error) {
            console.error("Lỗi khi cập nhật dữ liệu:", error);
        }
    }

    async function loadSessionDetails() {
        if (!sessionId) return;
        try {
            const response = await fetch(`/api/training_sessions/${sessionId}`);
            if (!response.ok) throw new Error('Không thể tải dữ liệu phiên tập.');
            const data = await response.json();

            sessionNameHeader.textContent = data.session_name || `Phiên Tập #${data.id}`;
            exerciseNameDisplay.textContent = `Bài tập: ${data.exercise_name}`;

            soldiersList.innerHTML = '';
            soldiers = data.soldiers || [];
            shooterCountBadge.textContent = soldiers.length;

            if (soldiers.length > 0) {
                soldiers.forEach(soldier => {
                    const soldierItem = document.createElement('a');
                    soldierItem.href = "#";
                    soldierItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
                    soldierItem.innerHTML = `
                        <span><i class="fas fa-user me-2"></i>${soldier.rank} ${soldier.name}</span>
                        <button class="btn btn-sm btn-outline-primary select-shooter-btn" data-soldier-id="${soldier.id}">Chọn</button>
                    `;
                    soldiersList.appendChild(soldierItem);
                });
            } else {
                soldiersList.innerHTML = '<div class="list-group-item">Không có xạ thủ nào trong phiên này.</div>';
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

    // Thiết lập interval để kiểm tra kết nối và cập nhật dữ liệu
    connectionInterval = setInterval(checkConnectionStatus, 3000);
    dataFeedInterval = setInterval(updateProcessedData, 1000);

    // Tải thông tin phiên tập và danh sách xạ thủ
    let soldiers = [];
    loadSessionDetails();

    // Gán sự kiện cho danh sách xạ thủ
    soldiersList.addEventListener('click', handleSelectShooter);
});