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
