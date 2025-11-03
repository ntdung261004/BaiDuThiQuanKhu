// ==== GLOBAL TOAST (TOP-CENTER, SLIDE DOWN) ====

  // ==== GLOBAL TOAST (TOP-CENTER, SLIDE DOWN) ====
window.showToast = function (message = "Thao tác thành công!", type = "success") {
  // Tạo container nếu chưa có
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
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
  pointerEvents: "none" // để không chặn click dưới
});

    document.body.appendChild(container);
  }

  // Màu theo loại
  let color = "#2f6d2f"; // xanh lá bộ đội
  if (type === "error") color = "#d9534f";
  else if (type === "warn") color = "#f0ad4e";
  else if (type === "info") color = "#5bc0de";

  // Toast wrapper
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

  // Icon tròn xanh với dấu check (SVG inline)
  const iconWrap = document.createElement("div");
  iconWrap.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="${color}"></circle>
      <path d="M6 10.3l2.3 2.5L14 7.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  // Nội dung
  const msg = document.createElement("div");
  msg.textContent = message;
  Object.assign(msg.style, {
    flex: "1",
    fontSize: "15px"
  });

  // Nút đóng
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  Object.assign(closeBtn.style, {
    background: "transparent",
    border: "none",
    fontSize: "18px",
    color: "#777",
    cursor: "pointer",
    lineHeight: "1"
  });
  closeBtn.onmouseenter = () => (closeBtn.style.color = "#000");
  closeBtn.onmouseleave = () => (closeBtn.style.color = "#777");
  closeBtn.onclick = () => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px)";
    setTimeout(() => toast.remove(), 250);
  };

  toast.appendChild(iconWrap);
  toast.appendChild(msg);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  // Hiệu ứng xuất hiện
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  // Tự ẩn sau 3 giây
  setTimeout(() => {
    if (!toast.isConnected) return;
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px)";
    setTimeout(() => toast.remove(), 250);
  }, 3000);}


// ==== GLOBAL CENTER CONFIRM MODAL (Bootstrap) ====
if (!window.confirmCenter) {
  window.confirmCenter = function ({
    title = "Xác nhận",
    message = "Bạn có chắc chắn muốn thực hiện thao tác này không?",
    confirmText = "Đồng ý",
    cancelText = "Hủy",
    type = "danger" // primary | warning | danger | info | success
  } = {}) {
    return new Promise((resolve) => {
      const modalEl = document.createElement("div");
      modalEl.className = "modal fade";
      modalEl.tabIndex = -1;
      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content shadow">
            <div class="modal-header ">
              <h5 class="modal-title">${title}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
            </div>
            <div class="modal-body pt-3">
              <div class="d-flex align-items-start">
                <div class="me-3">
                  <span class="d-inline-flex align-items-center justify-content-center rounded-circle"
                        style="width:40px;height:40px;background: var(--bs-${type}-subtle, #f8d7da);">
                    <i class="fas fa-exclamation-triangle"
                       style="color: var(--bs-${type}, #dc3545);"></i>
                  </span>
                </div>
                <div class="flex-grow-1">
                  <p class="mb-0">${message}</p>
                </div>
              </div>
            </div>
            <div class="modal-footer border-0 pt-0">
              <button type="button" class="btn btn-light" data-bs-dismiss="modal">${cancelText}</button>
              <button type="button" class="btn btn-${type}" id="__confirmCenterOk">${confirmText}</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modalEl);
      const bsModal = new bootstrap.Modal(modalEl, { backdrop: "static", keyboard: true });

      modalEl.querySelector("#__confirmCenterOk").addEventListener("click", () => {
        resolve(true);
        bsModal.hide();
      });
      modalEl.addEventListener("hidden.bs.modal", () => {
        resolve(false);
        modalEl.remove();
      });
      bsModal.show();
    });
  };
}

