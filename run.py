# run.py
import threading
import time
import webbrowser
from app import app, get_ip_address # Import app từ file app.py của bạn
from waitress import serve

# --- CẤU HÌNH ---
HOST = '0.0.0.0'
PORT = 5000 # Hoặc port bạn đã dùng, ví dụ 8080

# --- CÁC HÀM CHỨC NĂNG ---

def start_server():
    """Hàm này sẽ chạy server Waitress."""
    # Chúng ta dùng waitress.serve thay vì app.run để triển khai thực tế
    serve(app, host=HOST, port=PORT, threads=8)

def open_browser():
    """Hàm này sẽ mở trình duyệt sau khi server đã sẵn sàng."""
    # Lấy địa chỉ IP cục bộ để mở cho đúng
    ip_address = get_ip_address()
    if ip_address == '127.0.0.1':
        url = f"http://localhost:{PORT}"
    else:
        # Mở bằng IP mạng nội bộ nếu có
        url = f"http://{ip_address}:{PORT}"
    
    print(f"Server đã sẵn sàng. Đang mở trình duyệt tại: {url}")
    webbrowser.open_new(url)

# --- KHỐI LỆNH CHÍNH ---

if __name__ == '__main__':
    # Chạy server trong một luồng (thread) riêng
    # Điều này rất quan trọng để server không "block" việc mở trình duyệt
    server_thread = threading.Thread(target=start_server)
    server_thread.daemon = True
    server_thread.start()

    # Đợi 1-2 giây để server có thời gian khởi động
    time.sleep(2)

    # Mở trình duyệt
    open_browser()
    
    # Giữ cho kịch bản chính chạy để server thread không bị tắt (trên một số hệ thống)
    # Người dùng có thể đóng cửa sổ console này để tắt server.
    print("Server đang chạy. Đóng cửa sổ này để tắt ứng dụng.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Đang tắt ứng dụng...")