// static/js/profile.js
// ===== GLOBAL CENTER ALERT (Form giữa màn hình) =====
// ===== GLOBAL CENTER CONFIRM (Form giữa màn hình) =====
(function () {
  // Nếu đã có confirmCenter thì override cho thống nhất UI
  window.confirmCenter = function ({
    title = "Xác nhận",
    message = "Bạn có chắc chắn muốn thực hiện thao tác này?",
    confirmText = "Đồng ý",
    cancelText  = "Hủy",
    type = "danger" // success | info | warn | danger | primary
  } = {}) {
    // icon màu theo type (giống phần bạn yêu cầu thêm)
    const typeVars = {
      success: { bg: 'var(--bs-success-bg-subtle,#d1e7dd)', fg: 'var(--bs-success,#198754)', icon: 'fa-check-circle' },
      info:    { bg: 'var(--bs-info-bg-subtle,#cff4fc)',    fg: 'var(--bs-info,#0dcaf0)',   icon: 'fa-info-circle' },
      warn:    { bg: 'var(--bs-warning-bg-subtle,#fff3cd)', fg: 'var(--bs-warning,#f0ad4e)',icon: 'fa-exclamation-circle' },
      danger:  { bg: 'var(--bs-danger-bg-subtle,#f8d7da)',  fg: 'var(--bs-danger,#dc3545)', icon: 'fa-exclamation-triangle' },
      primary: { bg: 'var(--bs-primary-bg-subtle,#cfe2ff)', fg: 'var(--bs-primary,#0d6efd)',icon: 'fa-question-circle' }
    };
    const t = typeVars[type] ? type : 'danger';
    const { bg, fg, icon } = typeVars[t];

    return new Promise((resolve) => {
      const modalEl = document.createElement('div');
      modalEl.className = 'modal fade';
      modalEl.tabIndex = -1;
      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0" style="box-shadow:0 10px 30px rgba(0,0,0,.15);">
            <div class="modal-body p-4">
              <div class="d-flex align-items-start">
                <span class="d-inline-flex align-items-center justify-content-center rounded-circle me-3"
                      style="width:40px;height:40px;background:${bg};flex:0 0 auto;">
                  <i class="fas ${icon}" style="color:${fg};"></i>
                </span>
                <div class="flex-grow-1">
                  <h5 class="fw-bold mb-1">${title}</h5>
                  <div class="text-muted mb-0">${message}</div>
                </div>
              </div>
              <div class="d-flex justify-content-end gap-2 pt-4">
                <button type="button" class="btn btn-light" data-bs-dismiss="modal">${cancelText}</button>
                <button type="button" class="btn btn-${t === 'warn' ? 'warning' : t}" id="__confirmCenterOk">${confirmText}</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modalEl);

      const bsModal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: true });

      // OK
      modalEl.querySelector('#__confirmCenterOk').addEventListener('click', () => {
        resolve(true);
        bsModal.hide();
      });

      // Đóng = cancel
      modalEl.addEventListener('hidden.bs.modal', () => {
        resolve(false);
        modalEl.remove();
      });

      bsModal.show();
    });
  };
})();

