// static/js/soldiers.js
// Quản lý danh sách chiến sĩ (CRUD + Toast + Confirm + Đếm tổng)

window.showToast = function (message = "Thao tác thành công!", type = "success") {
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

  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="9" fill="${color}"></circle>
      <path d="M6 10.3l2.3 2.5L14 7.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div style="flex:1;font-size:15px;">${message}</div>
    <button style="background:none;border:none;font-size:18px;color:#777;cursor:pointer;">×</button>
  `;

  const closeBtn = toast.querySelector("button");
  closeBtn.onclick = () => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px)";
    setTimeout(() => toast.remove(), 250);
  };

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });
  setTimeout(() => {
    if (toast.isConnected) {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(12px)";
      setTimeout(() => toast.remove(), 250);
    }
  }, 3000);
};

// ===== MODAL XÁC NHẬN =====
window.confirmCenter = function ({
  title = "Xác nhận",
  message = "Bạn có chắc chắn muốn thực hiện thao tác này?",
  confirmText = "Đồng ý",
  cancelText = "Hủy",
  type = "danger"
} = {}) {
  return new Promise(resolve => {
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
            <button type="button" class="btn btn-${type}" id="confirm-ok">${confirmText}</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modalEl);
    const modal = new bootstrap.Modal(modalEl, { backdrop: "static" });
    modalEl.querySelector("#confirm-ok").onclick = () => {
      resolve(true);
      modal.hide();
    };
    modalEl.addEventListener("hidden.bs.modal", () => {
      resolve(false);
      modalEl.remove();
    });
    modal.show();
  });
};

// ===== CRUD LOGIC =====
(function () {
  const tbody = document.getElementById("soldier-tbody");
  const addForm = document.getElementById("add-soldier-form");
  const editForm = document.getElementById("edit-soldier-form");
  const addModalEl = document.getElementById("addSoldierModal");
  const editModalEl = document.getElementById("editSoldierModal");
  const addModal = addModalEl ? new bootstrap.Modal(addModalEl) : null;
  const editModal = editModalEl ? new bootstrap.Modal(editModalEl) : null;
  const btnAddSave = document.getElementById("btn-add-save");
  const btnEditSave = document.getElementById("btn-edit-save");
  const paginationControls = document.getElementById("pagination-controls");
  const sortOptions = document.getElementById("sort-options");

  let currentSoldierId = null;
  let currentPage = 1;
  let currentSortBy = "created_at";
  let currentSortOrder = "desc";

  const API = {
    list: (params = {}) => {
      const url = new URL(window.SOLDIER_API.list, window.location.origin);
      Object.entries(params).forEach(([k, v]) => v && url.searchParams.append(k, v));
      return fetch(url).then(r => r.json());
    },
    create: (data) => fetch(window.SOLDIER_API.create, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
    update: (id, data) => {
      const url = window.SOLDIER_API.update_template.replace(/0$/, id);
      return fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(r => r.json());
    },
    delete: (id) => {
      const url = window.SOLDIER_API.delete_template.replace(/0$/, id);
      return fetch(url, { method: "DELETE" }).then(r => r.json());
    },
    count: () => fetch(window.SOLDIER_API.count).then(r => r.json())
  };

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, s => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[s]));
  }

  function rowTemplate(index, s) {
    const reportUrl = window.SOLDIER_API.report_template.replace(/0$/, s.id);
    return `
      <tr data-id="${s.id}">
        <td>${index}</td>
        <td>${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.unit || "-")}</td>
        <td>${escapeHtml(s.rank || "-")}</td>
        <td>${escapeHtml(s.notes || "-")}</td>
        <td>
          <button class="btn btn-warning btn-sm me-1 text-white btn-edit"><i class="fas fa-edit"></i></button>
          <a href="${reportUrl}" class="btn btn-info btn-sm me-1 text-white"><i class="fas fa-chart-bar"></i></a>
          <button class="btn btn-danger btn-sm btn-delete"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>`;
  }

  async function updateTotalCount() {
    const el = document.getElementById("soldier-count");
    if (!el) return;
    try {
      const data = await API.count();
      const total = data.total || data.count || 0;
      el.textContent = total;
    } catch {
      el.textContent = "?";
    }
  }

  async function loadTable(page = 1) {
    currentPage = page;
    try {
      const data = await API.list({
        page,
        sort_by: currentSortBy,
        sort_order: currentSortOrder
      });
      const soldiers = data.soldiers || [];
      const pagination = data.pagination || { page: 1, total_pages: 1, per_page: 10 };
      if (!soldiers.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">
          <i class="fas fa-users-slash fa-2x mb-2"></i><br>Không có chiến sĩ nào</td></tr>`;
      } else {
        const start = (pagination.page - 1) * pagination.per_page;
        tbody.innerHTML = soldiers.map((s, i) => rowTemplate(start + i + 1, s)).join("");
      }
      renderPagination(pagination);
      updateTotalCount();
    } catch {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>`;
    }
  }

  function renderPagination(pagination) {
    if (!paginationControls) return;
    paginationControls.innerHTML = "";
    if (pagination.total_pages <= 1) return;
    const addBtn = (p, label, dis, act) => {
      paginationControls.insertAdjacentHTML("beforeend",
        `<li class="page-item ${dis ? "disabled" : ""} ${act ? "active" : ""}">
          <a class="page-link" href="#" data-page="${p}">${label}</a></li>`);
    };
    addBtn(pagination.page - 1, "Trước", !pagination.has_prev);
    for (let i = 1; i <= pagination.total_pages; i++)
      addBtn(i, i, false, i === pagination.page);
    addBtn(pagination.page + 1, "Sau", !pagination.has_next);
  }

  // === Thêm ===
  btnAddSave?.addEventListener("click", async () => {
    const data = {
      name: addForm.name.value.trim(),
      rank: addForm.rank.value.trim(),
      unit: addForm.unit.value.trim(),
      notes: addForm.notes.value.trim()
    };
    if (!data.name || !data.rank || !data.unit) {
      showToast("Vui lòng nhập đầy đủ thông tin!", "warn");
      return;
    }
    btnAddSave.disabled = true;
    btnAddSave.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Đang lưu...`;
    try {
      const res = await API.create(data);
      if (res.error) throw new Error(res.error);
      addModal?.hide();
      showToast("Thêm chiến sĩ thành công!", "success");
      await loadTable(currentPage);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btnAddSave.disabled = false;
      btnAddSave.innerHTML = "Lưu";
    }
  });

  // === Sửa ===
  tbody?.addEventListener("click", e => {
    const btn = e.target.closest(".btn-edit");
    if (!btn) return;
    const tr = btn.closest("tr");
    currentSoldierId = tr.dataset.id;
    const tds = tr.querySelectorAll("td");
    editForm.name.value = tds[1].textContent.trim();
    editForm.unit.value = tds[2].textContent.trim() === "-" ? "" : tds[2].textContent.trim();
    editForm.rank.value = tds[3].textContent.trim() === "-" ? "" : tds[3].textContent.trim();
    editForm.notes.value = tds[4].textContent.trim() === "-" ? "" : tds[4].textContent.trim();
    editModal?.show();
  });

  btnEditSave?.addEventListener("click", async () => {
    const data = {
      name: editForm.name.value.trim(),
      unit: editForm.unit.value.trim(),
      rank: editForm.rank.value.trim(),
      notes: editForm.notes.value.trim()
    };
    if (!data.name) {
      showToast("Tên chiến sĩ không được để trống!", "warn");
      return;
    }
    btnEditSave.disabled = true;
    btnEditSave.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Đang lưu...`;
    try {
      const res = await API.update(currentSoldierId, data);
      if (res.error) throw new Error(res.error);
      editModal?.hide();
      showToast("Cập nhật thành công!", "success");
      await loadTable(currentPage);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btnEditSave.disabled = false;
      btnEditSave.innerHTML = "Lưu thay đổi";
    }
  });

  // === Xóa ===
  tbody?.addEventListener("click", async e => {
    const btn = e.target.closest(".btn-delete");
    if (!btn) return;
    const id = btn.closest("tr").dataset.id;
    const ok = await confirmCenter({
      title: "Xác nhận xoá",
      message: "Bạn có chắc muốn xoá chiến sĩ này?",
      confirmText: "Xoá ngay",
      cancelText: "Hủy",
      type: "danger"
    });
    if (!ok) return;
    try {
      const res = await API.delete(id);
      if (res.error) throw new Error(res.error);
      showToast("Đã xoá chiến sĩ!", "success");
      await loadTable(currentPage);
    } catch (err) {
      showToast("Không thể xoá: " + err.message, "error");
    }
  });

  // === Phân trang & Sort ===
  paginationControls?.addEventListener("click", e => {
    e.preventDefault();
    const a = e.target.closest("a[data-page]");
    if (!a) return;
    loadTable(parseInt(a.dataset.page));
  });

  sortOptions?.addEventListener("click", e => {
    const a = e.target.closest("a[data-sortby]");
    if (!a) return;
    currentSortBy = a.dataset.sortby;
    currentSortOrder = a.dataset.order;
    document.getElementById("sort-button").innerHTML =
      `<i class="fas fa-sort-amount-down me-2"></i>${a.textContent}`;
    loadTable(1);
  });

  // === Khởi tạo lần đầu ===
  loadTable(1);
})();
