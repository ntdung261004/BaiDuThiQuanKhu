// static/js/training_sessions.js

document.addEventListener('DOMContentLoaded', async function() {
    const createSessionForm = document.getElementById('create-session-form');
    const sessionNameInput = document.getElementById('session-name');
    const exerciseTypeSelect = document.getElementById('exercise-type');
    const sessionsList = document.getElementById('sessions-list');

    // Đặt đoạn mã này bên trong document.addEventListener('DOMContentLoaded', ...)
    const saveSessionNameBtn = document.getElementById('save-session-name-btn');
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
                headers: {
                    'Content-Type': 'application/json'
                },
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

    // Hàm tải danh sách bài tập vào dropdown
    async function loadExercises() {
        try {
            const response = await fetch('/api/exercises');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const exercises = await response.json();
            
            exerciseTypeSelect.innerHTML = '';
            
            const defaultOption = document.createElement('option');
            defaultOption.textContent = "Chọn một bài tập";
            defaultOption.value = "";
            defaultOption.disabled = true;
            defaultOption.selected = true;
            exerciseTypeSelect.appendChild(defaultOption);

            if (exercises.length > 0) {
                exercises.forEach(exercise => {
                    const option = document.createElement('option');
                    option.value = exercise.id;
                    option.textContent = exercise.exercise_name;
                    exerciseTypeSelect.appendChild(option);
                });
            } else {
                const noOptions = document.createElement('option');
                noOptions.textContent = "Không có bài tập nào";
                noOptions.disabled = true;
                exerciseTypeSelect.appendChild(noOptions);
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách bài tập:', error);
            const errorOption = document.createElement('option');
            errorOption.textContent = "Không thể tải bài tập";
            errorOption.disabled = true;
            exerciseTypeSelect.appendChild(errorOption);
        }
    }

    // Đặt đoạn mã này bên trong document.addEventListener('DOMContentLoaded', ...)

    sessionsList.addEventListener('click', async function(e) {
        // Xử lý sự kiện nút Xóa
        if (e.target.classList.contains('delete-session-btn') || e.target.closest('.delete-session-btn')) {
            e.preventDefault();
            
            const button = e.target.closest('.delete-session-btn');
            const sessionId = button.dataset.sessionId;
            
            if (confirm(`Bạn có chắc chắn muốn xóa Phiên Tập #${sessionId} không?`)) {
                try {
                    const response = await fetch(`/api/training_sessions/${sessionId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        // Tải lại danh sách phiên tập sau khi xóa thành công
                        loadSessions(); 
                        // Tùy chọn: Thêm thông báo toast ở đây
                        showToast("Đã xóa phiên tập thành công!");
                    } else {
                        alert('Có lỗi xảy ra khi xóa phiên tập.');
                    }
                } catch (error) {
                    console.error('Lỗi khi xóa phiên tập:', error);
                    alert('Lỗi mạng, không thể xóa.');
                }
            }
        }
        
        // Chúng ta sẽ thêm logic cho nút Sửa ở đây trong phần sau
        // Xử lý sự kiện nút Sửa
        if (e.target.classList.contains('edit-session-btn') || e.target.closest('.edit-session-btn')) {
            e.preventDefault();

            const button = e.target.closest('.edit-session-btn');
            const sessionId = button.dataset.sessionId;
            const sessionName = button.dataset.sessionName;

            // Lấy các phần tử trong modal
            const editModal = new bootstrap.Modal(document.getElementById('editSessionModal'));
            const modalSessionIdInput = document.getElementById('edit-session-id');
            const modalSessionNameInput = document.getElementById('edit-session-name');
            const modalTitle = document.getElementById('editSessionModalLabel');

            // Điền thông tin cũ vào modal
            modalTitle.textContent = `Sửa Tên cho Phiên Tập #${sessionId}`;
            modalSessionIdInput.value = sessionId;
            modalSessionNameInput.value = sessionName;

            // Hiển thị modal
            editModal.show();
        }
    });

    // Hàm hiển thị danh sách các phiên tập đã tạo
    async function loadSessions() {
        try {
            const response = await fetch('/api/training_sessions');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const sessions = await response.json();
            sessionsList.innerHTML = '';

            if (sessions.length > 0) {
                sessions.forEach(session => {
                    // Trong hàm loadSessions(), cập nhật cardHtml
                    const cardHtml = `
                        <div class="col">
                            <div class="card h-100 shadow-sm card-session" style="border-top: 14px solid var(--bs-danger);">
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
                                            <button class="btn btn-sm btn-light py-0 px-2" type="button" data-bs-toggle="dropdown" data-bs-container="body" aria-expanded="false">
                                                <i class="fas fa-ellipsis-v text-muted"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                <li><a class="dropdown-item" href="/che_do_1?session_id=${session.id}"><i class="fas fa-play fa-fw me-2"></i> Bắt đầu</a></li>
                                                <li><a class="dropdown-item edit-session-btn" href="#" data-session-id="${session.id}" data-session-name="${session.session_name || `Phiên Tập #${session.id}`}"><i class="fas fa-edit fa-fw me-2"></i> Sửa tên</a></li>
                                                <li><hr class="dropdown-divider"></li>
                                                <li><a class="dropdown-item text-danger delete-session-btn" href="#" data-session-id="${session.id}"><i class="fas fa-trash-alt fa-fw me-2"></i> Xóa phiên</a></li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <a href="/che_do_1?session_id=${session.id}" class="stretched-link"></a>
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

    // Xử lý khi form được submit để tạo phiên mới
    createSessionForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const sessionName = sessionNameInput.value;
        const exerciseId = exerciseTypeSelect.value;
        
        if (!exerciseId) {
            alert('Vui lòng chọn một loại bài tập.');
            return;
        }

        try {
            const response = await fetch('/api/training_sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_name: sessionName,
                    exercise_id: exerciseId
                })
            });
            const newSession = await response.json();
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

    loadExercises();
    loadSessions();
});