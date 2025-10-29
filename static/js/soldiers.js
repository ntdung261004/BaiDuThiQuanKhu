// static/js/soldiers.js
// JS quản lý danh sách chiến sĩ (CRUD) - tách riêng khỏi template
// ==== TOAST MATERIAL-LIKE, CHỈ JS & INLINE STYLE (không cần CSS riêng) ====
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
  }, 3000);
};
// ==== GLOBAL CENTER CONFIRM MODAL (Bootstrap) ====
window.confirmCenter = function ({
  title = "Xác nhận",
  message = "Bạn có chắc chắn muốn thực hiện thao tác này không?",
  confirmText = "Xóa",
  cancelText = "Hủy",
  type = "danger" // primary | warning | danger | info | success
} = {}) {
  return new Promise((resolve) => {
    // tạo khung modal
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

    // khởi tạo bootstrap modal
    const bsModal = new bootstrap.Modal(modalEl, { backdrop: "static", keyboard: true });

    // xử lý nút OK
    modalEl.querySelector("#__confirmCenterOk").addEventListener("click", () => {
      resolve(true);
      bsModal.hide();
    });

    // nếu đóng/cancel thì resolve false
    modalEl.addEventListener("hidden.bs.modal", () => {
      resolve(false);
      modalEl.remove();
    });

    // mở modal
    bsModal.show();
  });
};

