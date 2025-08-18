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
  
  // Biến tạm để lưu trữ ID của chiến sĩ đang được sửa
  let currentSoldierId = null;

  // Các hàm API wrapper
  const API = {
    list: () => fetch(window.SOLDIER_API.list).then(r => r.json()),
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
    return `
      <tr data-id="${s.id}">
        <td>${index}</td>
        <td>${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.unit || '-')}</td>
        <td>${escapeHtml(s.rank || '-')}</td>
        <td>${escapeHtml(s.notes || '-')}</td>
        <td>
          <button class="btn btn-sm btn-warning me-1 btn-edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-delete">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }

  // Đổ bảng
  async function loadTable() {
    try {
      const data = await API.list();
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-4">Chưa có chiến sĩ nào được thêm vào.</td></tr>';
      } else {
        tbody.innerHTML = data.map((s, i) => rowTemplate(i + 1, s)).join('');
      }
    } catch (e) {
      console.error('Lỗi khi tải danh sách chiến sĩ:', e);
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Lỗi khi tải dữ liệu</td></tr>';
    }
    // sau khi tải bảng, cập nhật count
    updateSoldierCount();
  }

  // Thêm mới
  if (btnAddSave) {
    btnAddSave.addEventListener('click', async () => {
      const payload = {
        name: addForm.name.value.trim(),
        unit: addForm.unit.value.trim(),
        rank: addForm.rank.value.trim(),
        notes: addForm.notes.value.trim(),
      };
      if (!payload.name) {
        alert('Vui lòng nhập tên chiến sĩ');
        return;
      }
      try {
        const res = await API.create(payload);
        if (res.error) {
          alert('Lỗi: ' + (res.error || 'Không rõ'));
        } else {
          addForm.reset();
          if (addModal) addModal.hide();
          await loadTable();
        }
      } catch (e) {
        console.error('Lỗi khi tạo chiến sĩ:', e);
        alert('Lỗi khi tạo chiến sĩ. Xem console để biết chi tiết.');
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
                /*alert('Lỗi: ' + (res.error || 'Không rõ)');*/
            } else {
                await loadTable();
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
          await loadTable();
        }
      } catch (e) {
        console.error('Lỗi khi cập nhật:', e);
        alert('Lỗi khi cập nhật. Xem console để biết chi tiết.');
      }
    });
  }

  // Cập nhật tổng số chiến sĩ
  async function updateSoldierCount() {
    try {
      const js = await API.count();
      const el = document.getElementById('soldier-count');
      if (el) el.textContent = `(Tổng số: ${js.total})`;
    } catch (e) {
      console.error('Lỗi khi lấy số lượng chiến sĩ:', e);
    }
  }

  // Lần đầu tải
  loadTable();

  // Polling count mỗi 5s (dự phòng) — nhưng loadTable gọi update sau mỗi thao tác
  setInterval(updateSoldierCount, 5000);

})();