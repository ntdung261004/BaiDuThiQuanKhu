// static/js/profile.js
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