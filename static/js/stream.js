// static/js/stream.js

document.addEventListener('DOMContentLoaded', function() {
    // --- KHAI BÁO BIẾN ---
    const videoFeed = document.getElementById('video-feed');
    const statusMessage = document.getElementById('status-message');
    const connectionBanner = document.getElementById('connection-status-banner');
    const connectionText = document.getElementById('connection-text');
    const infoPlaceholder = document.getElementById('info-placeholder');
    const infoDisplay = document.getElementById('info-display');
    
    const controlsContainer = document.getElementById('controls-container');
    const calibrateBtn = document.getElementById('calibrate-btn');
    const helperText = document.getElementById('calibrate-helper-text');
    const zoomSlider = document.getElementById('zoom-slider');
    const zoomValueDisplay = document.getElementById('zoom-value-display');
    const zoomApplyBtn = document.getElementById('zoom-apply-btn');

    let isConnected = false;
    let isCalibrating = false;
    const STREAM_SIZE = { width: 480, height: 640 };

    // Tạo canvas để vẽ
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (videoFeed) {
        videoFeed.parentElement.style.position = 'relative';
        videoFeed.parentElement.appendChild(canvas);
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
    }

    // --- CÁC HÀM XỬ LÝ ---

    async function syncUiWithPiConfig() {
        try {
            const response = await fetch('/get_current_config');
            const config = await response.json();
            
            if (config && config.zoom) {
                console.log("Nhận được cấu hình từ server:", config);
                const zoomValue = parseFloat(config.zoom);
                if (zoomSlider) {
                    zoomSlider.value = zoomValue;
                }
                if (zoomValueDisplay) {
                    updateZoomValueDisplay();
                }
            }
        } catch (error) {
            console.error("Không thể đồng bộ cấu hình:", error);
        }
    }

    function updateZoomValueDisplay() {
        if(zoomSlider && zoomValueDisplay) {
            zoomValueDisplay.innerText = parseFloat(zoomSlider.value).toFixed(1) + 'x';
        }
    }

    function sendZoomCommand() {
        const zoomValue = zoomSlider.value;
        fetch('/set_zoom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zoom: parseFloat(zoomValue) }),
        })
        .then(response => response.json())
        .then(data => alert(`Đã gửi lệnh zoom: ${zoomValue}x`))
        .catch(error => alert('Gửi lệnh zoom thất bại!'));
    }

    function getRenderedVideoSize() {
        const videoAspectRatio = STREAM_SIZE.width / STREAM_SIZE.height;
        const containerWidth = videoFeed.clientWidth;
        const containerHeight = videoFeed.clientHeight;
        const containerAspectRatio = containerWidth / containerHeight;
        
        let renderedWidth, renderedHeight, offsetX, offsetY;

        if (containerAspectRatio > videoAspectRatio) {
            renderedHeight = containerHeight;
            renderedWidth = renderedHeight * videoAspectRatio;
            offsetX = (containerWidth - renderedWidth) / 2;
            offsetY = 0;
        } else {
            renderedWidth = containerWidth;
            renderedHeight = renderedWidth / videoAspectRatio;
            offsetX = 0;
            offsetY = (containerHeight - renderedHeight) / 2;
        }
        
        return { renderedWidth, renderedHeight, offsetX, offsetY };
    }

    function toggleCalibrationMode() {
        isCalibrating = !isCalibrating;
        if (isCalibrating) {
            calibrateBtn.classList.replace('btn-warning', 'btn-danger');
            calibrateBtn.innerHTML = '<i class="fas fa-times me-1"></i> Hủy';
            videoFeed.style.cursor = 'crosshair';
            helperText.style.display = 'block';
            canvas.width = videoFeed.clientWidth;
            canvas.height = videoFeed.clientHeight;
        } else {
            calibrateBtn.classList.replace('btn-danger', 'btn-warning');
            calibrateBtn.innerHTML = '<i class="fas fa-crosshairs me-1"></i> Hiệu chỉnh tâm';
            videoFeed.style.cursor = 'default';
            helperText.style.display = 'none';
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    function drawCrosshair(event) {
        if (!isCalibrating) return;
        const { renderedWidth, renderedHeight, offsetX, offsetY } = getRenderedVideoSize();
        const rect = videoFeed.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (mouseX >= offsetX && mouseX <= offsetX + renderedWidth &&
            mouseY >= offsetY && mouseY <= offsetY + renderedHeight) {
            const relativeMouseX = mouseX - offsetX;
            const relativeMouseY = mouseY - offsetY;
            const scaleX = STREAM_SIZE.width / renderedWidth;
            const scaleY = STREAM_SIZE.height / renderedHeight;
            const realX = Math.round(relativeMouseX * scaleX);
            const realY = Math.round(relativeMouseY * scaleY);
            
            ctx.beginPath();
            ctx.moveTo(mouseX, offsetY);
            ctx.lineTo(mouseX, offsetY + renderedHeight);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(offsetX, mouseY);
            ctx.lineTo(offsetX + renderedWidth, mouseY);
            ctx.stroke();

            const coordsText = `X: ${realX}, Y: ${realY}`;
            ctx.fillStyle = 'white';
            ctx.font = '14px Arial';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillText(coordsText, mouseX + 15, mouseY - 15);
            ctx.shadowBlur = 0;
        }
    }

    function handleVideoClick(event) {
        if (!isCalibrating) return;
        const { renderedWidth, renderedHeight, offsetX, offsetY } = getRenderedVideoSize();
        const rect = videoFeed.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        if (mouseX >= offsetX && mouseX <= offsetX + renderedWidth &&
            mouseY >= offsetY && mouseY <= offsetY + renderedHeight) {
            
            const relativeMouseX = mouseX - offsetX;
            const relativeMouseY = mouseY - offsetY;
            const scaleX = STREAM_SIZE.width / renderedWidth;
            const scaleY = STREAM_SIZE.height / renderedHeight;
            const calibratedX = Math.round(relativeMouseX * scaleX);
            const calibratedY = Math.round(relativeMouseY * scaleY);
            
            fetch('/set_center', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ center: { x: calibratedX, y: calibratedY } }),
            })
            .then(response => response.json())
            .then(data => {
                alert(`Đã gửi tâm ngắm mới: (X: ${calibratedX}, Y: ${calibratedY})`);
                toggleCalibrationMode();
            })
            .catch(error => {
                console.error('Lỗi khi gửi tọa độ:', error);
                alert('Gửi tọa độ thất bại!');
            });
        }
    }

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
            if (controlsContainer) controlsContainer.style.display = 'block';
            syncUiWithPiConfig(); // Đồng bộ ngay khi có kết nối
        } else {
            statusMessage.style.display = 'flex';
            videoFeed.style.display = 'none';
            infoPlaceholder.style.display = 'block';
            infoDisplay.style.display = 'none';
            connectionBanner.classList.remove('connected');
            connectionBanner.classList.add('disconnected');
            connectionText.innerHTML = '<i class="fas fa-times-circle"></i> Mất kết nối với thiết bị';
            videoFeed.src = "";
            if (controlsContainer) controlsContainer.style.display = 'none';
            if (isCalibrating) toggleCalibrationMode();
        }
    }

    function updateProcessedData() {
        fetch('/data_feed')
            .then(response => {
                if (response.status === 204 || response.headers.get('content-length') === '0') return {};
                return response.json();
            })
            .then(data => {
                if (data && Object.keys(data).length > 0) {
                    document.getElementById('shot-time').innerText = data.time;
                    document.getElementById('target').innerText = data.target;
                    document.getElementById('shot-score').innerText = data.score;
                    const targetImage = document.getElementById('target-image');
                    if (data.image_data) {
                        targetImage.src = `data:image/jpeg;base64,${data.image_data}`;
                    } else {
                        targetImage.src = 'https://i.imgur.com/G5T5j92.png';
                    }
                }
            })
            .catch(error => console.error('Lỗi khi lấy dữ liệu đã xử lý:', error));
    }

    function checkConnectionStatus() {
        fetch('/connection-status')
            .then(response => response.json())
            .then(data => {
                const newStatus = data.status === 'connected';
                if (newStatus !== isConnected) {
                    isConnected = newStatus;
                    updateDisplay(isConnected);
                }
                if (isConnected) {
                    updateProcessedData();
                }
            })
            .catch(error => {
                console.error("Lỗi khi kiểm tra trạng thái kết nối:", error);
                if (isConnected) {
                    isConnected = false;
                    updateDisplay(isConnected);
                }
            });
    }

    // --- GÁN SỰ KIỆN ---
    if (zoomSlider) zoomSlider.addEventListener('input', updateZoomValueDisplay);
    if (zoomApplyBtn) zoomApplyBtn.addEventListener('click', sendZoomCommand);
    if (calibrateBtn) calibrateBtn.addEventListener('click', toggleCalibrationMode);

    if (videoFeed) {
        videoFeed.addEventListener('click', handleVideoClick);
        videoFeed.addEventListener('mousemove', drawCrosshair);
        videoFeed.addEventListener('mouseleave', () => {
            if (isCalibrating) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });
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

    checkConnectionStatus();
    setInterval(checkConnectionStatus, 3000);
    syncUiWithPiConfig();
});