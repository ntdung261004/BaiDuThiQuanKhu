// static/js/soldiers.js
// Quản lý danh sách chiến sĩ (CRUD + Toast + Confirm + Đếm tổng)

// ================== TOAST ==================
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
      <path d="M6 10.3l2.3 2.5L14 7.5" fill="none" stroke="#fff" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/>
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

// ================== ALERT CENTER ==================
window.alertCenter = function ({
  title = "Success alert",
  message = "Your work has been saved",
  okText = "OK",
  variant = "success"
} = {}) {
  return new Promise((resolve) => {
    const COLORS = {
      success: { ring: "#22c55e", fill: "#22c55e", icon: "check" },
      info: { ring: "#3b82f6", fill: "#3b82f6", icon: "info" },
      warning: { ring: "#f59e0b", fill: "#f59e0b", icon: "warn" },
      danger: { ring: "#ef4444", fill: "#ef4444", icon: "x" },
    };
    const C = COLORS[variant] || COLORS.success;

    const svgIcon =
      C.icon === "check" ? `
        <svg width="64" height="64" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="22" fill="none" stroke="${C.ring}" stroke-width="2" opacity=".25"></circle>
          <path d="M14 24.5l6 6L34 17" fill="none" stroke="${C.fill}" stroke-width="4"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>` :
      C.icon === "x" ? `
        <svg width="64" height="64" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="22" fill="none" stroke="${C.ring}" stroke-width="2" opacity=".25"></circle>
          <path d="M16 16l16 16M32 16L16 32" fill="none" stroke="${C.fill}" stroke-width="4"
                stroke-linecap="round"/>
        </svg>` :
      C.icon === "warn" ? `
        <svg width="64" height="64" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="22" fill="none" stroke="${C.ring}" stroke-width="2" opacity=".25"></circle>
          <path d="M24 13v16" stroke="${C.fill}" stroke-width="4" stroke-linecap="round"/>
          <circle cx="24" cy="35" r="2.5" fill="${C.fill}"/>
        </svg>` :
      `
        <svg width="64" height="64" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="22" fill="none" stroke="${C.ring}" stroke-width="2" opacity=".25"></circle>
          <circle cx="24" cy="16" r="3" fill="${C.fill}"/>
          <path d="M24 22v12" stroke="${C.fill}" stroke-width="4" stroke-linecap="round"/>
        </svg>`;

    const wrap = document.createElement("div");
    wrap.className = "modal fade";
    wrap.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0" style="box-shadow:0 10px 30px rgba(0,0,0,.15);">
          <div class="modal-body text-center p-4">
            <div class="d-flex justify-content-center mb-2">${svgIcon}</div>
            <h5 class="fw-bold mb-1">${title}</h5>
            <div class="text-muted mb-3">${message}</div>
            <button type="button" class="btn btn-dark px-4" data-bs-dismiss="modal">${okText}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
    const bs = new bootstrap.Modal(wrap, { backdrop: "static", keyboard: true });
    wrap.addEventListener("hidden.bs.modal", () => { wrap.remove(); resolve(true); });
    bs.show();
  });
};

// ================== CONFIRM CENTER ==================
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
    modalEl.tabIndex = -1;
    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow">
          <div class="modal-header">
            <h5 class="modal-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>
              <span class="d-inline-flex align-items-center justify-content-center rounded-circle"
                    style="width:40px;height:40px;background: var(--bs-${type}-subtle, #f8d7da);">
                <i class="fas fa-exclamation-triangle" style="color: var(--bs-${type}, #dc3545);"></i>
              </span>
              ${message}
            </p>
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

