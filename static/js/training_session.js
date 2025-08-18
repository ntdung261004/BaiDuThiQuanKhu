// static/js/training_sessions.js

document.addEventListener('DOMContentLoaded', async function() {
    const createSessionForm = document.getElementById('create-session-form');
    const sessionNameInput = document.getElementById('session-name');
    const exerciseTypeSelect = document.getElementById('exercise-type');
    const sessionsList = document.getElementById('sessions-list');

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
                    const cardHtml = `
                        <div class="col">
                            <div class="card h-100 shadow-sm card-session" style="border-top: 14px solid var(--bs-danger);">
                                <span>Chưa huấn luyện</span>
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
                                                <li><a class="dropdown-item" href="#"><i class="fas fa-edit fa-fw me-2"></i> Sửa tên</a></li>
                                                <li><hr class="dropdown-divider"></li>
                                                <li><a class="dropdown-item text-danger" href="#"><i class="fas fa-trash-alt fa-fw me-2"></i> Xóa phiên</a></li>
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