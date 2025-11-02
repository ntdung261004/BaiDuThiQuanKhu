// === NAV.JS - QUẢN LÝ SIDEBAR + SPA + LOADER ===
(() => {
  if (window.__wiredNav) return;
  window.__wiredNav = true;

  // -------- CONFIG (điều chỉnh tại đây) --------
  const MIN_BOOT_SHOW   = 1200; // ms - loader tối thiểu khi tải trang (reload/open)
  const MIN_SPA_SHOW    = 1200; // ms - loader tối thiểu khi điều hướng nội bộ (SPA)
  const HARD_LINK_DELAY = 800;  // ms - trễ trước khi rời trang thật (data-spa="off")
  const LOADER_FUSE_MS  = 6000; // ms - cầu chì auto-tắt nếu có sự cố
  const FADE_IN_MS      = 600;  // ms - thời gian fade-in content sau SPA
  const FADE_OUT_MS     = 600;  // ms - thời gian chờ nhẹ trước khi fetch SPA

  const sb      = document.getElementById("sidebar-wrapper");
  const content = document.getElementById("page-content-wrapper");
  const loader  = document.getElementById("loader-overlay");
  const links   = document.querySelectorAll("#sidebar-menu a.list-group-item-action");
  if (!sb || !loader) return;

  // ===== BOOT LOADER (hiện ít nhất MIN_BOOT_SHOW khi reload/open) =====
  let bootStart = performance.now();
  loader.classList.add("active");
  window.addEventListener("load", () => {
    const elapsed = performance.now() - bootStart;
    const wait = Math.max(0, MIN_BOOT_SHOW - elapsed);
    setTimeout(() => loader.classList.remove("active"), wait);
  });

  // --- Sidebar hover show / hide ---
  let closeTimer = null;
  const openSidebar = () => { clearTimeout(closeTimer); document.body.classList.add("sb-open"); };
  const closeSidebar = () => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => document.body.classList.remove("sb-open", "sb-lock"), 120);
  };
  sb.addEventListener("mouseenter", openSidebar);
  sb.addEventListener("mouseleave", closeSidebar);

  // --- Giữ sidebar mở khi click ---
  document.querySelectorAll("#sidebar-menu a").forEach(a => {
    a.addEventListener("mousedown", () => {
      localStorage.setItem("sidebarKeepOpen", "true");
      localStorage.setItem("sidebarLocked", "true");
      document.body.classList.add("sb-open", "sb-lock");
    });
  });
  if (localStorage.getItem("sidebarKeepOpen") === "true") {
    document.body.classList.add("sb-open");
    if (localStorage.getItem("sidebarLocked") === "true") document.body.classList.add("sb-lock");
  }

  // --- Loader helpers ---
  let navigating = false;
  let navCtrl = null;
  let fuseId = null;
  let spaStart = 0;

  const turnOnLoader = () => {
    loader.classList.add("active");
    clearTimeout(fuseId);
    fuseId = setTimeout(() => loader.classList.remove("active"), LOADER_FUSE_MS);
  };
  const turnOffLoaderMin = (minMs) => {
    const elapsed = performance.now() - spaStart;
    const wait = Math.max(0, minMs - elapsed);
    setTimeout(() => {
      clearTimeout(fuseId);
      loader.classList.remove("active");
    }, wait);
  };

  // --- beforeunload / pageshow (trường hợp back-from-cache) ---
  window.addEventListener("beforeunload", () => loader.classList.add("active"));
  window.addEventListener("pageshow", (ev) => { if (ev.persisted) loader.classList.remove("active"); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !navigating) loader.classList.remove("active");
  });

  // --- Hard links (data-spa="off") -> hiện loader rồi đi thật sau HARD_LINK_DELAY ---
  document.querySelectorAll('#sidebar-menu a[data-spa="off"]').forEach(a => {
    a.addEventListener("click", e => {
      if (a.target === "_blank") return;
      e.preventDefault();
      loader.classList.add("active");
      requestAnimationFrame(() => setTimeout(() => location.href = a.href, HARD_LINK_DELAY));
    }, { capture: true });
  });

  // --- SPA navigation ---
  const sameOrigin = (href) => {
    try { return new URL(href, location.origin).origin === location.origin; }
    catch { return false; }
  };
  const setActive = (path) => {
    links.forEach(a => {
      const href = a.getAttribute("href"); if (!href) return;
      const u = new URL(href, location.origin);
      a.classList.toggle("active", u.pathname === path);
    });
  };
  const pickContentHTML = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const fresh = doc.querySelector("#page-content-wrapper");
    return fresh ? fresh.innerHTML : html;
  };
  const updateTitle = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const t = doc.querySelector("title");
    if (t) document.title = t.textContent.trim();
  };

  async function navigate(href, push = true) {
    if (!content) { location.href = href; return; }
    if (navigating && navCtrl) { try { navCtrl.abort(); } catch{} }

    navCtrl = new AbortController();
    navigating = true;
    spaStart  = performance.now();

    try {
      content.style.opacity = "0";
      turnOnLoader();
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, FADE_OUT_MS));

      const res = await fetch(href, { headers: { "X-Requested-With": "fetch" }, signal: navCtrl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const html = await res.text();

      content.innerHTML = pickContentHTML(html);
      updateTitle(html);
      if (push) history.pushState({ spa: true, href }, "", href);
      setActive(new URL(href, location.origin).pathname);

      requestAnimationFrame(() => {
        content.style.transition = `opacity ${FADE_IN_MS}ms ease`;
        content.style.opacity = "1";
      });
    } catch (e) {
      if (e.name !== "AbortError") location.href = href;
    } finally {
      navigating = false;
      // đảm bảo loader hiện tối thiểu MIN_SPA_SHOW cho mỗi lần SPA
      turnOffLoaderMin(MIN_SPA_SHOW);
    }
  }

  // Click nội bộ
  links.forEach(a => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || a.dataset.spa === "off" || a.target === "_blank" || !sameOrigin(href)) return;
      e.preventDefault();
      navigate(href, true);
    });
  });

  // Back/forward
  window.addEventListener("popstate", () => {
    const current = location.pathname;
    const active = document.querySelector("#sidebar-menu a.active");
    if (active && new URL(active.href, location.origin).pathname === current) {
      loader.classList.remove("active");
      return;
    }
    navigate(location.href, false);
  });

  // Init
  setActive(location.pathname);
})();
