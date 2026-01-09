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

// **BIẾN MỚI CHO ẢNH KẾT QUẢ**
    const targetImage = document.getElementById('target-image');
    const targetImagePlaceholder = document.getElementById('target-image-placeholder');

    let isUiConnected = false;
    let isCalibrating = false;
    let reconnectInterval = null;
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

    // --- CƠ CHẾ GIÁM SÁT VÀ XÁC THỰC VIDEO ---
    const freezeDetector = {
        canvas: document.createElement('canvas'),
        timeout: null,
        lastImageDataUrl: '',
        consecutiveMatches: 0,
        start: function() {
            this.stop();
            console.log("Bắt đầu giám sát và xác thực video.");
            this.timeout = setInterval(this.check.bind(this), 2000); // Kiểm tra mỗi 2 giây
        },
        stop: function() {
            clearInterval(this.timeout);
            this.timeout = null;
            this.consecutiveMatches = 0;
            this.lastImageDataUrl = '';
            console.log("Đã dừng giám sát video.");
        },
        check: function() {
            if (videoFeed.naturalWidth === 0) return;
            try {
                this.canvas.width = videoFeed.naturalWidth;
                this.canvas.height = videoFeed.naturalHeight;
                const context = this.canvas.getContext('2d');
                context.drawImage(videoFeed, 0, 0, this.canvas.width, this.canvas.height);
                const currentData = this.canvas.toDataURL('image/jpeg', 0.5);

                if (this.lastImageDataUrl && this.lastImageDataUrl !== currentData) {
                    // PHÁT HIỆN KHUNG HÌNH MỚI -> KẾT NỐI THÀNH CÔNG
                    if (!isUiConnected) {
                        handleConnectionSuccess();
                    }
                    this.consecutiveMatches = 0;
                } else {
                    // KHUNG HÌNH CŨ HOẶC KHUNG HÌNH ĐẦU TIÊN
                    this.consecutiveMatches++;
                    if (this.consecutiveMatches >= 3) { // Cho 6 giây để xác thực, nếu vẫn treo -> Mất kết nối
                        if (isUiConnected) {
                             console.error("Phát hiện video bị treo!");
                             handleDisconnection();
                        }
                    }
                }
                this.lastImageDataUrl = currentData;
            } catch (error) {
                if (isUiConnected) handleDisconnection();
            }
        }
    };

    // --- CÁC HÀM QUẢN LÝ TRẠNG THÁI ---
    function handleConnectionSuccess() {
        if (isUiConnected) return;
        console.log("XÁC THỰC THÀNH CÔNG! Giao diện chuyển sang KẾT NỐI.");
        isUiConnected = true;
        clearInterval(reconnectInterval);
        reconnectInterval = null;

        videoFeed.style.opacity = '1'; // **Hiển thị video**
        statusMessage.style.display = 'none';
        controlsContainer.style.display = 'block';
        infoPlaceholder.style.display = 'none';
        infoDisplay.style.display = 'block';
        connectionBanner.classList.remove('disconnected');
        connectionBanner.classList.add('connected');
        connectionText.innerHTML = '<i class="fas fa-check-circle"></i> Thiết bị đã kết nối';
        
        syncUiWithPiConfig();
        // Giám sát tiếp tục chạy để phát hiện treo trong tương lai
    }

    function handleDisconnection() {
        if (!isUiConnected && reconnectInterval) return;
        console.log("Giao diện chuyển sang MẤT KẾT NỐI, bắt đầu tự thăm dò.");
        isUiConnected = false;
        freezeDetector.stop();
        videoFeed.src = '';
        videoFeed.style.display = 'none';

        statusMessage.style.display = 'flex';
        controlsContainer.style.display = 'none';
        infoPlaceholder.style.display = 'block';
        infoDisplay.style.display = 'none';
        connectionBanner.classList.remove('connected');
        connectionBanner.classList.add('disconnected');
        connectionText.innerHTML = '<i class="fas fa-plug"></i> Mất kết nối, đang thử lại...';
        
        if (isCalibrating) toggleCalibrationMode();
        if (reconnectInterval) clearInterval(reconnectInterval);
        
        reconnectInterval = setInterval(() => {
            console.log("Đang thử kết nối lại...");
            videoFeed.src = `/video_feed?timestamp=${new Date().getTime()}`;
        }, 5000);
    }

    function handleConnectionAttempt() {
        console.log("Video đã tải, bắt đầu quá trình xác thực...");
        clearInterval(reconnectInterval);
        reconnectInterval = null;
        
        videoFeed.style.display = 'block';
        videoFeed.style.opacity = '0'; // **GIỮ ẨN VIDEO** trong lúc xác thực
        statusMessage.style.display = 'flex';
        
        connectionBanner.classList.remove('disconnected');
        connectionBanner.classList.add('connected'); // Chuyển sang màu xanh nhạt
        connectionText.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Đang xác thực luồng...';
        
        freezeDetector.start();

        setTimeout(() => {
            if (!isUiConnected) {
                console.log("Xác thực thất bại, quay lại trạng thái mất kết nối.");
                handleDisconnection();
            }
        }, 7000); // Tăng thời gian chờ xác thực
    }
    
    // --- GÁN SỰ KIỆN VÀ KHỞI ĐỘNG ---
    videoFeed.addEventListener('load', handleConnectionAttempt);
    videoFeed.addEventListener('error', () => {
        if (isUiConnected) {
            handleDisconnection();
        }
    });
    
    // ... các event listener khác không đổi ...
    videoFeed.addEventListener('click', handleVideoClick);
    videoFeed.addEventListener('mousemove', drawCrosshair);
    videoFeed.addEventListener('mouseleave', () => { if (isCalibrating) ctx.clearRect(0, 0, canvas.width, canvas.height); });
    zoomSlider.addEventListener('input', updateZoomValueDisplay);
    zoomApplyBtn.addEventListener('click', sendZoomCommand);
    calibrateBtn.addEventListener('click', toggleCalibrationMode);

    // --- KHỞI ĐỘNG HỆ THỐNG ---
    handleDisconnection();
    setTimeout(() => {
        console.log("Bắt đầu, thử tải video lần đầu tiên...");
        if (!isUiConnected) { // Chỉ thử nếu chưa kết nối
             videoFeed.src = `/video_feed?timestamp=${new Date().getTime()}`;
        }
    }, 1000);

    // --- CÁC HÀM TIỆN ÍCH (Không thay đổi) ---
    setInterval(() => {
        if (isUiConnected) {
            fetch('/data_feed').then(r => r.ok ? r.json() : {}).then(data => {
                if (data && Object.keys(data).length > 0) {
                    document.getElementById('shot-time').innerText = data.time || '--:--';
                    document.getElementById('target').innerText = data.target || '--';
                    document.getElementById('shot-score').innerText = data.score || '--';

                    // Logic mới để xử lý ảnh kết quả
                    const placeholder_1x1_pixel = 'iVBORw0KGgoAAAANSUEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
                    if (data.image_data && data.image_data !== placeholder_1x1_pixel) {
                        targetImage.src = `data:image/jpeg;base64,${data.image_data}`;
                        targetImage.style.display = 'block';
                        targetImagePlaceholder.style.display = 'none';
                    } else {
                        targetImage.style.display = 'none';
                        targetImagePlaceholder.style.display = 'block';
                    }
                }
            }).catch(() => {});
        }
    }, 3000);
    async function syncUiWithPiConfig(){try{const r=await fetch('/get_current_config');const c=await r.json();if(c&&c.zoom){const z=parseFloat(c.zoom);if(zoomSlider)zoomSlider.value=z;if(zoomValueDisplay)updateZoomValueDisplay();}}catch(e){}}
    function updateZoomValueDisplay(){if(zoomSlider&&zoomValueDisplay){zoomValueDisplay.innerText=parseFloat(zoomSlider.value).toFixed(1)+'x';}}
    async function sendZoomCommand(){const z=zoomSlider.value;try{const r=await fetch('/set_zoom',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({zoom:parseFloat(z)})});if(!r.ok)throw new Error('!');await r.json();showToast(`Đã tinh chỉnh zoom: ${z}x`);}catch(e){showToast('Gửi lệnh zoom thất bại!','danger');}}
    function toggleCalibrationMode(){isCalibrating=!isCalibrating;if(isCalibrating){calibrateBtn.classList.replace('btn-warning','btn-danger');calibrateBtn.innerHTML='<i class="fas fa-times me-1"></i> Hủy';videoFeed.style.cursor='crosshair';helperText.style.display='block';canvas.width=videoFeed.clientWidth;canvas.height=videoFeed.clientHeight;}else{calibrateBtn.classList.replace('btn-danger','btn-warning');calibrateBtn.innerHTML='<i class="fas fa-crosshairs me-1"></i> Hiệu chỉnh tâm';videoFeed.style.cursor='default';helperText.style.display='none';ctx.clearRect(0,0,canvas.width,canvas.height);}}
    function getRenderedVideoSize(){const vA=STREAM_SIZE.width/STREAM_SIZE.height;const cW=videoFeed.clientWidth;const cH=videoFeed.clientHeight;const cA=cW/cH;let rW,rH,oX,oY;if(cA>vA){rH=cH;rW=rH*vA;oX=(cW-rW)/2;oY=0;}else{rW=cW;rH=rW/vA;oX=0;oY=(cH-rH)/2;}return{renderedWidth:rW,renderedHeight:rH,offsetX:oX,offsetY:oY};}
    function drawCrosshair(e){if(!isCalibrating)return;const{renderedWidth:rW,renderedHeight:rH,offsetX:oX,offsetY:oY}=getRenderedVideoSize();const rect=videoFeed.getBoundingClientRect();const mX=e.clientX-rect.left;const mY=e.clientY-rect.top;ctx.clearRect(0,0,canvas.width,canvas.height);if(mX>=oX&&mX<=oX+rW&&mY>=oY&&mY<=oY+rH){const rMX=mX-oX;const rMY=mY-oY;const sX=STREAM_SIZE.width/rW;const sY=STREAM_SIZE.height/rH;const rX=Math.round(rMX*sX);const rY=Math.round(rMY*sY);ctx.beginPath();ctx.moveTo(mX,oY);ctx.lineTo(mX,oY+rH);ctx.strokeStyle='rgba(255,0,0,0.7)';ctx.lineWidth=1;ctx.stroke();ctx.beginPath();ctx.moveTo(oX,mY);ctx.lineTo(oX+rW,mY);ctx.stroke();const cT=`X: ${rX}, Y: ${rY}`;ctx.fillStyle='white';ctx.font='14px Arial';ctx.shadowColor='black';ctx.shadowBlur=4;ctx.fillText(cT,mX+15,mY-15);ctx.shadowBlur=0;}}
    async function handleVideoClick(e){if(!isCalibrating)return;const{renderedWidth:rW,renderedHeight:rH,offsetX:oX,offsetY:oY}=getRenderedVideoSize();const rect=videoFeed.getBoundingClientRect();const mX=e.clientX-rect.left;const mY=e.clientY-rect.top;if(mX>=oX&&mX<=oX+rW&&mY>=oY&&mY<=oY+rH){const rMX=mX-oX;const rMY=mY-oY;const sX=STREAM_SIZE.width/rW;const sY=STREAM_SIZE.height/rH;const cX=Math.round(rMX*sX);const cY=Math.round(rMY*sY);try{const r=await fetch('/set_center',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({center:{x:cX,y:cY}})});if(!r.ok)throw new Error('!');await r.json();showToast('Đã hiệu chỉnh tâm ngắm mới');toggleCalibrationMode();}catch(e){showToast('Gửi tọa độ thất bại!','danger');}}}

    // === [DEV ONLY] LOGIC CHO NÚT MÔ PHỎNG KẾT NỐI ===
    const debugToggleBtn = document.getElementById('btn-debug-toggle');
    if (debugToggleBtn) {
        debugToggleBtn.addEventListener('click', function() {
            if (isUiConnected) {
                // Đang kết nối -> Giả lập mất kết nối
                console.log("[DEV] Force Disconnect");
                handleDisconnection();
            } else {
                // Đang mất kết nối -> Giả lập kết nối thành công
                console.log("[DEV] Force Connect");
                
                // 1. Dừng bộ đếm tự động kết nối lại
                if (reconnectInterval) {
                    clearInterval(reconnectInterval);
                    reconnectInterval = null;
                }
                
                // 2. Gọi hàm xử lý giao diện thành công
                handleConnectionSuccess();
                
                // 3. QUAN TRỌNG: Tắt bộ phát hiện đóng băng video
                // Nếu không tắt, script sẽ thấy video không chạy và tự ngắt kết nối lại ngay
                freezeDetector.stop(); 

                // 4. (Tùy chọn) Gán ảnh giả để giao diện không bị trống
                // Dùng ảnh camera.png có sẵn làm placeholder
                videoFeed.src = "/static/image/camera.png"; 
                // Reset style để ảnh hiện ra (vì handleConnectionSuccess có thể set opacity)
                videoFeed.style.opacity = '1';
                videoFeed.style.objectFit = 'contain';
            }
        });
    }
});