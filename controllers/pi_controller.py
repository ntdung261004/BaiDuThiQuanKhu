# controllers/pi_controller.py

from flask import Blueprint, request, jsonify, Response, current_app
import queue
import time
import base64
import os
import requests

from datetime import datetime
from threading import Lock
from models import db, Shot, TrainingSession, SessionStatus

pi_bp = Blueprint('pi_bp', __name__)

# --- Cấu hình cho kết nối đến Raspberry Pi ---
PI_HOSTNAME = os.environ.get('PI_HOSTNAME', '192.168.1.207')
PI_STREAMING_PORT = 8000
PI_STREAM_URL = f"http://{PI_HOSTNAME}:{PI_STREAMING_PORT}/stream.mjpg"

# --- Các biến trạng thái ---
STATE_LOCK = Lock()
COMMAND_QUEUE = queue.Queue(maxsize=10)
CURRENT_PI_CONFIG = {'zoom': 1.0, 'center': None}
ACTIVE_SHOOTER_STATE = {'session_id': None, 'soldier_id': None}
latest_processed_data = {
    'time': '--:--:--', 'target': 'Chưa có kết quả', 'score': '--.-',
    'image_data': 'iVBORw0KGgoAAAANSUEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
}

# --- Các API giao tiếp với Pi và Frontend ---

@pi_bp.route('/video_feed')
def video_feed():
    try:
        req = requests.get(PI_STREAM_URL, stream=True, timeout=5) # Giảm timeout để phản ứng nhanh hơn
        content_type = req.headers.get('content-type')
        if not content_type or 'multipart/x-mixed-replace' not in content_type:
            current_app.logger.warning(f"Pi trả về Content-Type không hợp lệ: {content_type}")
            return Response("<h1>Lỗi: Thiết bị Pi không trả về luồng video hợp lệ.</h1>", status=500)

        def generate():
            try:
                for chunk in req.iter_content(chunk_size=4096):
                    yield chunk
            except Exception:
                pass

        return Response(generate(), content_type=content_type)
    
    # === THAY ĐỔI TỐI ƯU LOGGING ===
    except requests.exceptions.RequestException:
        # Thay vì báo ERROR, chúng ta chỉ ghi nhận đây là một thông tin (INFO).
        # Đây là trạng thái bình thường khi client đang thăm dò mà Pi chưa sẵn sàng.
        current_app.logger.info(f"Client yêu cầu video feed nhưng không kết nối được đến Pi. Đây là trạng thái bình thường.")
        # Trả về mã lỗi 503 Service Unavailable để trình duyệt hiểu là cần thử lại sau.
        return Response(f"<h1>Thiết bị Pi tại {PI_STREAM_URL} không sẵn sàng.</h1>", status=503)
    # === KẾT THÚC THAY ĐỔI ===

@pi_bp.route('/processed_data_upload', methods=['POST'])
def processed_data_upload():
    global latest_processed_data
    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'Invalid data'}), 400

    data['shot_id'] = time.time()
    data['saved_to_db'] = False
    data['image_path'] = None 
    active_session_id = ACTIVE_SHOOTER_STATE.get('session_id')
    active_soldier_id = ACTIVE_SHOOTER_STATE.get('soldier_id')
    
    if active_session_id and active_soldier_id:
        try:
            current_session = db.session.get(TrainingSession, active_session_id)
            if current_session and current_session.status != SessionStatus.COMPLETED:
                image_filename = None
                if data.get('image_data'):
                    try:
                        image_filename = f"shot_{active_session_id}_{active_soldier_id}_{int(time.time())}.jpg"
                        image_path = os.path.join(current_app.config['SHOT_IMAGE_FOLDER'], image_filename)
                        img_bytes = base64.b64decode(data.get('image_data'))
                        with open(image_path, 'wb') as f:
                            f.write(img_bytes)
                    except Exception as e:
                        current_app.logger.error(f"Lỗi khi lưu ảnh kết quả: {e}", exc_info=True)
                        image_filename = None
                new_shot = Shot(session_id=active_session_id, soldier_id=active_soldier_id, score=data.get('score'), target_name=data.get('target'), result_image_path=image_filename)
                db.session.add(new_shot)
                db.session.commit()
                data['saved_to_db'] = True
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Lỗi khi lưu lần bắn vào CSDL: {e}", exc_info=True)
    
    latest_processed_data.update(data)
    return jsonify({'status': 'success'})

@pi_bp.route('/data_feed')
def data_feed():
    with STATE_LOCK:
        return jsonify(latest_processed_data)

@pi_bp.route('/connection-status')
def connection_status():
    is_connected = False
    try:
        with requests.get(PI_STREAM_URL, stream=True, timeout=(2.0, 2.0)) as response:
            response.raise_for_status()
            first_chunk = next(response.iter_content(chunk_size=256))
            if first_chunk:
                is_connected = True
    except (requests.exceptions.RequestException, StopIteration):
        is_connected = False
    return jsonify({'status': 'connected' if is_connected else 'disconnected'})

# ... Các hàm còn lại không thay đổi ...
@pi_bp.route('/report_config', methods=['POST'])
def report_config():
    global CURRENT_PI_CONFIG
    data = request.get_json()
    if data:
        CURRENT_PI_CONFIG.update(data)
    return jsonify({'status': 'success'})

@pi_bp.route('/get_current_config')
def get_current_config():
    return jsonify(CURRENT_PI_CONFIG)

@pi_bp.route('/set_zoom', methods=['POST'])
def set_zoom():
    zoom_level = request.json.get('zoom')
    if zoom_level:
        CURRENT_PI_CONFIG['zoom'] = float(zoom_level)
        try:
            COMMAND_QUEUE.put_nowait({'type': 'zoom', 'value': zoom_level})
            return jsonify({'status': 'success'})
        except queue.Full:
            return jsonify({'status': 'error', 'message': 'Hàng đợi lệnh đang đầy.'}), 503
    return jsonify({'status': 'error', 'message': 'Dữ liệu không hợp lệ.'}), 400
    
@pi_bp.route('/set_center', methods=['POST'])
def set_center():
    center_value = request.json.get('center')
    try:
        COMMAND_QUEUE.put_nowait({'type': 'center', 'value': center_value})
        return jsonify({'status': 'success'})
    except queue.Full:
        return jsonify({'status': 'error', 'message': 'Hàng đợi lệnh đang đầy.'}), 503

@pi_bp.route('/get_command')
def get_command():
    try:
        command = COMMAND_QUEUE.get_nowait()
        return jsonify({'command': command, 'timestamp': time.time()})
    except queue.Empty:
        return jsonify({'command': None, 'timestamp': time.time()})