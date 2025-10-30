import requests
import time

# URL cần kiểm tra (đảm bảo IP này chính xác)
PI_STREAM_URL = "http://192.168.1.207:8000/stream.mjpg"

print(f"--- Bắt đầu kiểm tra kết nối đến Pi ---")
print(f"URL: {PI_STREAM_URL}\n")

try:
    # Giả lập lại chính xác yêu cầu mà server Flask đang thực hiện
    print("Đang thử kết nối (timeout sau 5 giây)...")
    start_time = time.time()

    # Dùng stream=True để không tải toàn bộ video về
    response = requests.get(PI_STREAM_URL, stream=True, timeout=5)

    end_time = time.time()
    duration = end_time - start_time

    print(f"\n--- KẾT QUẢ ---")
    print(f"✅ THÀNH CÔNG! Kết nối được thiết lập sau {duration:.2f} giây.")
    print(f"Mã trạng thái (Status Code): {response.status_code}")
    print(f"Loại nội dung (Content-Type): {response.headers.get('content-type')}")

    # Đọc một vài byte đầu tiên để chắc chắn có dữ liệu
    first_chunk = next(response.iter_content(chunk_size=128))
    print(f"Đã nhận được {len(first_chunk)} bytes dữ liệu đầu tiên từ stream.")

except requests.exceptions.RequestException as e:
    print(f"\n--- KẾT QUẢ ---")
    print(f"❌ THẤT BẠI! Không thể kết nối đến Pi.")
    print(f"Lỗi chi tiết: {e}")

print("\n--- Kiểm tra hoàn tất ---")