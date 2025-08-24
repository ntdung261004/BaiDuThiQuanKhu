# controllers/pi_controller.py

from flask import Blueprint, request, jsonify, Response
import queue
import threading
import time
import base64
import os

from models import db, Shot

# Tạo một Blueprint mới cho các chức năng liên quan đến Pi
pi_bp = Blueprint('pi_bp', __name__)

# --- Các biến trạng thái sẽ được quản lý trong blueprint này ---
COMMAND_QUEUE = queue.Queue(maxsize=10)
pi_connected = False
last_heartbeat = 0
CURRENT_PI_CONFIG = {'zoom': 1.0, 'center': None}
latest_processed_data = {
    'time': '--:--:--', 'target': 'Chưa có kết quả', 'score': '--.-',
    'image_data': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
}

# --- Lớp quản lý Livestream ---
class LivestreamManager:
    def __init__(self):
        self.frame = None
        self.lock = threading.Lock()
    def update_frame(self, frame):
        with self.lock:
            self.frame = frame
    def generate_frames_for_client(self):
        while True:
            with self.lock:
                if self.frame is None:
                    time.sleep(0.1)
                    continue
                frame_to_send = self.frame
            try:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_to_send + b'\r\n')
                time.sleep(1/30)
            except GeneratorExit:
                return

livestream_manager = LivestreamManager()

# --- Các API giao tiếp với Pi và Frontend ---

@pi_bp.route('/video_upload', methods=['POST'])
def video_upload():
    global pi_connected, last_heartbeat
    livestream_manager.update_frame(request.data)
    last_heartbeat = time.time()
    pi_connected = True
    return ('', 204)

# <<< SỬA ĐỔI HOÀN TOÀN HÀM NÀY >>>
@pi_bp.route('/processed_data_upload', methods=['POST'])
def processed_data_upload():
    global latest_processed_data
    data = request.get_json()
    
    if not data:
        return jsonify({'status': 'error', 'message': 'Invalid data'}), 400

    # Cập nhật dữ liệu tạm thời để hiển thị ngay lập tức trên giao diện
    latest_processed_data.update(data)
    
    # Logic lưu vào database
    if 'active_session_id' in session and 'active_soldier_id' in session:
        try:
            # -- Bước 1: Xử lý và lưu file ảnh kết quả --
            image_data = data.get('image_data')
            image_path = None
            if image_data:
                # Tạo thư mục lưu trữ nếu chưa có
                output_dir = os.path.join('static', 'shot_results')
                os.makedirs(output_dir, exist_ok=True)
                
                # Tạo tên file duy nhất
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                filename = f"session_{session['active_session_id']}_soldier_{session['active_soldier_id']}_{timestamp}.jpg"
                image_path = os.path.join(output_dir, filename)
                
                # Giải mã base64 và lưu file
                with open(image_path, "wb") as f:
                    f.write(base64.b64decode(image_data))
                
                # Cập nhật lại đường dẫn để client có thể truy cập
                # Ví dụ: static/shot_results/file.jpg -> /static/shot_results/file.jpg
                image_path = image_path.replace(os.path.sep, '/')


            # -- Bước 2: Tạo đối tượng Shot mới với đầy đủ thông tin --
            new_shot = Shot(
                session_id=session['active_session_id'],
                soldier_id=session['active_soldier_id'],
                score=data.get('score', 0),
                target_name=data.get('target', 'Không xác định'),
                # Giả sử Pi sẽ gửi về tọa độ điểm chạm trong tương lai
                hit_location_x=data.get('hit_location_x'),
                hit_location_y=data.get('hit_location_y'),
                result_image_path=image_path # Lưu đường dẫn file ảnh
            )
            
            # -- Bước 3: Lưu vào database --
            db.session.add(new_shot)
            db.session.commit()
            print(f"💾 Đã lưu lần bắn vào database cho session {session['active_session_id']}")

        except Exception as e:
            db.session.rollback()
            print(f"❌ Lỗi khi lưu lần bắn vào database: {e}")

    return jsonify({'status': 'success'})

# <<< THÊM LẠI: Route để trình duyệt lấy dữ liệu mới nhất >>>
@pi_bp.route('/data_feed')
def data_feed():
    return jsonify(latest_processed_data)


@pi_bp.route('/connection-status')
def connection_status():
    global pi_connected, last_heartbeat
    if time.time() - last_heartbeat > 5:
        pi_connected = False
    return jsonify({'status': 'connected' if pi_connected else 'disconnected'})

@pi_bp.route('/video_feed')
def video_feed():
    if not pi_connected:
        return Response("<h1>Thiết bị không kết nối</h1>", mimetype='text/html')
    return Response(livestream_manager.generate_frames_for_client(), mimetype='multipart/x-mixed-replace; boundary=frame')

@pi_bp.route('/report_config', methods=['POST'])
def report_config():
    global CURRENT_PI_CONFIG
    data = request.get_json()
    if data:
        CURRENT_PI_CONFIG.update(data)
        return jsonify({'status': 'success'})
    return jsonify({'status': 'error'}), 400

@pi_bp.route('/get_current_config')
def get_current_config():
    return jsonify(CURRENT_PI_CONFIG)

@pi_bp.route('/set_zoom', methods=['POST'])
def set_zoom():
    data = request.get_json()
    zoom_level = data.get('zoom')
    if zoom_level:
        command = {'type': 'zoom', 'value': zoom_level}
        try:
            COMMAND_QUEUE.put_nowait(command)
            return jsonify({'status': 'success'})
        except queue.Full:
            return jsonify({'status': 'error', 'message': 'Hàng đợi lệnh đang đầy.'}), 503
    return jsonify({'status': 'error', 'message': 'Dữ liệu không hợp lệ.'}), 400
    
@pi_bp.route('/set_center', methods=['POST'])
def set_center():
    data = request.get_json()
    center_coords = data.get('center')
    if center_coords and 'x' in center_coords and 'y' in center_coords:
        command = {'type': 'center', 'value': center_coords}
        try:
            COMMAND_QUEUE.put_nowait(command)
            return jsonify({'status': 'success'})
        except queue.Full:
            return jsonify({'status': 'error', 'message': 'Hàng đợi lệnh đang đầy.'}), 503
    return jsonify({'status': 'error', 'message': 'Dữ liệu không hợp lệ.'}), 400

# <<< SỬA ĐỔI HOÀN TOÀN HÀM NÀY >>>
@pi_bp.route('/get_command')
def get_command():
    response_data = {
        'command': None,
        'timestamp': time.time() # Luôn trả về timestamp hiện tại của server
    }
    try:
        # Lấy lệnh từ hàng đợi nếu có
        command = COMMAND_QUEUE.get_nowait()
        response_data['command'] = command
    except queue.Empty:
        # Nếu không có lệnh, 'command' sẽ vẫn là None
        pass
    
    return jsonify(response_data)