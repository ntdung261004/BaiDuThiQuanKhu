<<<<<<< Updated upstream
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
=======
// ================== GLOBAL TOAST ==================
window.showToast = function (message = "Thao tác thành công!", type = "success") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    Object.assign(container.style, {
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 1080,
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      alignItems: "center",
      pointerEvents: "none"
    });
    document.body.appendChild(container);
  }

  let color = "#2f6d2f";
  if (type === "error") color = "#d9534f";
  else if (type === "warn") color = "#f0ad4e";
  else if (type === "info") color = "#5bc0de";

  const toast = document.createElement("div");
  Object.assign(toast.style, {
    background: "#fff",
    color: "#212529",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    padding: "12px 14px",
    minWidth: "280px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    opacity: "0",
    transform: "translateY(-20px)",
    transition: "opacity .35s ease, transform .35s ease"
  });

  const iconWrap = document.createElement("div");
  iconWrap.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="9" fill="${color}"></circle>
      <path d="M6 10.3l2.3 2.5L14 7.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  const msg = document.createElement("div");
  msg.textContent = message;
  Object.assign(msg.style, { flex: "1", fontSize: "15px" });

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  Object.assign(closeBtn.style, {
    background: "transparent",
    border: "none",
    fontSize: "18px",
    color: "#777",
    cursor: "pointer"
  });
  closeBtn.onclick = () => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px)";
    setTimeout(() => toast.remove(), 250);
  };

  toast.append(iconWrap, msg, closeBtn);
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px)";
    setTimeout(() => toast.remove(), 250);
  }, 3000);
};

// ================== CONFIRM MODAL ==================
if (!window.confirmCenter) {
  window.confirmCenter = function ({
    title = "Xác nhận",
    message = "Bạn có chắc chắn muốn thực hiện thao tác này không?",
    confirmText = "Đồng ý",
    cancelText = "Hủy",
    type = "danger"
  } = {}) {
    return new Promise((resolve) => {
      const modalEl = document.createElement("div");
      modalEl.className = "modal fade";
      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content shadow">
            <div class="modal-header">
              <h5 class="modal-title">${title}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p>${message}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-light" data-bs-dismiss="modal">${cancelText}</button>
              <button type="button" class="btn btn-${type}" id="confirmOk">${confirmText}</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modalEl);
      const bsModal = new bootstrap.Modal(modalEl, { backdrop: "static" });
      modalEl.querySelector("#confirmOk").onclick = () => {
        resolve(true);
        bsModal.hide();
      };
      modalEl.addEventListener("hidden.bs.modal", () => {
        resolve(false);
        modalEl.remove();
      });
      bsModal.show();
    });
  };
}

