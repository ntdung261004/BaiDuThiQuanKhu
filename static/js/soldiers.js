// static/js/soldiers.js
// JS quản lý danh sách chiến sĩ (CRUD) - tách riêng khỏi template

(function () {
  // Kiểm tra config API có tồn tại
  if (!window.SOLDIER_API) {
    console.error('SOLDIER_API chưa được cấu hình. Hãy include script nhỏ trên template dùng url_for để set window.SOLDIER_API.');
    return;
  }

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
  loadTable(1);

})();