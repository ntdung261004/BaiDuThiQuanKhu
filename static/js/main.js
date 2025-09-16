// static/js/main.js

// Hàm helper để hiển thị Toast, có thể được gọi từ bất kỳ đâu trong dự án
function showToast(message, type = 'success') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        console.error('Toast container not found!');
        return;
    }

    // Xác định icon và màu sắc dựa trên loại toast
    const icon = type === 'success' 
        ? '<i class="fas fa-check-circle text-success me-2"></i>' 
        : '<i class="fas fa-exclamation-circle text-danger me-2"></i>';
    
    // Tùy chỉnh màu nền cho toast
    const bgColor = type === 'success' ? 'bg-light' : 'bg-danger';
    const textColor = type === 'success' ? 'text-dark' : 'text-white';
    const btnCloseColor = type === 'success' ? '' : 'btn-close-white';

    const toastHtml = `
        <div class="toast align-items-center ${textColor} ${bgColor} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${icon}
                    ${message}
                </div>
                <button type="button" class="btn-close ${btnCloseColor} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    // Thêm toast vào vùng chứa và hiển thị nó
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const newToastEl = toastContainer.lastElementChild;
    const newToast = new bootstrap.Toast(newToastEl, { delay: 3000 }); // Tự động ẩn sau 3 giây
    newToast.show();

    // Tự động xóa toast khỏi DOM sau khi nó đã ẩn
    newToastEl.addEventListener('hidden.bs.toast', () => {
        newToastEl.remove();
    });
}

// === BẮT ĐẦU PHẦN TÁI CẤU TRÚC LOGIC POPUP ===

// Hàm riêng để xử lý việc hiển thị modal
function handleProfileUpdateModal() {
    const body = document.body;
    const profileIncomplete = body.dataset.profileIncomplete === 'True';
    const updateProfileModalEl = document.getElementById('updateProfileModal');

    if (profileIncomplete && updateProfileModalEl) {
        const updateModal = new bootstrap.Modal(updateProfileModalEl, {
            backdrop: 'static', // Đảm bảo không thể đóng khi click ra ngoài
            keyboard: false // Đảm bảo không thể đóng bằng phím Esc
        });
        updateModal.show();
    }
}

// Hàm riêng để xử lý sự kiện submit của form
function handleProfileFormSubmit() {
    const updateForm = document.getElementById('update-profile-form');
    if (!updateForm) return;

    const submitButton = updateForm.closest('.modal-content').querySelector('button[type="submit"]');
    const alertContainer = document.getElementById('profile-update-alert-container');

    updateForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Ngăn form tự gửi đi

        alertContainer.innerHTML = '';
        alertContainer.classList.add('d-none');
        
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Đang xử lý...`;

        const formData = new FormData(updateForm);

        try {
            const response = await fetch(updateForm.action, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Lỗi không xác định.');
            }

            showToast(result.message);
            setTimeout(() => {
                window.location.reload();
            }, 1500); // Giảm thời gian chờ

        } catch (error) {
            alertContainer.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            alertContainer.classList.remove('d-none');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
}

// Chạy các hàm khi trang đã tải xong
document.addEventListener('DOMContentLoaded', function() {
    handleProfileUpdateModal();
    handleProfileFormSubmit();
});