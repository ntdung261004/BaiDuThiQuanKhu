// static/js/profile.js
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
}
document.addEventListener('DOMContentLoaded', function() {
    // Các element chỉ tồn tại trên trang profile
    const avatarInput = document.getElementById('avatar-input');
    const avatarPreview = document.getElementById('avatar-preview');
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const profileForm = document.getElementById('edit-profile-form');
    
    // Logic xem trước ảnh đại diện
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', () => avatarInput.click());
    }

    if (avatarInput) {
        avatarInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    avatarPreview.src = e.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // Logic gửi form bằng AJAX
    if (profileForm) {
        profileForm.addEventListener('submit', async function(event) {
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
                
                // Hiển thị thông báo thành công
                showToast(result.message);

                // === THÊM MỚI: CHUYỂN HƯỚNG VỀ TRANG CHỦ ===
                setTimeout(() => {
                    // Sử dụng url_for('index') đã được định nghĩa ở đâu đó hoặc '/'
                    window.location.href = '/'; 
                }, 1500); // Chờ 1.5 giây để người dùng đọc thông báo

            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                // === KHÔI PHỤC LẠI KHỐI FINALLY ===
                // Khối này sẽ LUÔN LUÔN chạy, dù có lỗi hay không
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonHtml;
            }
        });
    }
});