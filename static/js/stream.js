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
        if (isConnected) {
            statusMessage.style.display = 'none';
            videoFeed.style.display = 'block';
            infoPlaceholder.style.display = 'none';
            infoDisplay.style.display = 'block';
            connectionBanner.classList.remove('disconnected');
            connectionBanner.classList.add('connected');
            connectionText.innerHTML = '<i class="fas fa-check-circle"></i> Thiết bị đã kết nối';
            videoFeed.src = "/video_feed";
        } else {
            statusMessage.style.display = 'flex';
            videoFeed.style.display = 'none';
            infoPlaceholder.style.display = 'block';
            infoDisplay.style.display = 'none';
            connectionBanner.classList.remove('connected');
            connectionBanner.classList.add('disconnected');
            connectionText.innerHTML = '<i class="fas fa-times-circle"></i> Mất kết nối với thiết bị';
            videoFeed.src = "";
        }
    }

    // Hàm mới để cập nhật dữ liệu đã xử lý
    function updateProcessedData() {
        fetch('/data_feed')
            .then(response => {
                if (response.status === 204 || response.headers.get('content-length') === '0') {
                    return {};
                }
                return response.json();
            })
            .then(data => {
                if (data && Object.keys(data).length > 0) {
                    // Cập nhật các trường dữ liệu
                    document.getElementById('shot-time').innerText = data.time;
                    document.getElementById('target').innerText = data.target;
                    document.getElementById('shot-score').innerText = data.score;
                    
                    // Cập nhật ảnh, sử dụng data.image_data thay vì data.image_url
                    const targetImage = document.getElementById('target-image');
                    if (data.image_data) {
                        targetImage.src = `data:image/jpeg;base64,${data.image_data}`;
                    } else {
                        targetImage.src = 'https://i.imgur.com/G5T5j92.png';
                    }
                }
            })
            .catch(error => {
                console.error('Lỗi khi lấy dữ liệu đã xử lý:', error);
            });
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
                }
                // Luôn cập nhật dữ liệu xử lý, bất kể trạng thái kết nối có thay đổi hay không
                // Đảm bảo dữ liệu hiển thị là mới nhất
                updateProcessedData();
            })
            .catch(error => {
                console.error("Lỗi khi kiểm tra trạng thái kết nối:", error);
                if (isConnected) {
                    isConnected = false;
                    updateDisplay(isConnected);
                }
            });
    }

    if (videoFeed) {
        videoFeed.addEventListener('error', function() {
            if (isConnected) {
                isConnected = false;
                updateDisplay(isConnected);
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
                    
                    // Logic đã được sửa: Chỉ chuyển hướng khi có ít nhất 1 chiến sĩ
                    if (data.total > 0) {
                        window.location.href = `/${mode}`;
                    } else {
                        alert('Bạn cần phải thêm ít nhất một chiến sĩ để sử dụng chế độ này.');
                    }
                } catch (error) {
                    console.error('Lỗi khi kiểm tra số lượng chiến sĩ:', error);
                    alert('Đã xảy ra lỗi. Vui lòng thử lại.');
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

