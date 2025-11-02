
document.addEventListener("DOMContentLoaded", () => {
  const qa   = document.querySelector(".quick-actions");
  const btn  = document.getElementById("toggleActions");
  const menu = qa?.querySelector(".quick-menu");
  if (!qa || !btn || !menu) return;

  // Đưa ra body 1 lần (portal)
  if (!menu.dataset.portal) {
    document.body.appendChild(menu);
    menu.dataset.portal = "1";
    menu.style.position = "fixed"; // rất quan trọng
  }

  function placeMenu() {
    const r = btn.getBoundingClientRect();
    menu.style.left = r.right + "px";          // bám mép phải nút
    menu.style.top  = (r.bottom + 8) + "px";   // ngay dưới nút 8px
  }

  function openMenu() {
    placeMenu();
    // đảm bảo không có style.display block/none cũ
    menu.classList.add("on");
  }
  function closeMenu() {
    menu.classList.remove("on");
  }

  // Toggle
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu.classList.contains("on")) closeMenu(); else openMenu();
  });

  // Đóng khi click ra ngoài
  document.addEventListener("click", (e) => {
    if (!menu.classList.contains("on")) return;
    if (e.target !== btn && !menu.contains(e.target)) closeMenu();
  });

  // Cập nhật vị trí khi scroll/resize (menu đang mở)
  ["scroll","resize"].forEach(ev =>
    window.addEventListener(ev, () => { if (menu.classList.contains("on")) placeMenu(); })
  );

  // ESC để đóng
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
});







document.addEventListener("DOMContentLoaded", () => {
  const boxes = document.querySelectorAll(".feature-box, .zoom-in, .slide-in-left, .slide-in-right, .fade-up");

  const reveal = () => {
    boxes.forEach(box => {
      const rect = box.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight - 80 && rect.bottom > 0;
      if (isVisible) {
        box.classList.add("show");
      } else {
        box.classList.remove("show");
      }
    });
  };

  // Lắng nghe cuộn và resize
  window.addEventListener("scroll", reveal);
  window.addEventListener("resize", reveal);
  reveal(); // chạy ban đầu
});

 document.getElementById("scrollBtn").addEventListener("click", function (e) {
    e.preventDefault();
    document.querySelector("#scroll").scrollIntoView({ behavior: "smooth" });
  });
  // === Scroll reveal cho các section mới ===
document.addEventListener("DOMContentLoaded", () => {
  const wowEls = document.querySelectorAll(".wow-fadeIn, .card-tilt");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) en.target.classList.add("show");
      else en.target.classList.remove("show"); // muốn chạy lại khi lướt qua lướt lại
    });
  }, { threshold: 0.15 });
  wowEls.forEach(el => io.observe(el));

  // Tilt rất nhẹ theo chuột (không ảnh hưởng layout)
  document.querySelectorAll(".card-tilt").forEach(card => {
    let raf;
    card.addEventListener("mousemove", (e) => {
      cancelAnimationFrame(raf);
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top)  / r.height - .5;
      raf = requestAnimationFrame(() => {
        card.style.transform = `rotateX(${ -y*4 }deg) rotateY(${ x*6 }deg) translateY(-4px)`;
      });
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
});