// ================== MAIN LOGIC ==================
document.addEventListener("DOMContentLoaded", function () {
  const sessionsList = document.getElementById("sessions-list");
  const loadingSpinner = document.getElementById("loading-spinner");
  const editSessionModal = document.getElementById("editSessionModal");
  const saveSessionBtn = document.getElementById("save-session-name-btn");

  // === Custom Select setup ===
  document.querySelectorAll('.custom-select').forEach(select => {
  const selected = select.querySelector('.selected');
  const options = select.querySelector('.options');

  // ✅ Gắn sự kiện cho toàn bộ khung, không chỉ phần chữ
  select.addEventListener('click', (e) => {
    // nếu click vào option thì không toggle dropdown
    if (e.target.closest('.options')) return;
    select.classList.toggle('active');
  });
>>>>>>> Stashed changes

  // chọn option
  options.querySelectorAll('div').forEach(opt => {
    opt.addEventListener('click', () => {
      selected.textContent = opt.textContent;
      selected.dataset.value = opt.dataset.value;
      select.classList.remove('active');
      loadSessions(); // gọi lại nếu cần
    });
  });
});

// click ra ngoài thì đóng tất cả
document.addEventListener('click', (e) => {
  document.querySelectorAll('.custom-select').forEach(select => {
    if (!select.contains(e.target)) {
      select.classList.remove('active');
    }
  });
});

<<<<<<< Updated upstream
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
=======


  // === Update total count ===
  async function updateTotalCountBadge() {
    try {
      const resp = await fetch('/api/sessions/total_count');
      const data = await resp.json();
      document.getElementById('session-total-count').textContent = data.total_count || '?';
    } catch {
      document.getElementById('session-total-count').textContent = '?';
    }
  }

  // === Load exercises ===
  async function loadExercises() {
    const exerciseSelect = document.querySelector("#filter-exercise .options");
    exerciseSelect.innerHTML = `<div data-value="">Tất cả</div>`;
    try {
      const resp = await fetch('/api/exercises');
      const data = await resp.json();
      data.forEach(ex => {
        const div = document.createElement("div");
        div.dataset.value = ex.id;
        div.textContent = ex.exercise_name;
        exerciseSelect.appendChild(div);
      });
    } catch (err) {
      console.error("Không thể tải bài tập:", err);
    }
  }

  // === Load sessions ===
  async function loadSessions() {
    sessionsList.innerHTML = "";
    loadingSpinner.style.display = "block";
>>>>>>> Stashed changes

    const statusVal = document.querySelector("#filter-status .selected")?.dataset.value || "";
    const exerciseVal = document.querySelector("#filter-exercise .selected")?.dataset.value || "";
    const sortVal = document.querySelector("#sort-by-select .selected")?.dataset.value || "date_created_desc";
    const [sort_by, sort_order] = sortVal.split("_");

    const params = new URLSearchParams({
      status_filter: statusVal,
      exercise_filter: exerciseVal,
      sort_by,
      sort_order
    });

    try {
      const response = await fetch(`/api/training_sessions?${params}`);
      const sessions = await response.json();
      loadingSpinner.style.display = "none";
      updateTotalCountBadge();

      if (!sessions.length) {
        sessionsList.innerHTML = `
          <div class="text-center w-100 py-5 text-muted">
            <i class="fas fa-folder-open fa-3x mb-2"></i>
            <p>Không có phiên tập nào phù hợp</p>
          </div>`;
        return;
      }

      sessions.forEach(s => {
        let topBorderColor, statusText, statusBgColor, actionMenuItemHtml;
        switch (s.status) {
          case "IN_PROGRESS":
            topBorderColor = "var(--bs-success)";
            statusText = "Đang huấn luyện";
            statusBgColor = "bg-success-subtle text-success-emphasis";
            actionMenuItemHtml = `<li><a class="dropdown-item" href="/session/${s.id}"><i class="fas fa-play fa-fw me-2"></i> Tiếp tục</a></li>`;
            break;
          case "COMPLETED":
            topBorderColor = "var(--bs-primary)";
            statusText = "Đã huấn luyện";
            statusBgColor = "bg-primary-subtle text-primary-emphasis";
            actionMenuItemHtml = `<li><a class="dropdown-item" href="/report/session/${s.id}"><i class="fas fa-chart-bar fa-fw me-2"></i> Xem báo cáo</a></li>`;
            break;
          default:
            topBorderColor = "var(--bs-danger)";
            statusText = "Chưa huấn luyện";
            statusBgColor = "bg-danger-subtle text-danger-emphasis";
            actionMenuItemHtml = `<li><a class="dropdown-item" href="/session/${s.id}"><i class="fas fa-arrow-right fa-fw me-2"></i> Bắt đầu</a></li>`;
        }

<<<<<<< Updated upstream
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
=======
        const formattedDate = new Date(s.date_created).toLocaleDateString();
        const cardHtml = `
          <div class="col">
            <div class="card h-100 shadow-sm card-session" style="border-top: 14px solid ${topBorderColor};">
              <div class="card-header ${statusBgColor} py-2 text-center small fw-bold">${statusText}</div>
              <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start">
                  <div class="flex-grow-1">
                    <h5 class="card-title mb-1">${s.session_name || `Phiên Tập #${s.id}`}</h5>
                    <hr class="card-divider my-2">
                    <p class="card-text text-muted small mb-0">Bài tập: <strong>${s.exercise_name}</strong></p>
                    
                  </div>
                  <div class="dropdown" style="position: relative; z-index: 2;">
                    <button class="btn btn-sm btn-light py-0 px-2" type="button" data-bs-toggle="dropdown">
                      <i class="fas fa-ellipsis-v text-muted"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                      ${actionMenuItemHtml}
                      <li><a class="dropdown-item edit-session-btn" href="#" data-session-id="${s.id}" data-session-name="${s.session_name || `Phiên Tập #${s.id}`}"><i class="fas fa-edit fa-fw me-2"></i> Sửa tên</a></li>
                      <li><hr class="dropdown-divider"></li>
                      <li><a class="dropdown-item text-danger delete-session-btn" href="#" data-session-id="${s.id}"><i class="fas fa-trash-alt fa-fw me-2"></i> Xóa phiên</a></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div class="d-flex justify-content-between small text-muted mt-3 px-3">
                      <span><i class="far fa-calendar-alt me-1"></i>${formattedDate}</span>
                      <span><i class="fas fa-check-circle me-1"></i>Đã tập: <strong>${s.completed_soldier_count}/${s.total_soldier_count}</strong></span>
                    </div>
            </div>
          </div>`;
        sessionsList.insertAdjacentHTML("beforeend", cardHtml);
      });
    } catch (err) {
      loadingSpinner.style.display = "none";
      sessionsList.innerHTML = `<p class="text-danger text-center mt-5">Lỗi tải dữ liệu.</p>`;
    }
  }

  // === Sửa tên / Xoá phiên ===
  sessionsList.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".edit-session-btn");
    const deleteBtn = e.target.closest(".delete-session-btn");

    // ---- Sửa tên ----
    if (editBtn) {
      e.preventDefault();
      const id = editBtn.dataset.sessionId;
      const name = editBtn.dataset.sessionName;

      document.getElementById("edit-session-id").value = id;
      document.getElementById("edit-session-name").value = name;
      document.getElementById("editSessionModalLabel").textContent = `Sửa Tên Phiên #${id}`;
      const modal = new bootstrap.Modal(editSessionModal);
      modal.show();
    }

    // ---- Xoá ----
    if (deleteBtn) {
      e.preventDefault();
      const id = deleteBtn.dataset.sessionId;
      const ok = await confirmCenter({
        title: "Xác nhận xoá",
        message: `Bạn có chắc chắn muốn xoá vĩnh viễn Phiên #${id}?`,
        confirmText: "Xoá ngay",
        type: "danger"
      });
      if (!ok) return;
>>>>>>> Stashed changes

      try {
        const res = await fetch(`/api/training_sessions/${id}`, { method: "DELETE" });
        if (res.ok) {
          showToast("Đã xoá phiên tập!", "success");
          loadSessions();
        } else showToast("Không thể xoá phiên.", "error");
      } catch {
        showToast("Lỗi mạng, vui lòng thử lại.", "error");
      }
    }
  });

  // ---- Lưu tên sửa ----
  saveSessionBtn?.addEventListener("click", async () => {
    const id = document.getElementById("edit-session-id").value;
    const newName = document.getElementById("edit-session-name").value.trim();
    if (!newName) return showToast("Tên không được trống!", "warn");

    try {
      const res = await fetch(`/api/training_sessions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_name: newName })
      });
      if (res.ok) {
        bootstrap.Modal.getInstance(editSessionModal)?.hide();
        showToast("Đã cập nhật tên!", "success");
        loadSessions();
      } else showToast("Không thể cập nhật.", "error");
    } catch {
      showToast("Lỗi mạng.", "error");
    }
  });

  // === Init ===
  loadExercises();
  loadSessions();
});
