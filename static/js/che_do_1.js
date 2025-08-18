// static/js/che_do_1.js

document.addEventListener('DOMContentLoaded', async function() {
    // --- Các phần tử HTML ---
    const latestImage = document.getElementById('latest-image');
    const imagePlaceholder = document.getElementById('image-placeholder');
    const imageContainer = document.getElementById('image-frame-container');
    const connectionBanner = document.getElementById('connection-status-banner');
    const soldierInfoEl = document.getElementById('soldier-info');

    const videoFeed = document.getElementById('video-feed');
    const statusContainer = document.getElementById('status-container');
    const noConnectionMessage = document.getElementById('no-connection-message');
    const startButtonContainer = document.getElementById('start-button-container');
    const startStreamBtn = document.getElementById('start-stream-btn');
    
    let isConnected = false; 

    // Hàm cập nhật trạng thái kết nối
    function checkConnectionStatus() {
        fetch('/connection-status')
            .then(response => response.json())
            .then(data => {
                const newStatus = data.status === 'connected';

                if (newStatus !== isConnected) {
                    isConnected = newStatus;
                    
                    if (isConnected) {
                        statusContainer.style.display = 'flex';
                        noConnectionMessage.classList.add('d-none');
                        startButtonContainer.classList.remove('d-none');
                        videoFeed.style.display = 'none';
                        
                        imageContainer.style.display = 'flex';
                        imagePlaceholder.textContent = 'Đang chờ kết quả...';
                        
                        connectionBanner.innerHTML = '<i class="fas fa-check-circle me-1"></i> Thiết bị đã kết nối';
                        connectionBanner.className = 'fw-bold text-success';
                    } else {
                        statusContainer.style.display = 'flex';
                        noConnectionMessage.classList.remove('d-none');
                        startButtonContainer.classList.add('d-none');
                        videoFeed.style.display = 'none';
                        videoFeed.src = "";

                        imageContainer.style.display = 'flex';
                        latestImage.classList.add('d-none');
                        imagePlaceholder.classList.remove('d-none');
                        imagePlaceholder.textContent = 'Mất kết nối với thiết bị...';
                        
                        connectionBanner.innerHTML = '<i class="fas fa-times-circle me-1"></i> Mất kết nối với thiết bị';
                        connectionBanner.className = 'fw-bold text-danger';
                    }
                }
            })
            .catch(error => {
                console.error("Lỗi khi gọi /connection-status:", error);
                if (isConnected) {
                    isConnected = false;
                    statusContainer.style.display = 'flex';
                    noConnectionMessage.classList.remove('d-none');
                    startButtonContainer.classList.add('d-none');
                    videoFeed.style.display = 'none';
                    videoFeed.src = "";

                    imageContainer.style.display = 'flex';
                    latestImage.classList.add('d-none');
                    imagePlaceholder.classList.remove('d-none');
                    imagePlaceholder.textContent = 'Mất kết nối với thiết bị...';
                    
                    connectionBanner.innerHTML = '<i class="fas fa-times-circle me-1"></i> Mất kết nối với thiết bị';
                    connectionBanner.className = 'fw-bold text-danger';
                }
            });
    }

    // Hàm cập nhật kết quả bắn và ảnh (giữ nguyên)
    function updateLatestResult() {
        fetch('/data_feed')
            .then(response => response.json())
            .then(data => {
                if (data && Object.keys(data).length > 0) {
                    if (data.image_data) {
                        latestImage.src = `data:image/jpeg;base64,${data.image_data}`;
                        latestImage.classList.remove('d-none');
                        imagePlaceholder.classList.add('d-none');
                    } else {
                        latestImage.classList.add('d-none');
                        imagePlaceholder.classList.remove('d-none');
                    }
                }
            })
            .catch(error => {
                console.error("Lỗi khi cập nhật dữ liệu:", error);
            });
    }

    const selectSoldierModal = new bootstrap.Modal(document.getElementById('selectSoldierModal'));

    // Sửa lại logic click của nút "Bắt đầu"
    startStreamBtn.addEventListener('click', function() {
        const selectedSoldierId = sessionStorage.getItem('soldierId');
        
        if (isConnected) {
            if (selectedSoldierId) {
                // Nếu có kết nối và đã chọn chiến sĩ, bắt đầu video
                statusContainer.style.display = 'none';
                videoFeed.style.display = 'block';
                videoFeed.src = "/video_feed";
            } else {
                // Nếu có kết nối nhưng chưa chọn chiến sĩ, hiển thị modal
                selectSoldierModal.show();
            }
        }
    });

    // --- Các hàm khác (hiển thị chiến sĩ, dropdown) ---
    async function displaySoldierInfo(soldierId) {
        if (soldierId) {
            try {
                const response = await fetch(`/api/soldiers/${soldierId}`);
                const data = await response.json();
                if (response.ok) {
                    soldierInfoEl.textContent = `Chiến sĩ kiểm tra: ${data.name}`;
                    soldierInfoEl.classList.remove('d-none');
                } else {
                    console.error('Lỗi khi lấy thông tin chiến sĩ:', data.error);
                }
            } catch (error) {
                console.error('Lỗi mạng khi lấy thông tin chiến sĩ:', error);
            }
        } else {
            soldierInfoEl.textContent = '';
            soldierInfoEl.classList.add('d-none');
        }
    }
    
    async function loadSoldierDropdown() {
        try {
            const dropdownMenu = document.getElementById('soldier-list-dropdown');
            dropdownMenu.innerHTML = '';

            const response = await fetch('/api/soldiers');
            const soldiers = await response.json();

            if (soldiers.length > 0) {
                soldiers.forEach(soldier => {
                    const listItem = document.createElement('li');
                    const link = document.createElement('a');
                    link.className = 'dropdown-item';
                    link.href = `#`;
                    link.textContent = `${soldier.rank} ${soldier.name}`;
                    link.setAttribute('data-soldier-id', soldier.id);
                    listItem.appendChild(link);
                    dropdownMenu.appendChild(listItem);
                });
            } else {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<span class="dropdown-item text-muted">Không có chiến sĩ nào</span>`;
                dropdownMenu.appendChild(listItem);
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách chiến sĩ:', error);
        }
    }

    document.getElementById('soldier-list-dropdown').addEventListener('click', function(e) {
        e.preventDefault();
        const selectedId = e.target.getAttribute('data-soldier-id');
        if (selectedId) {
            sessionStorage.setItem('soldierId', selectedId);
            displaySoldierInfo(selectedId);
        }
    });

    // --- Khởi chạy ban đầu ---
    const storedSoldierId = sessionStorage.getItem('soldierId');
    if (storedSoldierId) {
        displaySoldierInfo(storedSoldierId);
    }
    
    loadSoldierDropdown();
    checkConnectionStatus();
    updateLatestResult();
    
    setInterval(checkConnectionStatus, 3000);
    setInterval(updateLatestResult, 1000);
});