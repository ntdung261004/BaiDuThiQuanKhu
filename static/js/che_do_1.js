// static/js/che_do_1.js

document.addEventListener('DOMContentLoaded', async function() {
    const soldierInfoEl = document.getElementById('soldier-info');
    const backButton = document.getElementById('back-to-livestream');

    const soldierId = sessionStorage.getItem('soldierId');

    if (soldierId) {
        try {
            const response = await fetch(`/api/soldiers/${soldierId}`);
            const data = await response.json();
            if (response.ok) {
                soldierInfoEl.textContent = `(Chiến sĩ: ${data.rank} ${data.name})`;
                soldierInfoEl.classList.remove('d-none');
            } else {
                console.error('Lỗi khi lấy thông tin chiến sĩ:', data.error);
            }
        } catch (error) {
            console.error('Lỗi mạng khi lấy thông tin chiến sĩ:', error);
        }
        
        backButton.href = `/livestream?soldier_id=${soldierId}`;
    } else {
        backButton.href = `/livestream`;
    }

    // --- LOGIC MỚI CHO LIVESTREAM VÀ KẾT NỐI ---
    const videoFeed = document.getElementById('video-feed');
    const statusMessage = document.getElementById('status-message');
    const connectionBanner = document.getElementById('connection-status-banner');
    
    const latestTime = document.getElementById('latest-time');
    const latestTarget = document.getElementById('latest-target');
    const latestScore = document.getElementById('latest-score');
    const latestImage = document.getElementById('latest-image');
    const imageNote = document.getElementById('image-note');

    let isConnected = false; 

    // Hàm kiểm tra trạng thái kết nối
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
                        connectionBanner.innerHTML = '<i class="fas fa-check-circle me-1"></i> Thiết bị đã kết nối';
                        connectionBanner.className = 'fw-bold text-success';
                    } else {
                        statusMessage.style.display = 'flex';
                        videoFeed.style.display = 'none';
                        videoFeed.src = "";
                        connectionBanner.innerHTML = '<i class="fas fa-times-circle me-1"></i> Mất kết nối với thiết bị';
                        connectionBanner.className = 'fw-bold text-danger';
                    }
                }
            })
            .catch(error => {
                console.error("Lỗi khi gọi /connection-status:", error);
                if (isConnected) {
                    isConnected = false;
                    statusMessage.style.display = 'flex';
                    videoFeed.style.display = 'none';
                    videoFeed.src = "";
                    connectionBanner.innerHTML = '<i class="fas fa-times-circle me-1"></i> Mất kết nối với thiết bị';
                    connectionBanner.className = 'fw-bold text-danger';
                }
            });
    }

    // Hàm cập nhật kết quả bắn
    function updateLatestResult() {
        fetch('/data_feed')
            .then(response => response.json())
            .then(data => {
                if (data && Object.keys(data).length > 0) {
                    latestTime.textContent = data.time;
                    latestTarget.textContent = data.target;
                    latestScore.textContent = data.score;
                    
                    // Cập nhật đường dẫn ảnh và ẩn/hiện chú thích
                    latestImage.src = data.image_url;
                    if (data.image_url.includes('vHqB3pG.png')) { // Kiểm tra nếu là ảnh mặc định
                        imageNote.style.display = 'block';
                    } else {
                        imageNote.style.display = 'none';
                    }
                }
            })
            .catch(error => {
                console.error("Lỗi khi cập nhật dữ liệu:", error);
            });
    }

    // Lắng nghe sự kiện lỗi của luồng video
    if (videoFeed) {
        videoFeed.addEventListener('error', function() {
            if (isConnected) {
                isConnected = false;
                statusMessage.style.display = 'flex';
                videoFeed.style.display = 'none';
                videoFeed.src = "";
            }
        });
    }

    // Bắt đầu kiểm tra trạng thái ngay khi tải trang và cập nhật kết quả
    checkConnectionStatus();
    updateLatestResult();
    setInterval(checkConnectionStatus, 3000);
    setInterval(updateLatestResult, 1000);
});