// ================== CRUD + LIST ==================
(function () {
  const tbody             = document.getElementById("soldier-tbody");
  const addForm           = document.getElementById("add-soldier-form");
  const editForm          = document.getElementById("edit-soldier-form");
  const addModalEl        = document.getElementById("addSoldierModal");
  const editModalEl       = document.getElementById("editSoldierModal");
  const addModal          = addModalEl ? new bootstrap.Modal(addModalEl) : null;
  const editModal         = editModalEl ? new bootstrap.Modal(editModalEl) : null;
  const btnAddSave        = document.getElementById("btn-add-save");
  const btnEditSave       = document.getElementById("btn-edit-save");
  const paginationControls= document.getElementById("pagination-controls");
  const sortOptions       = document.getElementById("sort-options");
  const filterForm        = document.getElementById("filter-form");
  const searchInput       = filterForm ? filterForm.querySelector('input[name="search"]') : null;
  const unitSelect        = document.getElementById("filter-unit");
  const loadingSpinner    = document.getElementById("loading-spinner");

  let currentSoldierId = null;
  let currentPage      = 1;
  let currentSortBy    = "created_at";
  let currentSortOrder = "desc";

  const API = {
    list: (params = {}) => {
      const url = new URL(window.SOLDIER_API.list, window.location.origin);
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.append(k, v);
        }
      });
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

    if (loadingSpinner) loadingSpinner.style.display = "block";

    try {
      const data = await API.list({
        page,
        sort_by: currentSortBy,
        sort_order: currentSortOrder,
        search: searchInput ? searchInput.value.trim() : "",
        unit:   unitSelect   ? unitSelect.value : ""
      });

      const soldiers   = data.soldiers || data.items || [];
      const pagination = data.pagination || { page: 1, total_pages: 1, per_page: 10 };

      if (!soldiers.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4 text-muted">
              <i class="fas fa-users-slash fa-2x mb-2"></i><br>
              Không có chiến sĩ nào
            </td>
          </tr>`;
      } else {
        const start = (pagination.page - 1) * pagination.per_page;
        tbody.innerHTML = soldiers.map((s, i) => rowTemplate(start + i + 1, s)).join("");
      }

      renderPagination(pagination);
      updateTotalCount();
    } catch (err) {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>`;
    } finally {
      if (loadingSpinner) loadingSpinner.style.display = "none";
    }
  }

  function renderPagination(pagination) {
    if (!paginationControls) return;
    paginationControls.innerHTML = "";
    if (pagination.total_pages <= 1) return;

    const addBtn = (p, label, disabled, active) => {
      paginationControls.insertAdjacentHTML("beforeend",
        `<li class="page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}">
          <a class="page-link" href="#" data-page="${p}">${label}</a>
        </li>`);
    };

    addBtn(pagination.page - 1, "Trước", !pagination.has_prev, false);
    for (let i = 1; i <= pagination.total_pages; i++) {
      addBtn(i, i, false, i === pagination.page);
    }
    addBtn(pagination.page + 1, "Sau", !pagination.has_next, false);
  }

  // ======== THÊM ========
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
      await alertCenter({
        title: "Thành công",
        message: "Chiến sĩ mới đã được lưu.",
        variant: "success"
      });
      await loadTable(currentPage);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btnAddSave.disabled = false;
      btnAddSave.innerHTML = "Lưu";
    }
  });

  // ======== SỬA ========
  tbody?.addEventListener("click", e => {
    const btn = e.target.closest(".btn-edit");
    if (!btn) return;
    const tr = btn.closest("tr");
    currentSoldierId = tr.dataset.id;
    const tds = tr.querySelectorAll("td");
    editForm.name.value  = tds[1].textContent.trim();
    editForm.unit.value  = tds[2].textContent.trim() === "-" ? "" : tds[2].textContent.trim();
    editForm.rank.value  = tds[3].textContent.trim() === "-" ? "" : tds[3].textContent.trim();
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
      await alertCenter({
        title: "Cập nhật thành công",
        message: "Thông tin chiến sĩ đã được lưu.",
        variant: "success"
      });
      await loadTable(currentPage);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btnEditSave.disabled = false;
      btnEditSave.innerHTML = "Lưu thay đổi";
    }
  });

  // ======== XÓA ========
  tbody?.addEventListener("click", async e => {
    const btn = e.target.closest(".btn-delete");
    if (!btn) return;
    const tr = btn.closest("tr");
    const id = tr.dataset.id;
    const soldierName = tr.querySelector("td:nth-child(2)")?.textContent.trim() || `Chiến sĩ #${id}`;

    const ok = await confirmCenter({
      title: "Xác nhận xoá",
      message: `Bạn có chắc muốn xoá chiến sĩ <strong>${soldierName}</strong>?`,
      confirmText: "Xoá ngay",
      cancelText: "Hủy",
      type: "danger"
    });
    if (!ok) return;

    try {
      const res = await API.delete(id);
      if (res.error) throw new Error(res.error);

      await loadTable(currentPage);
      await alertCenter({
        title: `Đã xoá: ${soldierName}`,
        message: "Chiến sĩ này đã được xoá khỏi hệ thống.",
        variant: "success"
      });
    } catch (err) {
      showToast("Không thể xoá: " + err.message, "error");
    }
  });

  // ======== PHÂN TRANG ========
  paginationControls?.addEventListener("click", e => {
    e.preventDefault();
    const a = e.target.closest("a[data-page]");
    if (!a) return;
    loadTable(parseInt(a.dataset.page, 10));
  });

  // ======== SẮP XẾP ========
  sortOptions?.addEventListener("click", e => {
    const a = e.target.closest("a[data-sortby]");
    if (!a) return;
    currentSortBy = a.dataset.sortby;
    currentSortOrder = a.dataset.order;
    document.getElementById("sort-button").innerHTML =
      `<i class="fas fa-sort-amount-down me-2"></i>${a.textContent}`;
    loadTable(1);
  });

  // ======== LỌC (form) ========
  if (filterForm) {
    filterForm.addEventListener("submit", function (e) {
      e.preventDefault();       // không reload trang
      loadTable(1);             // gọi lại với search + unit mới
    });
  }

  // khởi tạo lần đầu
  loadTable(1);

  // bó lại để skin-select phía dưới còn gọi được
  window.__reloadSoldiersTable = () => loadTable(1);
})();

