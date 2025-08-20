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