(function () {
  if (window.showCenterAlert) return;

  const TYPE_MAP = {
    success: {
      title: 'Thành công',
      icon: `<svg width="40" height="40" viewBox="0 0 20 20" aria-hidden="true">
               <circle cx="10" cy="10" r="9" fill="#2f6d2f"></circle>
               <path d="M6 10.3l2.3 2.5L14 7.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
             </svg>`
    },
    error: {
      title: 'Lỗi',
      icon: `<span class="d-inline-flex align-items-center justify-content-center rounded-circle"
                   style="width:40px;height:40px;background:var(--bs-danger-bg-subtle,#f8d7da);">
               <i class="fas fa-exclamation-triangle" style="color:var(--bs-danger,#dc3545);"></i>
             </span>`
    },
    warn: {
      title: 'Chú ý',
      icon: `<span class="d-inline-flex align-items-center justify-content-center rounded-circle"
                   style="width:40px;height:40px;background:var(--bs-warning-bg-subtle,#fff3cd);">
               <i class="fas fa-exclamation-circle" style="color:var(--bs-warning,#f0ad4e);"></i>
             </span>`
    },
    info: {
      title: 'Thông tin',
      icon: `<span class="d-inline-flex align-items-center justify-content-center rounded-circle"
                   style="width:40px;height:40px;background:var(--bs-info-bg-subtle,#cff4fc);">
               <i class="fas fa-info-circle" style="color:var(--bs-info,#5bc0de);"></i>
             </span>`
    }
  };

  window.showCenterAlert = function ({
    title,
    message = 'Đã xử lý.',
    okText = 'Đã hiểu',
    type = 'success'
  } = {}) {
    const t = TYPE_MAP[type] ? type : 'success';
    const finalTitle = title || TYPE_MAP[t].title;
    const icon = TYPE_MAP[t].icon;

    const modalEl = document.createElement('div');
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0" style="box-shadow:0 10px 30px rgba(0,0,0,.15);">
          <div class="modal-body text-center p-4">
            <div class="d-flex justify-content-center mb-2">${icon}</div>
            <h5 class="fw-bold mb-1">${finalTitle}</h5>
            <div class="text-muted mb-3">${message}</div>
            <button type="button" class="btn btn-dark px-4" data-bs-dismiss="modal">${okText}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);
    const bsModal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: true });
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
    bsModal.show();
  };

  // ---- Override showToast để dùng Center Alert (giữ tương thích code cũ) ----
  window.showToast = function (message = 'Thao tác thành công!', type = 'success') {
    window.showCenterAlert({
      message,
      type,
      // tiêu đề theo type nếu không truyền riêng
      title: TYPE_MAP[type]?.title || TYPE_MAP.success.title
    });
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  // ====== Elements ======
  const avatarInput    = document.getElementById('avatar-input');
  const avatarPreview  = document.getElementById('avatar-preview');
  const changeAvatarBtn= document.getElementById('change-avatar-btn');
  const deleteAvatarBtn= document.getElementById('delete-avatar-btn'); // <— NÚT XOÁ
  const profileForm    = document.getElementById('edit-profile-form');

  // fallback ảnh mặc định (nên set data-default-src trên <img>, không có thì dùng đường dẫn mặc định)
  const defaultAvatar  =
    (avatarPreview && avatarPreview.getAttribute('data-default-src')) ||
    '/static/image/avatar.png';

  // ====== Đổi ảnh (preview) ======
  if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener('click', () => avatarInput?.click());
  }

  if (avatarInput) {
    avatarInput.addEventListener('change', function () {
      const file = this.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (avatarPreview) avatarPreview.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ====== XOÁ ẢNH ======
  if (deleteAvatarBtn) {
    deleteAvatarBtn.addEventListener('click', async () => {
      // confirm đẹp nếu đã có confirmCenter, không thì confirm native
      const ok = window.confirmCenter
        ? await window.confirmCenter({
            title: 'Xác nhận xoá',
            message: 'Bạn có chắc muốn xoá ảnh đại diện hiện tại?',
            confirmText: 'Xoá ngay',
            cancelText: 'Hủy',
            type: 'danger'
          })
        : confirm('Bạn có chắc muốn xoá ảnh đại diện hiện tại?');
      if (!ok) return;

      const url = deleteAvatarBtn.dataset.deleteUrl || '/api/profile/avatar';

      try {
        const res = await fetch(url, { method: 'DELETE' });
        if (!res.ok && res.status !== 204) {
          // cố gắng đọc lỗi JSON nếu có
          let errMsg = 'Không thể xoá ảnh đại diện.';
          try {
            const j = await res.json();
            if (j?.error) errMsg = j.error;
          } catch (_) {}
          throw new Error(errMsg);
        }

        // reset preview + navbar và bust cache
        const bust = Date.now();
        if (avatarPreview) avatarPreview.src = `${defaultAvatar}?t=${bust}`;
        const navbarAvatar = document.getElementById('navbar-avatar');
        if (navbarAvatar) navbarAvatar.src = `${defaultAvatar}?t=${bust}`;

        // clear input file nếu có
        if (avatarInput) avatarInput.value = '';

        showToast('Đã xoá ảnh đại diện!', 'success');
      } catch (err) {
        showToast(err.message || 'Lỗi xoá ảnh đại diện.', 'error');
      }
    });
  }

  // ====== Lưu hồ sơ (AJAX) ======
  if (profileForm) {
    profileForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      const submitButton = this.querySelector('button[type="submit"]');
      const originalButtonHtml = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Đang lưu...`;

      const formData = new FormData(this);

      try {
        const response = await fetch('/profile/update', {
          method: 'POST',
          body: formData
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Lỗi không xác định.');
        }

        showToast(result.message || 'Cập nhật thông tin thành công!');

        // nếu server trả avatar_url mới thì cập nhật luôn navbar
        if (result?.user?.avatar_url) {
          const navbarAvatar = document.getElementById('navbar-avatar');
          if (navbarAvatar) {
            navbarAvatar.src = `/user_data/${result.user.avatar_url}?t=${Date.now()}`;
          }
        }

        setTimeout(() => (window.location.href = '/'), 1500);
      } catch (error) {
        showToast(error.message, 'error');
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonHtml;
      }
    });
  }
});