// ================== SKIN SELECT cho ô ĐƠN VỊ ==================
(function () {
  function skinSelect(selectEl) {
    if (!selectEl || selectEl.dataset.skinned === "1") return;

    selectEl.classList.add("select-hidden");

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "select-skin-trigger";
    trigger.textContent = selectEl.selectedOptions[0]?.textContent || "Chọn";

    selectEl.parentElement.insertBefore(trigger, selectEl.nextSibling);

    let menu = null;

    function openMenu() {
      menu = document.querySelector(".select-skin-menu");
      if (!menu) {
        menu = document.createElement("div");
        menu.className = "select-skin-menu";
        document.body.appendChild(menu);
      }
      menu.innerHTML = "";

      Array.from(selectEl.options).forEach(opt => {
        const item = document.createElement("div");
        item.className = "select-option" + (opt.value === selectEl.value ? " active" : "");
        item.textContent = opt.textContent;
        item.addEventListener("click", () => {
          selectEl.value = opt.value;
          trigger.textContent = opt.textContent;
          closeMenu();

          // bắn change
          selectEl.dispatchEvent(new Event("change", { bubbles: true }));

          // nếu có form lọc thì cho nó submit -> đã bị chặn ở trên để gọi loadTable
          const form = selectEl.closest("form");
          if (form && form.id === "filter-form") {
            form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          }
        });
        menu.appendChild(item);
      });

      const r = trigger.getBoundingClientRect();
      menu.style.top = r.bottom + 6 + "px";
      menu.style.left = r.left + "px";
      menu.style.minWidth = r.width + "px";
      menu.classList.add("on");

      const onDoc = (e) => {
        if (e.target !== trigger && !menu.contains(e.target)) closeMenu();
      };
      document.addEventListener("click", onDoc, { once: true });
      menu._cleanup = () => document.removeEventListener("click", onDoc);
    }

    function closeMenu() {
      if (!menu) return;
      menu.classList.remove("on");
      menu._cleanup && menu._cleanup();
    }

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const opened = document.querySelector(".select-skin-menu.on");
      if (opened && opened !== menu) {
        opened.classList.remove("on");
        opened._cleanup && opened._cleanup();
      }
      if (menu && menu.classList.contains("on")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    selectEl.dataset.skinned = "1";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const unitSelect = document.getElementById("filter-unit");
    if (unitSelect) skinSelect(unitSelect);
  });
})();