document.addEventListener('DOMContentLoaded', function() {
    // --- KHAI BÁO BIẾN ---
    const createSessionForm = document.getElementById('create-session-form');
    const sessionNameInput = document.getElementById('session-name');
    const exerciseTypeSelect = document.getElementById('exercise-type');
    const sessionsList = document.getElementById('sessions-list');
    const saveSessionNameBtn = document.getElementById('save-session-name-btn');
    const createSessionModalEl = document.getElementById('createSessionModal');
    const soldierChecklist = document.getElementById('soldier-checklist');

    // === KHAI BÁO BIẾN CHO BỘ LỌC VÀ SẮP XẾP MỚI ===
    const filterStatusSelect = document.getElementById('filter-status');
    const filterExerciseSelect = document.getElementById('filter-exercise');
    const sortBySelect = document.getElementById('sort-by-select');
    // ===============================================
    const loadingSpinner = document.getElementById('loading-spinner');
    // --- CÁC HÀM TẢI DỮ LIỆU ---

    async function loadExercises() {
        try {
            const response = await fetch('/api/exercises');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const exercises = await response.json();
            
            // Cập nhật cả dropdown trong modal và dropdown lọc
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
                totalCountBadge.textContent = '?'; // Hiển thị lỗi
            }
        }
    }
    // <<< SỬA ĐỔI HOÀN TOÀN HÀM loadSoldiersIntoModal >>>
    async function loadSoldiersIntoModal() {
        if (!soldierChecklist) return;

        // Lấy checkbox "Chọn tất cả"
        const selectAllCheckbox = document.getElementById('select-all-soldiers');
        
        soldierChecklist.innerHTML = '<p class="text-muted text-center">Đang tải danh sách...</p>';
        // Ẩn checkbox "Chọn tất cả" trong lúc tải
        if(selectAllCheckbox) selectAllCheckbox.style.display = 'none';

        try {
            const response = await fetch('/api/soldiers/all');
            if (!response.ok) throw new Error('Network response was not ok');
            const soldiers = await response.json();
            
            soldierChecklist.innerHTML = '';
            if (soldiers.length > 0) {
                // Hiển thị checkbox "Chọn tất cả" khi có dữ liệu
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

        // Gán sự kiện cho checkbox "Chọn tất cả"
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                const isChecked = this.checked;
                const checkboxes = soldierChecklist.querySelectorAll('.soldier-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                });
            });

            // Gán sự kiện để kiểm tra nếu tất cả được chọn thì tick vào checkbox "Chọn tất cả"
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
        // === BẮT ĐẦU PHẦN SỬA ĐỔI ===
        // 1. Dọn dẹp danh sách cũ và BẬT spinner lên
        sessionsList.innerHTML = '';
        loadingSpinner.style.display = 'block';
        // ============================
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
            if (!response.ok) {
                throw new Error(`Lỗi HTTP: ${response.status}`);
            }
            const sessions = await response.json();

            // === BẮT ĐẦU PHẦN SỬA ĐỔI ===
            // 2. TẮT spinner đi trước khi hiển thị kết quả
            loadingSpinner.style.display = 'none';
            // ============================

            if (sessions.length === 0) {
  sessionsList.classList.add('center-empty');
  sessionsList.innerHTML = `
    <div class="text-center">
      <div class="d-flex flex-column align-items-center justify-content-center">
        <i class="fas fa-folder-open fa-4x text-muted mb-3"></i>
        <h4>Không có phiên tập nào phù hợp</h4>
        <p class="text-muted">Hãy thử thay đổi bộ lọc hoặc tạo một phiên tập mới.</p>
        <button class="btn btn-warning mt-3" data-bs-toggle="modal" data-bs-target="#createSessionModal">
          <i class="fas fa-plus me-2"></i> Tạo Phiên Mới
        </button>
      </div>
    </div>
  `;
} else {
  sessionsList.classList.remove('center-empty');
  sessionsList.innerHTML = ''; // dọn sạch trước khi render mới

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

    const date_created = new Date(session.date_created);
    const formattedDate = `${date_created.getDate().toString().padStart(2, '0')}/${(date_created.getMonth() + 1).toString().padStart(2, '0')}/${date_created.getFullYear()}`;

    const cardHtml = `
      <div class="col">
        <div class="card h-100 shadow-sm card-session" style="border-top: 14px solid ${topBorderColor};">
          <div class="card-header ${statusBgColor} py-2 text-center small fw-bold">${statusText}</div>
          <div class="card-body" p-3>
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <h5 class="card-title mb-1">${session.session_name || `Phiên Tập #${session.id}`}</h5>
                <hr class="card-divider my-2">
                <p class="card-text text-muted small mb-0">Bài tập: <strong>${session.exercise_name}</strong></p>
                <div class="d-flex justify-content-between small text-muted mt-3">
                  <span><i class="far fa-calendar-alt me-1"></i>${formattedDate}</span>
                  <span><i class="fas fa-check-circle me-1"></i>Đã tập: <strong>${session.completed_soldier_count}/${session.total_soldier_count}</strong></span>
                </div>
              </div>
              <div class="dropdown" style="position: relative; z-index: 2;">
                <button class="btn btn-sm btn-light py-0 px-2" type="button" data-bs-toggle="dropdown">
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

            // === BẮT ĐẦU PHẦN SỬA ĐỔI ===
            // 3. TẮT spinner đi nếu có lỗi xảy ra
            loadingSpinner.style.display = 'none';
            // ============================
            sessionsList.innerHTML = '<p class="col-12 text-center text-danger mt-5">Không thể tải dữ liệu. Vui lòng thử lại.</p>';
        }
    }

    // --- CÁC HÀM XỬ LÝ SỰ KIỆN ---
    saveSessionNameBtn.addEventListener('click', async function() {
        const sessionId = document.getElementById('edit-session-id').value;
        const newSessionName = document.getElementById('edit-session-name').value;
        if (!newSessionName) {
            showToast('Tên phiên không được để trống.');
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
                showToast('Cập nhật thành công!');
            } else {
                showToast('Có lỗi xảy ra khi cập nhật.','danger');
            }
        } catch (error) {
            console.error('Lỗi khi cập nhật:', error);
            showToast('Lỗi mạng, không thể cập nhật.','danger');
        }
    });

    sessionsList.addEventListener('click', async function(e) {
        if (e.target.closest('.delete-session-btn')) {
  e.preventDefault();
  const button = e.target.closest('.delete-session-btn');
  const sessionId = button.dataset.sessionId;

  const ok = await window.confirmCenter({
    title: "Xác nhận xoá",
    message: `Thao tác này sẽ xoá vĩnh viễn Phiên Tập #${sessionId}. Bạn có chắc chắn không?`,
    confirmText: "Xoá ngay",
    cancelText: "Hủy",
    type: "danger"
  });
  if (!ok) return;

  try {
    const response = await fetch(`/api/training_sessions/${sessionId}`, { method: 'DELETE' });
    if (response.ok) {
      await loadSessions();
      showToast('Đã xoá phiên tập!', 'success');
    } else {
      showToast('Có lỗi xảy ra khi xoá phiên tập.', 'danger');
    }
  } catch (error) {
    console.error('Lỗi khi xóa phiên tập:', error);
    showToast('Lỗi mạng, không thể xoá.', 'danger');
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
            document.getElementById('editSessionModalLabel').textContent = `Sửa Tên Cho Phiên Tập #${sessionId}`;
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
            showToast('Vui lòng chọn một loại bài tập.', 'danger');
            return;
        }
        if (selectedSoldiers.length === 0) {
            showToast('Vui lòng chọn ít nhất một chiến sĩ.', 'danger');
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
                showToast('Tạo phiên tập thành công!', 'success');
            } else {
                showToast('Có lỗi xảy ra khi tạo phiên tập.','danger');
            }
        } catch (error) {
            console.error('Lỗi khi tạo phiên tập:', error);
            showToast('Lỗi mạng. Vui lòng thử lại.','danger');
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

    // === GÁN SỰ KIỆN CHO CÁC DROPDOWN LỌC VÀ SẮP XẾP ===
    filterStatusSelect.addEventListener('change', loadSessions);
    filterExerciseSelect.addEventListener('change', loadSessions);
    sortBySelect.addEventListener('change', loadSessions);
    // ==================================================

    // --- KHỞI CHẠY LẦN ĐẦU ---
    loadExercises();
    loadSessions();
});

