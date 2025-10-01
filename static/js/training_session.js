document.addEventListener('DOMContentLoaded', function() {
    // --- KHAI BÁO BIẾN ---
    const createSessionForm = document.getElementById('create-session-form');
    const sessionNameInput = document.getElementById('session-name');
    const exerciseTypeSelect = document.getElementById('exercise-type');
    const sessionsList = document.getElementById('sessions-list');
    const saveSessionNameBtn = document.getElementById('save-session-name-btn');
    const createSessionModalEl = document.getElementById('createSessionModal');
    const soldierChecklist = document.getElementById('soldier-checklist');
    const filterStatusSelect = document.getElementById('filter-status');
    const filterExerciseSelect = document.getElementById('filter-exercise');
    const sortBySelect = document.getElementById('sort-by-select');
    const loadingSpinner = document.getElementById('loading-spinner');

    // --- CÁC HÀM TẢI DỮ LIỆU ---

    async function loadExercises() {
        try {
            const response = await fetch('/api/exercises');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const exercises = await response.json();
            
            exerciseTypeSelect.innerHTML = '<option value="" disabled selected>Chọn một bài tập</option>';
            filterExerciseSelect.innerHTML = '<option value="">Tất cả</option>';
            
            if (exercises.length > 0) {
                exercises.forEach(exercise => {
                    const optionModal = document.createElement('option');
                    optionModal.value = exercise.id;
                    optionModal.textContent = exercise.exercise_name;
                    exerciseTypeSelect.appendChild(optionModal);

                    const optionFilter = document.createElement('option');
                    optionFilter.value = exercise.id;
                    optionFilter.textContent = exercise.exercise_name;
                    filterExerciseSelect.appendChild(optionFilter);
                });
            } else {
                exerciseTypeSelect.innerHTML = '<option disabled>Không có bài tập nào</option>';
                filterExerciseSelect.innerHTML = '<option disabled>Không có</option>';
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách bài tập:', error);
            exerciseTypeSelect.innerHTML = '<option disabled>Không thể tải bài tập</option>';
            filterExerciseSelect.innerHTML = '<option disabled>Lỗi tải</option>';
        }
    }

    async function updateTotalCountBadge() {
        try {
            const response = await fetch('/api/sessions/total_count');
            const data = await response.json();
            const totalCountBadge = document.getElementById('session-total-count');
            if (totalCountBadge) {
                totalCountBadge.textContent = data.total_count;
            }
        } catch (error) {
            console.error('Không thể tải tổng số phiên:', error);
            const totalCountBadge = document.getElementById('session-total-count');
            if (totalCountBadge) {
                totalCountBadge.textContent = '?';
            }
        }
    }

    async function loadSoldiersIntoModal() {
        if (!soldierChecklist) return;

        const selectAllCheckbox = document.getElementById('select-all-soldiers');
        
        soldierChecklist.innerHTML = '<p class="text-muted text-center">Đang tải danh sách...</p>';
        if(selectAllCheckbox) selectAllCheckbox.style.display = 'none';

        try {
            const response = await fetch('/api/soldiers/all');
            if (!response.ok) throw new Error('Network response was not ok');
            const soldiers = await response.json();
            
            soldierChecklist.innerHTML = '';
            if (soldiers.length > 0) {
                if(selectAllCheckbox) selectAllCheckbox.style.display = 'block';

                soldiers.forEach(soldier => {
                    const div = document.createElement('div');
                    div.classList.add('form-check');
                    div.innerHTML = `
                        <input class="form-check-input soldier-checkbox" type="checkbox" value="${soldier.id}" id="soldier-${soldier.id}">
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

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                const isChecked = this.checked;
                const checkboxes = soldierChecklist.querySelectorAll('.soldier-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                });
            });

            soldierChecklist.addEventListener('change', function(event) {
                if (event.target.classList.contains('soldier-checkbox')) {
                    const allCheckboxes = soldierChecklist.querySelectorAll('.soldier-checkbox');
                    const allChecked = Array.from(allCheckboxes).every(checkbox => checkbox.checked);
                    selectAllCheckbox.checked = allChecked;
                }
            });
        }
    }

    async function loadSessions() {
        sessionsList.innerHTML = '';
        loadingSpinner.style.display = 'block';
        updateTotalCountBadge();
        try {
            const sortByValue = sortBySelect.value;
            const lastUnderscoreIndex = sortByValue.lastIndexOf('_');
            const sortBy = sortByValue.substring(0, lastUnderscoreIndex);
            const sortOrder = sortByValue.substring(lastUnderscoreIndex + 1);

            const params = new URLSearchParams({
                status_filter: filterStatusSelect.value,
                exercise_filter: filterExerciseSelect.value,
                sort_by: sortBy,
                sort_order: sortOrder
            });

            const response = await fetch(`/api/training_sessions?${params.toString()}`);
            if (!response.ok) throw new Error(`Lỗi HTTP: ${response.status}`);
            const sessions = await response.json();

            loadingSpinner.style.display = 'none';

            if (sessions.length === 0) {
                sessionsList.innerHTML = `
                    <div class="col-12 text-center mt-5" style="min-height: 50vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                        <i class="fas fa-folder-open fa-4x text-muted mb-3"></i>
                        <h4>Không có phiên tập nào phù hợp</h4>
                        <p class="text-muted">Hãy thử thay đổi bộ lọc hoặc tạo một phiên tập mới.</p>
                        <button class="btn btn-primary mt-3" data-bs-toggle="modal" data-bs-target="#createSessionModal">
                            <i class="fas fa-plus me-2"></i> Tạo Phiên Mới
                        </button>
                    </div>
                `;
            } else {
                sessions.forEach(session => {
                    let topBorderColor, statusText, actionMenuItemHtml, statusBgColor;
                    
                    switch (session.status) {
                        case 'IN_PROGRESS':
                            topBorderColor = 'var(--bs-success)';
                            statusText = 'Đang huấn luyện';
                            statusBgColor = 'bg-success-subtle text-success-emphasis';
                            actionMenuItemHtml = `<li><a class="dropdown-item start-session-link" href="#" data-session-id="${session.id}" data-exercise-name="${session.exercise_name}"><i class="fas fa-arrow-right fa-fw me-2"></i> Tiếp tục</a></li>`;
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
                            actionMenuItemHtml = `<li><a class="dropdown-item start-session-link" href="#" data-session-id="${session.id}" data-exercise-name="${session.exercise_name}"><i class="fas fa-play fa-fw me-2"></i> Bắt đầu</a></li>`;
                            break;
                    }
                    
                    const date_created = new Date(session.date_created);
                    const formattedDate = `${date_created.getDate().toString().padStart(2, '0')}/${(date_created.getMonth() + 1).toString().padStart(2, '0')}/${date_created.getFullYear()}`;

                    const cardHtml = `
                        <div class="col">
                            <div class="card h-100 shadow-sm card-session" style="border-top: 14px solid ${topBorderColor};">
                                <div class="card-header ${statusBgColor} py-2 text-center small fw-bold">
                                    ${statusText}
                                </div>
                                <div class="card-body" p-3>
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div class="flex-grow-1">
                                            <h5 class="card-title mb-1">${session.session_name || `Phiên Tập #${session.id}`}</h5>
                                            <hr class="card-divider my-2">
                                            <p class="card-text text-muted small mb-0">
                                                Bài tập: <strong>${session.exercise_name}</strong>
                                            </p>
                                            <div class="d-flex justify-content-between small text-muted mb-3">
                                                <span title="Ngày tạo"><i class="far fa-calendar-alt me-1"></i> ${formattedDate}</span>
                                                <span title="Số chiến sĩ đã tập"><i class="fas fa-check-circle me-1"></i> Đã tập: <strong>${session.completed_soldier_count}/${session.total_soldier_count}</strong></span>
                                            </div>
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
            }
        } catch (error) {
            console.error('Lỗi khi tải phiên tập:', error);
            loadingSpinner.style.display = 'none';
            sessionsList.innerHTML = '<p class="col-12 text-center text-danger mt-5">Không thể tải dữ liệu. Vui lòng thử lại.</p>';
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

    // ===================================================================
    // === SỬA LỖI TẠI ĐÂY: Thêm logic gửi lệnh cho Pi khi bắt đầu "Bài 2" ===
    // ===================================================================
    sessionsList.addEventListener('click', async function(e) {
        e.preventDefault();

        const startButton = e.target.closest('.start-session-link');
        const deleteButton = e.target.closest('.delete-session-btn');
        const editButton = e.target.closest('.edit-session-btn');

        if (startButton) {
            const sessionId = startButton.dataset.sessionId;
            const exerciseName = startButton.dataset.exerciseName;
            
            try {
                // Bước 1: Gọi API để đổi trạng thái phiên tập
                const startResponse = await fetch(`/api/training_sessions/${sessionId}/start`, {
                    method: 'POST'
                });
                if (!startResponse.ok) throw new Error('Không thể bắt đầu phiên tập từ server.');

                // Bước 2: KIỂM TRA và GỬI LỆNH cho Pi nếu là Bài 2
                const isBai2 = exerciseName && exerciseName.toLowerCase().includes('bài 2');
                const fireMode = isBai2 ? 'continuous' : 'single'; // Xác định chế độ

                const modeResponse = await fetch(`/api/pi/set_fire_mode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: fireMode })
                });
                if (!modeResponse.ok) throw new Error('Không thể gửi lệnh chế độ bắn cho thiết bị.');
                
                // Bước 3: Chuyển hướng đến trang tập luyện
                window.location.href = `/session/${sessionId}`;
                
            } catch (error) {
                console.error("Lỗi khi bắt đầu phiên:", error);
                showToast(error.message || 'Có lỗi xảy ra, vui lòng thử lại.', 'error');
            }
        }
        
        else if (deleteButton) {
            const sessionId = deleteButton.dataset.sessionId;
            if (confirm(`Bạn có chắc chắn muốn xóa Phiên Tập #${sessionId} không?`)) {
                try {
                    const response = await fetch(`/api/training_sessions/${sessionId}`, { method: 'DELETE' });
                    if (response.ok) {
                        loadSessions(); 
                        showToast('Đã xóa phiên tập thành công.', 'success');
                    } else {
                        showToast('Có lỗi xảy ra khi xóa phiên tập.', 'error');
                    }
                } catch (error) {
                    console.error('Lỗi khi xóa phiên tập:', error);
                    showToast('Lỗi mạng, không thể xóa.', 'error');
                }
            }
        }
        
        else if (editButton) {
            const sessionId = editButton.dataset.sessionId;
            const sessionName = editButton.dataset.sessionName;
            const editModal = new bootstrap.Modal(document.getElementById('editSessionModal'));
            document.getElementById('edit-session-id').value = sessionId;
            document.getElementById('edit-session-name').value = sessionName;
            document.getElementById('editSessionModalLabel').textContent = `Sửa Tên cho Phiên Tập #${sessionId}`;
            editModal.show();
        }
    });

    createSessionForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const sessionName = sessionNameInput.value;
        const exerciseId = exerciseTypeSelect.value;
        const selectedSoldiers = Array.from(soldierChecklist.querySelectorAll('input[type="checkbox"]:checked')).map(checkbox => checkbox.value);

        if (!exerciseId) {
            showToast('Vui lòng chọn một loại bài tập.', 'error');
            return;
        }
        if (selectedSoldiers.length === 0) {
            showToast('Vui lòng chọn ít nhất một chiến sĩ.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/training_sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_name: sessionName,
                    exercise_id: exerciseId,
                    soldier_ids: selectedSoldiers
                })
            });
            
            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('createSessionModal'));
                modal.hide();
                loadSessions();
                showToast('Tạo phiên tập thành công!', 'success');
            } else {
                alert('Có lỗi xảy ra khi tạo phiên tập.');
            }
        } catch (error) {
            console.error('Lỗi khi tạo phiên tập:', error);
            alert('Lỗi mạng. Vui lòng thử lại.');
        }
    });

    if (createSessionModalEl) {
        createSessionModalEl.addEventListener('show.bs.modal', function() {
            loadSoldiersIntoModal();
            createSessionForm.reset();
        });
    }

    filterStatusSelect.addEventListener('change', loadSessions);
    filterExerciseSelect.addEventListener('change', loadSessions);
    sortBySelect.addEventListener('change', loadSessions);

    // --- KHỞI CHẠY LẦN ĐẦU ---
    loadExercises();
    loadSessions();
});