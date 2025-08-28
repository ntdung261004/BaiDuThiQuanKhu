document.addEventListener('DOMContentLoaded', function() {
    // --- KHAI BÁO BIẾN ---
    const createSessionForm = document.getElementById('create-session-form');
    const sessionNameInput = document.getElementById('session-name');
    const exerciseTypeSelect = document.getElementById('exercise-type');
    const sessionsList = document.getElementById('sessions-list');
    const saveSessionNameBtn = document.getElementById('save-session-name-btn');
    const createSessionModalEl = document.getElementById('createSessionModal');
    const soldierChecklist = document.getElementById('soldier-checklist');

    // --- CÁC HÀM TẢI DỮ LIỆU ---

    async function loadExercises() {
        try {
            const response = await fetch('/api/exercises');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const exercises = await response.json();
            
            exerciseTypeSelect.innerHTML = '<option value="" disabled selected>Chọn một bài tập</option>';
            if (exercises.length > 0) {
                exercises.forEach(exercise => {
                    const option = document.createElement('option');
                    option.value = exercise.id;
                    option.textContent = exercise.exercise_name;
                    exerciseTypeSelect.appendChild(option);
                });
            } else {
                exerciseTypeSelect.innerHTML = '<option disabled>Không có bài tập nào</option>';
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách bài tập:', error);
            exerciseTypeSelect.innerHTML = '<option disabled>Không thể tải bài tập</option>';
        }
    }

    // <<< THÊM MỚI: Hàm tải danh sách chiến sĩ vào modal >>>
    async function loadSoldiersIntoModal() {
        if (!soldierChecklist) return;
        soldierChecklist.innerHTML = '<p class="text-muted text-center">Đang tải danh sách...</p>';
        try {
            const response = await fetch('/api/soldiers'); // API này đã có sẵn
            if (!response.ok) throw new Error('Network response was not ok');
            const soldiers = await response.json();
            
            soldierChecklist.innerHTML = ''; // Xóa thông báo "Đang tải"
            if (soldiers.length > 0) {
                soldiers.forEach(soldier => {
                    const div = document.createElement('div');
                    div.classList.add('form-check');
                    div.innerHTML = `
                        <input class="form-check-input" type="checkbox" value="${soldier.id}" id="soldier-${soldier.id}">
                        <label class="form-check-label" for="soldier-${soldier.id}">
                            ${soldier.rank} ${soldier.name}
                        </label>
                    `;
                    soldierChecklist.appendChild(div);
                });
            } else {
                soldierChecklist.innerHTML = '<p class="text-muted text-center">Chưa có chiến sĩ nào được thêm vào hệ thống.</p>';
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách chiến sĩ:', error);
            soldierChecklist.innerHTML = '<p class="text-danger text-center">Không thể tải danh sách chiến sĩ.</p>';
        }
    }

    async function loadSessions() {
        try {
            const response = await fetch('/api/training_sessions');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const sessions = await response.json();
            sessionsList.innerHTML = '';

            if (sessions.length > 0) {
                sessions.forEach(session => {
                    let topBorderColor, statusText, actionMenuItemHtml, statusBgColor;

                    switch (session.status) {
                        case 'IN_PROGRESS':
                            topBorderColor = 'var(--bs-success)';
                            statusText = 'Đang huấn luyện';
                            statusBgColor = 'bg-success-subtle text-success-emphasis';
                            actionMenuItemHtml = `<li><a class="dropdown-item" href="/session/${session.id}"><i class="fas fa-arrow-right fa-fw me-2"></i> Tiếp tục</a></li>`;
                            break;
                        case 'COMPLETED':
                            topBorderColor = 'var(--bs-primary)';
                            statusText = 'Đã huấn luyện';
                            statusBgColor = 'bg-primary-subtle text-primary-emphasis';
                            actionMenuItemHtml = `<li><a class="dropdown-item" href="/report/session/${session.id}"><i class="fas fa-chart-bar fa-fw me-2"></i> Xem báo cáo</a></li>`;
                            break;
                        case 'NOT_STARTED':
                        default:
                            topBorderColor = 'var(--bs-danger)';
                            statusText = 'Chưa huấn luyện';
                            statusBgColor = 'bg-danger-subtle text-danger-emphasis';
                            actionMenuItemHtml = `<li><a class="dropdown-item" href="/session/${session.id}"><i class="fas fa-play fa-fw me-2"></i> Bắt đầu</a></li>`;
                            break;
                    }

                    const cardHtml = `
                        <div class="col">
                            <div class="card h-100 shadow-sm card-session" style="border-top: 14px solid ${topBorderColor};">
                                
                                <div class="card-header ${statusBgColor} py-2 text-center small fw-bold">
                                    ${statusText}
                                </div>

                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div class="flex-grow-1">
                                            <h5 class="card-title mb-1">${session.session_name || `Phiên Tập #${session.id}`}</h5>
                                            <hr class="card-divider my-2">
                                            <p class="card-text text-muted small mb-0">
                                                Bài tập: <strong>${session.exercise_name}</strong>
                                            </p>
                                        </div>
                                        <div class="dropdown" style="position: relative; z-index: 2;">
                                            <button class="btn btn-sm btn-light py-0 px-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="fas fa-ellipsis-v text-muted"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                ${actionMenuItemHtml}
                                                <li><a class="dropdown-item edit-session-btn" href="#" data-session-id="${session.id}" data-session-name="${session.session_name || `Phiên Tập #${session.id}`}"><i class="fas fa-edit fa-fw me-2"></i> Sửa tên</a></li>
                                                <li><hr class="dropdown-divider"></li>
                                                <li><a class="dropdown-item text-danger delete-session-btn" href="#" data-session-id="${session.id}"><i class="fas fa-trash-alt fa-fw me-2"></i> Xóa phiên</a></li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    sessionsList.insertAdjacentHTML('beforeend', cardHtml);
                });
            } else {
                sessionsList.innerHTML = `
                    <div class="col-12 text-center mt-5">
                        <i class="fas fa-info-circle fa-4x text-muted mb-3"></i>
                        <h4>Chưa có phiên tập nào được tạo.</h4>
                        <p class="text-muted">Bấm vào "Tạo Phiên Mới" để bắt đầu.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách phiên tập:', error);
            sessionsList.innerHTML = `
                <div class="col-12 text-center mt-5">
                    <i class="fas fa-exclamation-triangle fa-4x text-danger mb-3"></i>
                    <h4>Không thể tải dữ liệu.</h4>
                    <p class="text-muted">Vui lòng kiểm tra kết nối với server.</p>
                </div>
            `;
        }
    }

    // --- CÁC HÀM XỬ LÝ SỰ KIỆN ---

    saveSessionNameBtn.addEventListener('click', async function() {
        const sessionId = document.getElementById('edit-session-id').value;
        const newSessionName = document.getElementById('edit-session-name').value;
        if (!newSessionName) {
            alert('Tên phiên không được để trống.');
            return;
        }
        try {
            const response = await fetch(`/api/training_sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_name: newSessionName })
            });
            if (response.ok) {
                const editModal = bootstrap.Modal.getInstance(document.getElementById('editSessionModal'));
                editModal.hide();
                loadSessions();
                alert('Cập nhật thành công!');
            } else {
                alert('Có lỗi xảy ra khi cập nhật.');
            }
        } catch (error) {
            console.error('Lỗi khi cập nhật:', error);
            alert('Lỗi mạng, không thể cập nhật.');
        }
    });

    sessionsList.addEventListener('click', async function(e) {
        if (e.target.closest('.delete-session-btn')) {
            e.preventDefault();
            const button = e.target.closest('.delete-session-btn');
            const sessionId = button.dataset.sessionId;
            if (confirm(`Bạn có chắc chắn muốn xóa Phiên Tập #${sessionId} không?`)) {
                try {
                    const response = await fetch(`/api/training_sessions/${sessionId}`, { method: 'DELETE' });
                    if (response.ok) {
                        loadSessions(); 
                    } else {
                        alert('Có lỗi xảy ra khi xóa phiên tập.');
                    }
                } catch (error) {
                    console.error('Lỗi khi xóa phiên tập:', error);
                    alert('Lỗi mạng, không thể xóa.');
                }
            }
        }
        
        if (e.target.closest('.edit-session-btn')) {
            e.preventDefault();
            const button = e.target.closest('.edit-session-btn');
            const sessionId = button.dataset.sessionId;
            const sessionName = button.dataset.sessionName;
            const editModal = new bootstrap.Modal(document.getElementById('editSessionModal'));
            document.getElementById('edit-session-id').value = sessionId;
            document.getElementById('edit-session-name').value = sessionName;
            document.getElementById('editSessionModalLabel').textContent = `Sửa Tên cho Phiên Tập #${sessionId}`;
            editModal.show();
        }
    });

    // <<< SỬA ĐỔI: Cập nhật hàm xử lý submit form >>>
    createSessionForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const sessionName = sessionNameInput.value;
        const exerciseId = exerciseTypeSelect.value;
        
        // Lấy danh sách ID của các chiến sĩ được chọn
        const selectedSoldiers = Array.from(soldierChecklist.querySelectorAll('input[type="checkbox"]:checked'))
                                      .map(checkbox => checkbox.value);

        if (!exerciseId) {
            alert('Vui lòng chọn một loại bài tập.');
            return;
        }
        if (selectedSoldiers.length === 0) {
            alert('Vui lòng chọn ít nhất một chiến sĩ.');
            return;
        }

        try {
            const response = await fetch('/api/training_sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_name: sessionName,
                    exercise_id: exerciseId,
                    soldier_ids: selectedSoldiers // Gửi danh sách ID
                })
            });
            
            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('createSessionModal'));
                modal.hide();
                loadSessions();
            } else {
                alert('Có lỗi xảy ra khi tạo phiên tập.');
            }
        } catch (error) {
            console.error('Lỗi khi tạo phiên tập:', error);
            alert('Lỗi mạng. Vui lòng thử lại.');
        }
    });

    // --- GÁN SỰ KIỆN KHI MODAL MỞ RA ---
    if (createSessionModalEl) {
        createSessionModalEl.addEventListener('show.bs.modal', function() {
            // Khi modal sắp được hiển thị, tải danh sách chiến sĩ
            loadSoldiersIntoModal();
            // Reset form để xóa các giá trị cũ
            createSessionForm.reset();
        });
    }

    // --- KHỞI CHẠY LẦN ĐẦU ---
    loadExercises();
    loadSessions();
});