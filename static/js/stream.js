// static/js/stream.js
// Logic xử lý trạng thái livestream và chuyển đổi chế độ bắn

(function () {
    // --- KHU VỰC LOGIC LIVESTREAM VÀ KẾT NỐI ---
    const videoFeed = document.getElementById('video-feed');
    const statusMessage = document.getElementById('status-message');
    const infoPlaceholder = document.getElementById('info-placeholder');
    const infoDisplay = document.getElementById('info-display');
    const connectionBanner = document.getElementById('connection-status-banner');
    const connectionText = document.getElementById('connection-text');

    let isConnected = false; 

    function checkConnectionStatus() {
        fetch('/connection-status')
            .then(response => response.json())
            .then(data => {
                const newStatus = data.status === 'connected';

                if (newStatus !== isConnected) {
                    isConnected = newStatus;

                    if (isConnected) {
                        statusMessage.style.display = 'none';
                        videoFeed.style.display = 'block';
                        videoFeed.src = "/video_feed";
                        infoPlaceholder.style.display = 'none';
                        infoDisplay.style.display = 'block';

                        connectionBanner.classList.remove('disconnected');
                        connectionBanner.classList.add('connected');
                        connectionText.innerHTML = '<i class="fas fa-check-circle"></i> Thiết bị đã kết nối';
                    } else {
                        statusMessage.style.display = 'flex';
                        videoFeed.style.display = 'none';
                        videoFeed.src = "";
                        infoPlaceholder.style.display = 'block';
                        infoDisplay.style.display = 'none';

                        connectionBanner.classList.remove('connected');
                        connectionBanner.classList.add('disconnected');
                        connectionText.innerHTML = '<i class="fas fa-times-circle"></i> Mất kết nối với thiết bị';
                    }
                }
            })
            .catch(error => {
                console.error("🔥 Lỗi khi gọi /connection-status:", error);
            });
    }

    videoFeed.addEventListener('error', function() {
        if (isConnected) {
            isConnected = false;
            statusMessage.style.display = 'flex';
            videoFeed.style.display = 'none';
            videoFeed.src = "";
            infoPlaceholder.style.display = 'block';
            infoDisplay.style.display = 'none';
        }
    });

    checkConnectionStatus();
    setInterval(checkConnectionStatus, 3000);

    // --- KHU VỰC LOGIC CHUYỂN ĐỔI CHẾ ĐỘ VÀ HIỂN THỊ THÔNG TIN CHIẾN SĨ ---
    const modal = document.getElementById('modeSelectionModal');
    const soldierInfoEl = document.getElementById('soldier-info');
    const clearSoldierBtn = document.getElementById('clear-soldier-btn');

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

    if (modal) {
        modal.addEventListener('click', async function(event) {
            const modeItem = event.target.closest('[data-mode]');
            if (!modeItem) return;

            const mode = modeItem.getAttribute('data-mode');

            // --- LOGIC MỚI BỔ SUNG ---
            if (mode !== 'livestream' && !window.currentSoldierId) {
                alert('Vui lòng chọn một chiến sĩ trước khi chọn chế độ huấn luyện.');
                return; 
            }
            // --- KẾT THÚC LOGIC MỚI ---

            // Lưu soldier_id vào sessionStorage trước khi chuyển trang
            if (window.currentSoldierId) {
                sessionStorage.setItem('soldierId', window.currentSoldierId);
            }

            // Logic chuyển hướng người dùng
            if (mode === 'livestream') {
                const baseUrl = window.location.origin + '/livestream';
                window.location.href = window.currentSoldierId ? `${baseUrl}?soldier_id=${window.currentSoldierId}` : baseUrl; 
            } else {
                try {
                    const response = await fetch(window.API_ENDPOINTS.soldier_count);
                    const data = await response.json();
                    if (data.total === 0) {
                        alert('Bạn cần phải thêm ít nhất một chiến sĩ để sử dụng chế độ này.');
                        window.location.href = '/'; 
                        return;
                    }
                    
                    const modeUrl = `/${mode}`;
                    window.location.href = window.currentSoldierId ? `${modeUrl}?soldier_id=${window.currentSoldierId}` : modeUrl;

                } catch (error) {
                    console.error('Lỗi khi kiểm tra số lượng chiến sĩ:', error);
                    alert('Đã xảy ra lỗi. Vui lòng thử lại.');
                    return;
                }
            }
        });
    }

    if (clearSoldierBtn) {
        clearSoldierBtn.addEventListener('click', function() {
            sessionStorage.removeItem('soldierId');
            window.location.href = '/livestream';
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const soldierIdFromUrl = urlParams.get('soldier_id');

    if (soldierIdFromUrl) {
        window.currentSoldierId = soldierIdFromUrl;
        sessionStorage.setItem('soldierId', soldierIdFromUrl);
    } else {
        window.currentSoldierId = sessionStorage.getItem('soldierId');
    }

    displaySoldierInfo();

})();