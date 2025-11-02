<<<<<<< Updated upstream
// static/js/soldiers.js
// JS quản lý danh sách chiến sĩ (CRUD) - tách riêng khỏi template
=======
// ======= GLOBAL TOAST =======
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
      pointerEvents: "none",
    });
    document.body.appendChild(container);
  }

  const colors = {
    success: "#2f6d2f",
    error: "#d9534f",
    warn: "#f0ad4e",
    info: "#5bc0de",
  };
  const color = colors[type] || colors.success;

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
    transition: "opacity .35s ease, transform .35s ease",
  });

  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="9" fill="${color}"></circle>
      <path d="M6 10.3l2.3 2.5L14 7.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div style="flex:1;font-size:15px;">${message}</div>
    <button style="background:transparent;border:none;font-size:18px;color:#777;cursor:pointer;">×</button>
  `;
  toast.querySelector("button").onclick = () => toast.remove();
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

// ======= GLOBAL CONFIRM =======
window.confirmCenter = async function ({
  title = "Xác nhận",
  message = "Bạn có chắc chắn không?",
  confirmText = "Đồng ý",
  cancelText = "Hủy",
  type = "danger",
} = {}) {
  return new Promise((resolve) => {
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
          <div class="modal-body">${message}</div>
          <div class="modal-footer">
            <button class="btn btn-light" data-bs-dismiss="modal">${cancelText}</button>
            <button class="btn btn-${type}" id="confirmOk">${confirmText}</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modalEl);
    const bsModal = new bootstrap.Modal(modalEl);
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
>>>>>>> Stashed changes

// ======= MAIN SOLDIER SCRIPT =======
document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("soldier-tbody");
  const pagination = document.getElementById("pagination-controls");
  const soldierCount = document.getElementById("soldier-count");
  const loadingSpinner = document.getElementById("loading-spinner");
  const filterForm = document.getElementById("filter-form");
  const filterUnitSelect = document.getElementById("filter-unit");
  const addModal = document.getElementById("addSoldierModal");
  const editModal = document.getElementById("editSoldierModal");

<<<<<<< Updated upstream
  const tbody = document.getElementById('soldier-tbody');
  const addModalEl = document.getElementById('addSoldierModal');
  const editModalEl = document.getElementById('editSoldierModal');

  // Bootstrap modal instances
  const addModal = addModalEl ? new bootstrap.Modal(addModalEl) : null;
  const editModal = editModalEl ? new bootstrap.Modal(editModalEl) : null;

  const addForm = document.getElementById('add-soldier-form');
  const editForm = document.getElementById('edit-soldier-form');
  const btnAddSave = document.getElementById('btn-add-save');
  const btnEditSave = document.getElementById('btn-edit-save');
  const filterForm = document.getElementById('filter-form');
  const paginationControls = document.getElementById('pagination-controls');

  const sortOptions = document.getElementById('sort-options');
  let currentSortBy = 'created_at';
  let currentSortOrder = 'desc';

  // Biến tạm để lưu trữ ID của chiến sĩ đang được sửa
  let currentSoldierId = null;
=======
>>>>>>> Stashed changes
  let currentPage = 1;
  let currentSortBy = "created_at";
  let currentSortOrder = "desc";
  let currentSoldierId = null;

  async function loadSoldiers(page = 1) {
    tbody.innerHTML = "";
    loadingSpinner.style.display = "block";

<<<<<<< Updated upstream
    // === BẮT ĐẦU PHẦN TINH CHỈNH LOGIC KIỂM LỖI ===

  // --- Các hàm helper để quản lý lỗi ---
  function clearErrors(form) {
    const generalError = form.querySelector('.alert');
    if (generalError) {
        generalError.classList.add('d-none');
        generalError.textContent = '';
    }
    form.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });
  }

  function showFieldError(field) {
    field.classList.add('is-invalid');
  }

  function showGeneralError(form, message) {
    const generalError = form.querySelector('.alert');
    if (generalError) {
        generalError.textContent = message;
        generalError.classList.remove('d-none');
    }
  }
  
  // Xóa lỗi cũ khi modal được mở
  if (addModalEl) {
    addModalEl.addEventListener('show.bs.modal', function () {
        addForm.reset();
        clearErrors(addForm);
    });
  }
  // --- NÂNG CẤP API WRAPPER ---
  const API = {
    list: (params = {}) => {
      const url = new URL(window.SOLDIER_API.list, window.location.origin);
      if (params.page) url.searchParams.append('page', params.page);
      if (params.search) url.searchParams.append('search', params.search);
      if (params.unit) url.searchParams.append('unit', params.unit);
      if (params.sort_by) url.searchParams.append('sort_by', params.sort_by); // << Thêm mới
      if (params.sort_order) url.searchParams.append('sort_order', params.sort_order); // << Thêm mới
      return fetch(url).then(r => r.json());
    },
    create: (payload) => fetch(window.SOLDIER_API.create, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json()),
    update: (id, payload) => {
      const url = window.SOLDIER_API.update_template.replace(/0$/, id);
      return fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());
    },
    delete: (id) => {
      const url = window.SOLDIER_API.delete_template.replace(/0$/, id);
      return fetch(url, { method: 'DELETE' }).then(r => r.json());
    },
    count: () => fetch(window.SOLDIER_API.count).then(r => r.json())
  };

  // Helper escape HTML
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  }

  // Template 1 hàng
  function rowTemplate(index, s) {
      const reportUrl = window.SOLDIER_API.report_template.replace(/0$/, s.id);

      return `
        <tr data-id="${s.id}">
          <td>${index}</td>
          <td>${escapeHtml(s.name)}</td>
          <td>${escapeHtml(s.unit || '-')}</td>
          <td>${escapeHtml(s.rank || '-')}</td>
          
          <td class="notes-cell" title="${escapeHtml(s.notes || '')}">
              ${escapeHtml(s.notes || '-')}
          </td>
          
          <td>
            <button class="btn btn-sm btn-warning me-1 btn-edit">
              <i class="fas fa-edit"></i>
            </button>
            <a href="${reportUrl}" class="btn btn-sm btn-info me-1 text-white" title="Xem báo cáo">
              <i class="fas fa-chart-bar"></i>
            </a>
            <button class="btn btn-sm btn-danger btn-delete">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
  }

  // --- HÀM TẢI DỮ LIỆU CHÍNH ---
  async function loadTable(page = 1) {
    currentPage = page; // Cập nhật trang hiện tại
    const searchInput = document.querySelector('input[name="search"]').value;
    const unitSelect = document.querySelector('select[name="unit"]').value;

    try {
      const data = await API.list({ 
        page: page,
        search: searchInput, 
        unit: unitSelect,
        sort_by: currentSortBy,
        sort_order: currentSortOrder
      });

      // Kiểm tra data có cấu trúc đúng không
      if (data && data.soldiers && data.pagination) {
        renderTable(data.soldiers, data.pagination);
        renderPagination(data.pagination);
      } else {
        throw new Error("Dữ liệu trả về không hợp lệ");
      }

    } catch (e) {
      console.error('Lỗi khi tải dữ liệu:', e);
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Lỗi khi tải dữ liệu</td></tr>';
    }
  }

  // Hàm vẽ bảng (nhận thêm pagination để tính STT)
  function renderTable(soldiers, pagination) {
    const startIndex = (pagination.page - 1) * pagination.per_page;
    if (soldiers.length === 0) {
        // Thay thế dòng thông báo đơn giản bằng một giao diện hoàn chỉnh hơn
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="text-center p-5" style="min-height: 40vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                        <i class="fas fa-users-slash fa-4x text-muted mb-3"></i>
                        <h4>Không tìm thấy chiến sĩ nào phù hợp</h4>
                        <p class="text-muted">Hãy thử thay đổi bộ lọc hoặc thêm một chiến sĩ mới.</p>
                        <button class="btn btn-primary mt-3" data-bs-toggle="modal" data-bs-target="#addSoldierModal">
                            <i class="fas fa-user-plus me-2"></i> Thêm Chiến sĩ Mới
                        </button>
                    </div>
                </td>
            </tr>
        `;
    } else {
      tbody.innerHTML = soldiers.map((s, i) => rowTemplate(startIndex + i + 1, s)).join('');
    }
  }

  // --- HÀM VẼ CÁC NÚT PHÂN TRANG ---
  function renderPagination(pagination) {
    paginationControls.innerHTML = '';
    if (pagination.total_pages <= 1) {
      document.getElementById('soldier-count').textContent = `(Tổng số: ${pagination.total_items})`;
      return;
    }

    paginationControls.innerHTML += `<li class="page-item ${pagination.has_prev ? '' : 'disabled'}"><a class="page-link" href="#" data-page="${pagination.page - 1}">Trước</a></li>`;
    for (let i = 1; i <= pagination.total_pages; i++) {
      paginationControls.innerHTML += `<li class="page-item ${i === pagination.page ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    paginationControls.innerHTML += `<li class="page-item ${pagination.has_next ? '' : 'disabled'}"><a class="page-link" href="#" data-page="${pagination.page + 1}">Sau</a></li>`;
    
    const startItem = (pagination.page - 1) * pagination.per_page + 1;
    const endItem = Math.min(startItem + pagination.per_page - 1, pagination.total_items);
    document.getElementById('soldier-count').textContent = `(Hiển thị ${startItem}-${endItem} trên tổng số ${pagination.total_items})`;
  }
  
  // Lọc và Tìm kiếm
  if (filterForm) {
    filterForm.addEventListener('submit', function(event) {
        event.preventDefault();
        loadTable(1); // Luôn quay về trang 1 khi lọc
    });
  }
    // Click vào các nút phân trang
  if (paginationControls) {
      paginationControls.addEventListener('click', function(event) {
          event.preventDefault();
          const target = event.target;
          if (target.tagName === 'A' && !target.parentElement.classList.contains('disabled')) {
              const page = target.dataset.page;
              if (page) {
                  loadTable(parseInt(page));
              }
          }
      });
  }

  // --- Viết lại sự kiện click cho nút "Lưu" trong modal THÊM MỚI ---
  if (btnAddSave) {
    btnAddSave.addEventListener('click', async () => {
      clearErrors(addForm);

      // Lấy các input field
      const nameInput = addForm.querySelector('#add-name');
      const rankInput = addForm.querySelector('#add-rank');
      const unitInput = addForm.querySelector('#add-unit');
      
      let isValid = true;
      // Kiểm tra từng trường
      if (!nameInput.value.trim()) {
        showFieldError(nameInput);
        isValid = false;
      }
      if (!rankInput.value.trim()) {
        showFieldError(rankInput);
        isValid = false;
      }
      if (!unitInput.value.trim()) {
        showFieldError(unitInput);
        isValid = false;
      }

      // Nếu có lỗi, dừng lại
      if (!isValid) return;

      // Vô hiệu hóa nút và hiển thị spinner
      btnAddSave.disabled = true;
      btnAddSave.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Đang lưu...`;

      const payload = {
        name: nameInput.value.trim(),
        rank: rankInput.value.trim(),
        unit: unitInput.value.trim(),
        notes: addForm.querySelector('#add-notes').value.trim(),
      };

      try {
        const res = await API.create(payload);
        
        if (res.error) {
          showGeneralError(addForm, res.error); // Hiển thị lỗi từ server
        } else {
          if (addModal) addModal.hide();
          await loadTable(); // Tải lại bảng
          showToast('Thêm chiến sĩ thành công!', 'success');
        }
      } catch (e) {
        showGeneralError(addForm, 'Lỗi kết nối đến server. Vui lòng thử lại.');
      } finally {
        // Khôi phục lại trạng thái nút bấm
        btnAddSave.disabled = false;
        btnAddSave.innerHTML = 'Lưu';
      }
    });
  }

  // Xử lý click trên tbody: sửa/xoá
  tbody.addEventListener('click', async (e) => {
    const clickedElement = e.target;
    const editBtn = clickedElement.closest('button.btn-edit');
    const deleteBtn = clickedElement.closest('button.btn-delete');
    
    const tr = clickedElement.closest('tr');
    if (!tr) return;
    const id = tr.getAttribute('data-id');

    if (editBtn) {
      currentSoldierId = id;
      const cols = tr.querySelectorAll('td');
      editForm.name.value = cols[1].textContent.trim();
      editForm.unit.value = cols[2].textContent.trim() === '-' ? '' : cols[2].textContent.trim();
      editForm.rank.value = cols[3].textContent.trim() === '-' ? '' : cols[3].textContent.trim();
      editForm.notes.value = cols[4].textContent.trim() === '-' ? '' : cols[4].textContent.trim();
      if (editModal) {
        editModal.show();
      }
      return;
    }
    
    if (deleteBtn) {
        if (!confirm('Bạn chắc chắn muốn xoá?')) return;
        try {
            const res = await API.delete(id);
            if (res.error) {
                showToast('Có lỗi xảy ra khi xoá.', 'error');
            } else {
                await loadTable(currentPage);
                showToast(res.message); // Sử dụng message từ server
            }
        } catch (err) {
            console.error('Lỗi khi xoá:', err);
            alert('Lỗi khi xoá. Xem console để biết chi tiết.');
        }
        return;
    }
  });
=======
    const search = filterForm.querySelector('input[name="search"]').value || "";
    const unit = filterUnitSelect.querySelector(".selected").dataset.value || "";

    try {
      const url = new URL(window.SOLDIER_API.list, window.location.origin);
      url.searchParams.set("page", page);
      url.searchParams.set("search", search);
      url.searchParams.set("unit", unit);
      url.searchParams.set("sort_by", currentSortBy);
      url.searchParams.set("sort_order", currentSortOrder);

      const res = await fetch(url);
      const data = await res.json();
      loadingSpinner.style.display = "none";
>>>>>>> Stashed changes

      if (!data.soldiers?.length) {
        tbody.innerHTML = `
          <tr><td colspan="6" class="text-center py-5 text-muted">
            <i class="fas fa-users-slash fa-3x mb-3"></i>
            <h5>Không có chiến sĩ nào phù hợp</h5>
          </td></tr>`;
        pagination.innerHTML = "";
        soldierCount.textContent = "0";
        return;
      }

      const startIndex = (data.pagination.page - 1) * data.pagination.per_page;
      tbody.innerHTML = data.soldiers
        .map(
          (s, i) => `
        <tr data-id="${s.id}">
          <td>${startIndex + i + 1}</td>
          <td>${s.name}</td>
          <td>${s.unit || "-"}</td>
          <td>${s.rank || "-"}</td>
          <td>${s.notes || "-"}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary btn-edit"><i class="fas fa-edit"></i></button>
            <a href="${window.SOLDIER_API.report_template.replace(/0$/, s.id)}" class="btn btn-sm btn-outline-success"><i class="fas fa-chart-bar"></i></a>
            <button class="btn btn-sm btn-outline-danger btn-delete"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`
        )
        .join("");

      renderPagination(data.pagination);
      soldierCount.textContent = data.pagination.total_items;
    } catch (err) {
      loadingSpinner.style.display = "none";
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>`;
      console.error(err);
    }
  }

  function renderPagination(p) {
    pagination.innerHTML = "";
    if (p.total_pages <= 1) return;
    pagination.innerHTML += `<li class="page-item ${p.has_prev ? "" : "disabled"}"><a class="page-link" href="#" data-page="${p.page - 1}">Trước</a></li>`;
    for (let i = 1; i <= p.total_pages; i++) {
      pagination.innerHTML += `<li class="page-item ${i === p.page ? "active" : ""}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    pagination.innerHTML += `<li class="page-item ${p.has_next ? "" : "disabled"}"><a class="page-link" href="#" data-page="${p.page + 1}">Sau</a></li>`;
  }

  pagination.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-page]");
    if (!a) return;
    e.preventDefault();
    loadSoldiers(Number(a.dataset.page));
  });

<<<<<<< Updated upstream
  // Lần đầu tải
  loadTable(1);
=======
  // ===== CUSTOM SELECT =====
  document.querySelectorAll(".custom-select").forEach((select) => {
    const selected = select.querySelector(".selected");
    const options = select.querySelector(".options");
    selected.addEventListener("click", () => {
      document.querySelectorAll(".custom-select").forEach((s) => s.classList.remove("active"));
      select.classList.toggle("active");
    });
    options.querySelectorAll("div").forEach((opt) => {
      opt.addEventListener("click", () => {
        selected.textContent = opt.textContent;
        selected.dataset.value = opt.dataset.value;
        select.classList.remove("active");
        loadSoldiers();
      });
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".custom-select")) {
      document.querySelectorAll(".custom-select").forEach((s) => s.classList.remove("active"));
    }
  });
>>>>>>> Stashed changes

  filterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    loadSoldiers(1);
  });

  // ===== INIT =====
  loadSoldiers();
});
