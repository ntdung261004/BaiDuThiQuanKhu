// ======= GLOBAL TOAST =======
window.showToast = function (message = "Thao tác thành công!", type = "success") {
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
      pointerEvents: "none",
    });
    document.body.appendChild(container);
  }

  const colors = {
    success: "#2f6d2f",
    error: "#d9534f",
    warn: "#f0ad4e",
    info: "#5bc0de",
  };
  const color = colors[type] || colors.success;

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
    transition: "opacity .35s ease, transform .35s ease",
  });

  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="9" fill="${color}"></circle>
      <path d="M6 10.3l2.3 2.5L14 7.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div style="flex:1;font-size:15px;">${message}</div>
    <button style="background:transparent;border:none;font-size:18px;color:#777;cursor:pointer;">×</button>
  `;
  toast.querySelector("button").onclick = () => toast.remove();
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px)";
    setTimeout(() => toast.remove(), 250);
  }, 3000);
};

// ======= GLOBAL CONFIRM =======
window.confirmCenter = async function ({
  title = "Xác nhận",
  message = "Bạn có chắc chắn không?",
  confirmText = "Đồng ý",
  cancelText = "Hủy",
  type = "danger",
} = {}) {
  return new Promise((resolve) => {
    const modalEl = document.createElement("div");
    modalEl.className = "modal fade";
    modalEl.tabIndex = -1;
    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow">
          <div class="modal-header">
            <h5 class="modal-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">${message}</div>
          <div class="modal-footer">
            <button class="btn btn-light" data-bs-dismiss="modal">${cancelText}</button>
            <button class="btn btn-${type}" id="confirmOk">${confirmText}</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modalEl);
    const bsModal = new bootstrap.Modal(modalEl);
    modalEl.querySelector("#confirmOk").onclick = () => {
      resolve(true);
      bsModal.hide();
    };
    modalEl.addEventListener("hidden.bs.modal", () => {
      resolve(false);
      modalEl.remove();
    });
    bsModal.show();
  });
};

// ======= MAIN SOLDIER SCRIPT =======
document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("soldier-tbody");
  const pagination = document.getElementById("pagination-controls");
  const soldierCount = document.getElementById("soldier-count");
  const loadingSpinner = document.getElementById("loading-spinner");
  const filterForm = document.getElementById("filter-form");
  const filterUnitSelect = document.getElementById("filter-unit");
  const addModal = document.getElementById("addSoldierModal");
  const editModal = document.getElementById("editSoldierModal");

  let currentPage = 1;
  let currentSortBy = "created_at";
  let currentSortOrder = "desc";
  let currentSoldierId = null;

  async function loadSoldiers(page = 1) {
    tbody.innerHTML = "";
    loadingSpinner.style.display = "block";

    const search = filterForm.querySelector('input[name="search"]').value || "";
    const unit = filterUnitSelect.querySelector(".selected").dataset.value || "";

    try {
      const url = new URL(window.SOLDIER_API.list, window.location.origin);
      url.searchParams.set("page", page);
      url.searchParams.set("search", search);
      url.searchParams.set("unit", unit);
      url.searchParams.set("sort_by", currentSortBy);
      url.searchParams.set("sort_order", currentSortOrder);

      const res = await fetch(url);
      const data = await res.json();
      loadingSpinner.style.display = "none";

      if (!data.soldiers?.length) {
        tbody.innerHTML = `
          <tr><td colspan="6" class="text-center py-5 text-muted">
            <i class="fas fa-users-slash fa-3x mb-3"></i>
            <h5>Không có chiến sĩ nào phù hợp</h5>
          </td></tr>`;
        pagination.innerHTML = "";
        soldierCount.textContent = "0";
        return;
      }

      const startIndex = (data.pagination.page - 1) * data.pagination.per_page;
      tbody.innerHTML = data.soldiers
        .map(
          (s, i) => `
        <tr data-id="${s.id}">
          <td>${startIndex + i + 1}</td>
          <td>${s.name}</td>
          <td>${s.unit || "-"}</td>
          <td>${s.rank || "-"}</td>
          <td>${s.notes || "-"}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary btn-edit"><i class="fas fa-edit"></i></button>
            <a href="${window.SOLDIER_API.report_template.replace(/0$/, s.id)}" class="btn btn-sm btn-outline-success"><i class="fas fa-chart-bar"></i></a>
            <button class="btn btn-sm btn-outline-danger btn-delete"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`
        )
        .join("");

      renderPagination(data.pagination);
      soldierCount.textContent = data.pagination.total_items;
    } catch (err) {
      loadingSpinner.style.display = "none";
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>`;
      console.error(err);
    }
  }

  function renderPagination(p) {
    pagination.innerHTML = "";
    if (p.total_pages <= 1) return;
    pagination.innerHTML += `<li class="page-item ${p.has_prev ? "" : "disabled"}"><a class="page-link" href="#" data-page="${p.page - 1}">Trước</a></li>`;
    for (let i = 1; i <= p.total_pages; i++) {
      pagination.innerHTML += `<li class="page-item ${i === p.page ? "active" : ""}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    pagination.innerHTML += `<li class="page-item ${p.has_next ? "" : "disabled"}"><a class="page-link" href="#" data-page="${p.page + 1}">Sau</a></li>`;
  }

  pagination.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-page]");
    if (!a) return;
    e.preventDefault();
    loadSoldiers(Number(a.dataset.page));
  });

  // ===== CUSTOM SELECT =====
  document.querySelectorAll(".custom-select").forEach((select) => {
    const selected = select.querySelector(".selected");
    const options = select.querySelector(".options");
    selected.addEventListener("click", () => {
      document.querySelectorAll(".custom-select").forEach((s) => s.classList.remove("active"));
      select.classList.toggle("active");
    });
    options.querySelectorAll("div").forEach((opt) => {
      opt.addEventListener("click", () => {
        selected.textContent = opt.textContent;
        selected.dataset.value = opt.dataset.value;
        select.classList.remove("active");
        loadSoldiers();
      });
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".custom-select")) {
      document.querySelectorAll(".custom-select").forEach((s) => s.classList.remove("active"));
    }
  });

  filterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    loadSoldiers(1);
  });

  // ===== INIT =====
  loadSoldiers();
});
