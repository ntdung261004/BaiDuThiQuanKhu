document.addEventListener("DOMContentLoaded", function() {

    // 1. Chức năng Toggle Sidebar
    // (Đảm bảo nó hoạt động độc lập trên trang này)
    var el = document.getElementById("wrapper");
    var toggleButton = document.getElementById("menu-toggle");

    if (toggleButton) {
        toggleButton.onclick = function () {
            el.classList.toggle("toggled");
        };
    }

    // 2. Kích hoạt hiệu ứng Fade-in khi cuộn
    const targets = document.querySelectorAll('.fade-in');
    
    // Lấy vùng chứa cuộn (container) của trang
    const scrollContainer = document.getElementById('page-content-wrapper');

    const options = {
        // Rất quan trọng: Phải theo dõi sự cuộn bên trong #page-content-wrapper
        // chứ không phải 'document' hay 'window'
        root: scrollContainer, 
        rootMargin: '0px',
        threshold: 0.2 // Kích hoạt khi 20% phần tử xuất hiện
    };

    const callback = (entries, observer) => {
        entries.forEach(entry => {
            // entry.isIntersecting: kiểm tra xem phần tử có trong tầm nhìn không
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); // Kích hoạt 1 lần rồi dừng theo dõi
            }
        });
    };

    // Tạo đối tượng theo dõi
    const observer = new IntersectionObserver(callback, options);

    // Bắt đầu theo dõi tất cả các phần tử có lớp .fade-in
    targets.forEach(target => {
        observer.observe(target);
    });

    // 3. Kích hoạt ngay lập tức cho Slide đầu tiên (Hero-slide)
    // Vì slide này đã hiển thị ngay từ đầu
    const firstSlideContent = document.querySelector('.hero-slide .fade-in');
    if (firstSlideContent) {
        // Thêm 1 chút delay nhỏ để tạo cảm giác mượt mà khi tải trang
        setTimeout(() => {
            firstSlideContent.classList.add('is-visible');
        }, 300); 
    }
});