(function () {
  // Kiểm tra config API có tồn tại
  if (!window.SOLDIER_API) {
    console.error('SOLDIER_API chưa được cấu hình. Hãy include script nhỏ trên template dùng url_for để set window.SOLDIER_API.');
    return;
  }

  const tbody = document.getElementById('soldier-tbody') || null;
const addModalEl = document.getElementById('addSoldierModal') || null;
const editModalEl = document.getElementById('editSoldierModal') || null;

  // Bootstrap modal instances
  const addModal = addModalEl ? new bootstrap.Modal(addModalEl) : null;
  const editModal = editModalEl ? new bootstrap.Modal(editModalEl) : null;

  const addForm = document.getElementById('add-soldier-form') || null;
const editForm = document.getElementById('edit-soldier-form') || null;
const btnAddSave = document.getElementById('btn-add-save') || null;
const btnEditSave = document.getElementById('btn-edit-save') || null;
const filterForm = document.getElementById('filter-form') || null;
const paginationControls = document.getElementById('pagination-controls') || null;

  const sortOptions = document.getElementById('sort-options');
  let currentSortBy = 'created_at';
  let currentSortOrder = 'desc';

  // Biến tạm để lưu trữ ID của chiến sĩ đang được sửa
  let currentSoldierId = null;
  let currentPage = 1;


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
            <button class="btn btn-sm me-1 btn-edit">
              <i class="fas fa-edit"></i>
            </button>
            <a href="${reportUrl}" class="btn btn-sm btn-report me-1 text-white" title="Xem báo cáo">
              <i class="fas fa-chart-bar"></i>
            </a>
            <button class="btn btn-sm btn-delete">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
  }

  // --- HÀM TẢI DỮ LIỆU CHÍNH ---
  async function loadTable(page = 1) {
  // Nếu trang hiện tại không có bảng thì thoát sớm
  if (!tbody) return;

  currentPage = page;
  const si = document.querySelector('input[name="search"]');
  const ui = document.querySelector('select[name="unit"]');
  const searchInput = si ? si.value : '';
  const unitSelect  = ui ? ui.value : '';

  try {
    const data = await API.list({
      page,
      search: searchInput,
      unit: unitSelect,
      sort_by: currentSortBy,
      sort_order: currentSortOrder
    });

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
                            <i class="fas fa-user-plus me-2"></i> Thêm Chiến Sĩ Mới
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
    if (!paginationControls) return;
    paginationControls.innerHTML = '';
    if (pagination.total_pages <= 1) {
      document.getElementById('soldier-count').textContent = ` ${pagination.total_items}`;
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
async function refreshDashboardCount() {
  const totalEl = document.getElementById('total-soldiers');
  if (!totalEl) return; // không có ô tổng trên trang này

  try {
    const data = await API.count(); // { total: number } (tuỳ server)
    const total = (typeof data.total === 'number') ? data.total :
                  (typeof data.count === 'number') ? data.count : null;
    if (total !== null) totalEl.textContent = total;
  } catch (e) {
    // im lặng, không ảnh hưởng UX
  }
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
    showGeneralError(addForm, res.error);
  } else {
    if (addModal) addModal.hide();

    // Hiện toast TRƯỚC, để dù loadTable lỗi vẫn có thông báo
    showToast('Thêm chiến sĩ thành công!', 'success');

    // Nếu đang ở trang danh sách thì tải lại bảng
    if (tbody) {
      await loadTable().catch(() => {});
    }

    // Luôn thử cập nhật ô tổng trên dashboard (nếu có)
    await refreshDashboardCount();
  }
} catch (e) {
  showGeneralError(addForm, 'Lỗi kết nối đến server. Vui lòng thử lại.');
} finally {
  btnAddSave.disabled = false;
  btnAddSave.innerHTML = 'Lưu';
}

    });
  }

  // Xử lý click trên tbody: sửa/xoá
  if (tbody) {
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
    const ok = await window.confirmCenter({
      title: "Xác nhận xoá",
      message: "Thao tác này sẽ xoá chiến sĩ khỏi hệ thống. Bạn có chắc chắn không?",
      confirmText: "Xoá ngay",
      cancelText: "Hủy",
      type: "danger"
    });
    if (!ok) return;

    try {
      const res = await API.delete(id);
      if (res.error) {
        showToast('Có lỗi xảy ra khi xoá.', 'error');
      } else {
        await loadTable(currentPage);
        showToast(res.message || 'Đã xoá thành công!');
      }
    } catch (err) {
      console.error('Lỗi khi xoá:', err);
      showToast('Lỗi khi xoá. Vui lòng thử lại.', 'error');
    }
    return;
}

  });}

  // Lưu chỉnh sửa
  if (btnEditSave) {
    btnEditSave.addEventListener('click', async () => {
      const id = currentSoldierId;
      const payload = {
        name: editForm.name.value.trim(),
        unit: editForm.unit.value.trim(),
        rank: editForm.rank.value.trim(),
        notes: editForm.notes.value.trim(),
      };
      if (!payload.name) {
        alert('Vui lòng nhập tên chiến sĩ');
        return;
      }
      try {
        const res = await API.update(id, payload);
        if (res.error) {
          alert('Lỗi: ' + (res.error || 'Không rõ'));
        } else {
          if (editModal) editModal.hide();
          await loadTable(currentPage);
          showToast('Cập nhật thành công!', 'success');
        }
      } catch (e) {
        console.error('Lỗi khi cập nhật:', e);
        alert('Lỗi khi cập nhật. Xem console để biết chi tiết.');
      }
    });
  }

    // --- THÊM MỚI: BỘ LẮNG NGHE SỰ KIỆN CHO MENU SẮP XẾP ---
  if (sortOptions) {
    sortOptions.addEventListener('click', function(event) {
        event.preventDefault();
        const target = event.target;
        if (target.tagName === 'A') {
            currentSortBy = target.dataset.sortby;
            currentSortOrder = target.dataset.order;
            
            // Cập nhật text của nút chính để hiển thị lựa chọn hiện tại
            const sortButton = document.getElementById('sort-button');
            sortButton.innerHTML = `<i class="fas fa-sort-amount-down me-2"></i> ${target.textContent}`;

            loadTable(1); // Tải lại dữ liệu về trang 1 với lựa chọn sắp xếp mới
        }
    });
  }


  // Lần đầu tải
  if (tbody) {
  loadTable(1);
}


})();