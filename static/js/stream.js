// static/js/stream.js
// Logic xử lý trạng thái livestream và chuyển đổi chế độ bắn

document.addEventListener('DOMContentLoaded', function() {
    // --- KHU VỰC LOGIC CHUNG CHO LIVESTREAM VÀ KẾT NỐI ---
    const videoFeed = document.getElementById('video-feed');
    const statusMessage = document.getElementById('status-message');
    const connectionBanner = document.getElementById('connection-status-banner');
    const connectionText = document.getElementById('connection-text');
    const infoPlaceholder = document.getElementById('info-placeholder');
    const infoDisplay = document.getElementById('info-display');
    const clearSoldierBtn = document.getElementById('clear-soldier-btn');
    const soldierInfoEl = document.getElementById('soldier-info');
    
    let isConnected = false; 

    // Hàm cập nhật hiển thị dựa trên trạng thái kết nối
    function updateDisplay(isConnected) {
        if (videoFeed && statusMessage) {
            if (isConnected) {
                statusMessage.style.display = 'none';
                videoFeed.style.display = 'block';
            } else {
                statusMessage.style.display = 'flex';
                videoFeed.style.display = 'none';
            }
        }
        
        if (infoPlaceholder && infoDisplay) {
            if (isConnected) {
                infoPlaceholder.style.display = 'none';
                infoDisplay.style.display = 'block';
            } else {
                infoPlaceholder.style.display = 'block';
                infoDisplay.style.display = 'none';
            }
        }
    }

    // Hàm kiểm tra trạng thái kết nối
    function checkConnectionStatus() {
        fetch('/connection-status')
            .then(response => response.json())
            .then(data => {
                const newStatus = data.status === 'connected';

                if (newStatus !== isConnected) {
                    isConnected = newStatus;

                    updateDisplay(isConnected);
                    
                    if (isConnected) {
                        videoFeed.src = "/video_feed";
                        connectionBanner.classList.remove('disconnected');
                        connectionBanner.classList.add('connected');
                        connectionText.innerHTML = '<i class="fas fa-check-circle"></i> Thiết bị đã kết nối';
                    } else {
                        videoFeed.src = "";
                        connectionBanner.classList.remove('connected');
                        connectionBanner.classList.add('disconnected');
                        connectionText.innerHTML = '<i class="fas fa-times-circle"></i> Mất kết nối với thiết bị';
                    }
                }
            })
            .catch(error => {
                console.error("Lỗi khi kiểm tra trạng thái kết nối:", error);
                if (isConnected) {
                    isConnected = false;
                    updateDisplay(isConnected);
                    videoFeed.src = "";
                    connectionBanner.classList.remove('connected');
                    connectionBanner.classList.add('disconnected');
                    connectionText.innerHTML = '<i class="fas fa-times-circle"></i> Mất kết nối với thiết bị';
                }
            });
    }

    if (videoFeed) {
        videoFeed.addEventListener('error', function() {
            if (isConnected) {
                isConnected = false;
                updateDisplay(isConnected);
                videoFeed.src = "";
                connectionBanner.classList.remove('connected');
                connectionBanner.classList.add('disconnected');
                connectionText.innerHTML = '<i class="fas fa-times-circle"></i> Mất kết nối với thiết bị';
            }
        });
    }
    
    // --- KHU VỰC LOGIC CHUYỂN ĐỔI CHẾ ĐỘ ---
    const modal = document.getElementById('modeSelectionModal');

    if (modal) {
        modal.addEventListener('click', async function(event) {
            const modeItem = event.target.closest('[data-mode]');
            if (!modeItem) return;

            const mode = modeItem.getAttribute('data-mode');

            if (mode === 'livestream') {
                window.location.href = window.location.origin + '/livestream';
            } else {
                try {
                    const response = await fetch(window.API_ENDPOINTS.soldier_count);
                    const data = await response.json();
                    if (data.total === 0) {
                        alert('Bạn cần phải thêm ít nhất một chiến sĩ để sử dụng chế độ này.');
                        window.location.href = '/';
                        return;
                    }
                    window.location.href = `/${mode}`;
                } catch (error) {
                    console.error('Lỗi khi kiểm tra số lượng chiến sĩ:', error);
                    alert('Đã xảy ra lỗi. Vui lòng thử lại.');
                    return;
                }
            }
        });
    }

    // --- LOGIC HIỂN THỊ THÔNG TIN CHIẾN SĨ ---
    async function fetchSoldierInfo(id) {
        try {
            const url = window.API_ENDPOINTS.get_soldier_base.replace('0', id);
            const response = await fetch(url);
            const data = await response.json();
            if (response.ok) {
                return data;
            } else {
                console.error('Lỗi khi lấy thông tin chiến sĩ:', data.error);
                return null;
            }
        } catch (error) {
            console.error('Lỗi mạng khi lấy thông tin chiến sĩ:', error);
            return null;
        }
    }

    async function displaySoldierInfo() {
        let soldierId = window.currentSoldierId;

        if (!soldierId) {
            soldierId = sessionStorage.getItem('soldierId');
        }

        if (soldierId) {
            const soldier = await fetchSoldierInfo(soldierId);
            if (soldier) {
                soldierInfoEl.textContent = `(Chiến sĩ: ${soldier.rank} ${soldier.name})`;
                soldierInfoEl.classList.remove('d-none');
                clearSoldierBtn.style.display = 'inline';
            }
        } else {
            soldierInfoEl.textContent = '';
            soldierInfoEl.classList.add('d-none');
            clearSoldierBtn.style.display = 'none';
        }
    }
    
    if (clearSoldierBtn) {
        clearSoldierBtn.addEventListener('click', function() {
            sessionStorage.removeItem('soldierId');
            window.location.href = '/livestream';
        });
    }

    // Khởi tạo trạng thái ban đầu
    displaySoldierInfo();
    checkConnectionStatus();
    setInterval(checkConnectionStatus, 3000);
});