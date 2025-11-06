// static/js/guide.js
document.addEventListener('DOMContentLoaded', () => {
  // ====== PHẦN 1: SLIDE BẰNG PHÍM ======
  const scrollContainer = document.getElementById('page-content-wrapper') || window; // container chính
  const slides = Array.from(document.querySelectorAll('section.slide'));
  if (slides.length) {
    const TOP_OFFSET = 70; // chừa chỗ topbar
    let currentIndex = 0;

    // tính top của slide so với container
    function getSlideTopInsideContainer(slide) {
      const slideRect = slide.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      // vị trí của slide trong container + scroll hiện tại - offset
      return (slideRect.top - containerRect.top) + scrollContainer.scrollTop - TOP_OFFSET;
    }

    function scrollToSlide(index) {
      if (index < 0 || index >= slides.length) return;
      currentIndex = index;

      const targetTop = getSlideTopInsideContainer(slides[index]);

      scrollContainer.scrollTo({
        top: targetTop,
        behavior: 'smooth'
      });

      // highlight slide hiện tại (nếu muốn xài CSS .active-slide)
      slides.forEach((s, i) => s.classList.toggle('active-slide', i === index));
    }

    // vào trang tự về slide đầu
    scrollToSlide(0);

    // bắt phím
    document.addEventListener('keydown', (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        scrollToSlide(Math.min(currentIndex + 1, slides.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        scrollToSlide(Math.max(currentIndex - 1, 0));
      }
    });

    // khi user tự scroll thì xác định lại đang ở slide nào
    let scrollTimer = null;
    scrollContainer.addEventListener('scroll', () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const scTop = scrollContainer.scrollTop;
        let closest = 0;
        let minDiff = Infinity;

        slides.forEach((s, i) => {
          // vị trí "chuẩn" của slide trong container
          const slideTop = getSlideTopInsideContainer(s) + TOP_OFFSET; // + lại offset để so
          const diff = Math.abs(slideTop - scTop);
          if (diff < minDiff) {
            minDiff = diff;
            closest = i;
          }
        });

        currentIndex = closest;
      }, 120);
    });
  }

  // ====== PHẦN 2: TOGGLE SIDEBAR ======
  const wrapper = document.getElementById("wrapper");
  const toggleButton = document.getElementById("menu-toggle");
  if (toggleButton && wrapper) {
    toggleButton.onclick = function () {
      wrapper.classList.toggle("toggled");
    };
  }

  // ====== PHẦN 3: FADE-IN THEO VIEWPORT CỦA CONTAINER ======
  const targets = document.querySelectorAll('.fade-in');
  const options = {
    root: scrollContainer, // theo dõi scroll của container
    rootMargin: '0px',
    threshold: 0.2
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, options);

  targets.forEach(t => observer.observe(t));

  // slide đầu hiển thị ngay
  const firstSlideContent = document.querySelector('.hero-slide .fade-in');
  if (firstSlideContent) {
    setTimeout(() => {
      firstSlideContent.classList.add('is-visible');
    }, 300);
  }
});
