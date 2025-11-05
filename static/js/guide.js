document.addEventListener("DOMContentLoaded", function() {
    // 1. Lấy khung cuộn chính
    // Vì layout của bạn dùng #page-content-wrapper để cuộn,
    // chúng ta cần theo dõi cuộn BÊN TRONG nó, không phải <body>
    const scrollContainer = document.getElementById("page-content-wrapper");

    // 2. Tìm tất cả các phần tử cần làm động
    const targets = document.querySelectorAll(".fade-in");

    // 3. Cài đặt Intersection Observer
    // Nó sẽ theo dõi khi nào một phần tử đi vào khung nhìn (viewport)
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            // Khi phần tử xuất hiện trong khung nhìn
            if (entry.isIntersecting) {
                // Thêm class 'is-visible' để kích hoạt CSS transition
                entry.target.classList.add("is-visible");
                
                // Ngừng theo dõi phần tử này để tiết kiệm tài nguyên
                observer.unobserve(entry.target);
            }
        });
    }, {
        // root: theo dõi cuộn bên trong scrollContainer
        root: scrollContainer,
        // rootMargin: Kích hoạt sớm hơn 50px trước khi nó vào màn hình
        rootMargin: "0px 0px -50px 0px",
        threshold: 0.1 // Kích hoạt khi 10% phần tử hiện ra
    });

    // 4. Bắt đầu theo dõi tất cả các phần tử
    targets.forEach(target => {
        observer.observe(target);
    });
});