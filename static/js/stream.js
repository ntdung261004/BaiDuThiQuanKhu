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
                if (zoomSlider) zoomSlider.value = zoomValue;
                if (zoomValueDisplay) updateZoomValueDisplay();
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

    async function sendZoomCommand() {
        const zoomValue = zoomSlider.value;
        try {
            const response = await fetch('/set_zoom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ zoom: parseFloat(zoomValue) }),
            });
            if (!response.ok) throw new Error('Phản hồi từ server không hợp lệ.');
            await response.json();
            showToast(`Đã tinh chỉnh zoom: ${zoomValue}x`);
        } catch (error) {
            console.error('Lỗi khi gửi lệnh zoom:', error);
            showToast('Gửi lệnh zoom thất bại!', 'danger');
        }
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

    async function handleVideoClick(event) {
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
            try {
                const response = await fetch('/set_center', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ center: { x: calibratedX, y: calibratedY } }),
                });
                if (!response.ok) throw new Error('Phản hồi từ server không hợp lệ.');
                await response.json();
                showToast('Đã hiệu chỉnh tâm ngắm mới');
                toggleCalibrationMode();
            } catch (error) {
                console.error('Lỗi khi gửi tọa độ:', error);
                showToast('Gửi tọa độ thất bại!', 'danger');
            }
        }
    }

    // === BẮT ĐẦU THAY ĐỔI ĐỂ GỠ LỖI ===

    // Hàm này được đơn giản hóa để luôn hiển thị giao diện "Đã kết nối"
    function forceShowConnectedUI() {
        statusMessage.style.display = 'none';
        videoFeed.style.display = 'block';
        infoPlaceholder.style.display = 'none';
        infoDisplay.style.display = 'block';
        connectionBanner.classList.remove('disconnected');
        connectionBanner.classList.add('connected');
        connectionText.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Đang tải luồng video...';
        if (controlsContainer) controlsContainer.style.display = 'block';
    }
    
    // --- GÁN SỰ KIỆN ---
    if (zoomSlider) zoomSlider.addEventListener('input', updateZoomValueDisplay);
    if (zoomApplyBtn) zoomApplyBtn.addEventListener('click', sendZoomCommand);
    if (calibrateBtn) calibrateBtn.addEventListener('click', toggleCalibrationMode);

    if (videoFeed) {
        videoFeed.addEventListener('click', handleVideoClick);
        videoFeed.addEventListener('mousemove', drawCrosshair);
        videoFeed.addEventListener('mouseleave', () => {
            if (isCalibrating) ctx.clearRect(0, 0, canvas.width, canvas.height);
        });

        // Sự kiện khi tải video thành công
        videoFeed.addEventListener('load', function() {
            console.log("Tải luồng video thành công!");
            connectionText.innerHTML = '<i class="fas fa-check-circle"></i> Thiết bị đã kết nối';
            syncUiWithPiConfig();
        });

        // Sự kiện khi có lỗi (ví dụ: server không thể proxy)
        videoFeed.addEventListener('error', function() {
            console.error("Lỗi khi tải luồng video từ /video_feed");
            connectionBanner.classList.remove('connected');
            connectionBanner.classList.add('disconnected');
            connectionText.innerHTML = '<i class="fas fa-times-circle"></i> Lỗi khi tải luồng video';
            statusMessage.style.display = 'flex';
        });
    }

    // Luôn luôn hiển thị giao diện và cố gắng tải video
    forceShowConnectedUI();
    videoFeed.src = "/video_feed"; // Trực tiếp yêu cầu tải video
    
    // Vẫn kiểm tra kết nối để lấy dữ liệu điểm bắn, nhưng không thay đổi UI chính
    setInterval(() => {
        fetch('/data_feed')
            .then(response => response.ok ? response.json() : {})
            .then(data => {
                if (data && Object.keys(data).length > 0) {
                    document.getElementById('shot-time').innerText = data.time;
                    document.getElementById('target').innerText = data.target;
                    document.getElementById('shot-score').innerText = data.score;
                    const targetImage = document.getElementById('target-image');
                    if (data.image_data) {
                        targetImage.src = `data:image/jpeg;base64,${data.image_data}`;
                    }
                }
            }).catch(error => console.error('Lỗi khi lấy dữ liệu đã xử lý:', error));
    }, 3000);

    // === KẾT THÚC THAY ĐỔI ===
});