# controllers/pi_controller.py

from flask import Blueprint, request, jsonify, Response, session
import queue
import threading
import time
import base64
import os
import cloudinary
import cloudinary.uploader

from datetime import datetime
from threading import Lock
from models import db, Shot, TrainingSession, SessionStatus

# Tạo một Blueprint mới cho các chức năng liên quan đến Pi
pi_bp = Blueprint('pi_bp', __name__)

STATE_LOCK = Lock()

# Đây sẽ là nơi lưu trữ xạ thủ đang hoạt động, thay vì dùng session
ACTIVE_SHOOTER_STATE = {
    'session_id': None,
    'soldier_id': None
}
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

@pi_bp.route('/processed_data_upload', methods=['POST'])
def processed_data_upload():
    global latest_processed_data
    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'Invalid data'}), 400

    # Gán các giá trị mặc định vào dữ liệu nhận được
    data['shot_id'] = time.time()
    data['saved_to_db'] = False

    active_session_id = None
    active_soldier_id = None

    # Bước 1: Khóa và đọc trạng thái hiện tại một cách an toàn
    with STATE_LOCK:
        active_session_id = ACTIVE_SHOOTER_STATE.get('session_id')
        active_soldier_id = ACTIVE_SHOOTER_STATE.get('soldier_id')
    
    # Bước 2: Chỉ xử lý nếu có xạ thủ đang được kích hoạt
    if active_session_id and active_soldier_id:
        try:
            # Bước 3: Lấy phiên từ DB và kiểm tra trạng thái lần cuối (lớp bảo vệ)
            current_session = db.session.get(TrainingSession, int(active_session_id))
            
            if current_session and current_session.status != SessionStatus.COMPLETED:
                # Nếu mọi thứ hợp lệ, tiến hành tạo và lưu đối tượng Shot
                image_data = data.get('image_data')
                image_url = None # Sẽ lưu URL từ Cloudinary

                # <<< LOGIC UPLOAD ẢNH MỚI >>>
                if image_data:
                    try:
                        # Tải ảnh lên Cloudinary
                        upload_result = cloudinary.uploader.upload(
                            base64.b64decode(image_data),
                            folder="shot_results" # Tạo một thư mục trên Cloudinary
                        )
                        image_url = upload_result.get('secure_url')
                        print(f"✅ Đã tải ảnh lên Cloudinary: {image_url}")
                    except Exception as e:
                        print(f"❌ Lỗi khi tải ảnh lên Cloudinary: {e}")
                    

                new_shot = Shot(
                    session_id=active_session_id,
                    soldier_id=active_soldier_id,
                    score=data.get('score', 0),
                    target_name=data.get('target', 'Không xác định'),
                    result_image_path=image_url
                )
                
                db.session.add(new_shot)
                db.session.commit()
                
                print(f"💾 Đã lưu lần bắn vào database cho session {active_session_id}")
                data['saved_to_db'] = True # Cập nhật cờ báo hiệu đã lưu thành công
            else:
                status_str = "không tồn tại" if not current_session else "đã kết thúc"
                print(f"⚠️ Từ chối lưu vì phiên #{active_session_id} {status_str}.")

        except Exception as e:
            db.session.rollback()
            print(f"❌ Lỗi khi lưu lần bắn vào database: {e}")
    else:
        print("⚠️ Nhận được dữ liệu bắn nhưng không lưu vì không có xạ thủ được kích hoạt.")

    # Cập nhật dữ liệu tạm thời để gửi về cho giao diện
    latest_processed_data.update(data)
    
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
    center_value = data.get('center')

    # Nếu giá trị là một dictionary (chứa x, y) -> lệnh lấy từ click chuột
    if isinstance(center_value, dict) and 'x' in center_value and 'y' in center_value:
        command = {'type': 'center', 'value': center_value}
    # Nếu giá trị là một chuỗi (vd: 'recenter') -> lệnh lấy từ nút bấm
    elif isinstance(center_value, str):
        command = {'type': 'center', 'value': center_value}
    else:
        # Nếu không khớp, trả về lỗi
        return jsonify({'status': 'error', 'message': 'Dữ liệu không hợp lệ.'}), 400

    try:
        COMMAND_QUEUE.put_nowait(command)
        return jsonify({'status': 'success'})
    except queue.Full:
        return jsonify({'status': 'error', 'message': 'Hàng đợi lệnh đang đầy.'}), 503

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