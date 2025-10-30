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

# === BẮT ĐẦU TỐI ƯU HÓA HIỆU NĂNG STREAM ===
@pi_bp.route('/video_feed')
def video_feed():
    """
    Endpoint này hoạt động như một proxy hiệu suất cao.
    Nó tạo ra một "đường ống" trực tiếp giữa Pi và trình duyệt.
    """
    try:
        req = requests.get(PI_STREAM_URL, stream=True, timeout=5)
        
        content_type = req.headers.get('content-type')
        if not content_type or 'multipart/x-mixed-replace' not in content_type:
            current_app.logger.error(f"Pi không trả về stream MJPEG hợp lệ. Content-Type: {content_type}")
            return Response("<h1>Lỗi: Thiết bị Pi không trả về luồng video hợp lệ.</h1>", status=500)

        # Hàm generate() sẽ đọc từng mảnh nhỏ dữ liệu và gửi đi ngay lập tức
        def generate():
            try:
                for chunk in req.iter_content(chunk_size=4096): # Đọc từng chunk 4KB
                    yield chunk
            except Exception as e:
                current_app.logger.error(f"Lỗi trong quá trình chuyển tiếp stream: {e}")

        return Response(generate(), content_type=content_type)

    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Không thể kết nối tới luồng video của Pi tại {PI_STREAM_URL}. Lỗi: {e}")
        return Response(f"<h1>Không thể kết nối đến thiết bị Pi tại {PI_STREAM_URL}</h1>", status=503)
# === KẾT THÚC TỐI ƯU HÓA HIỆU NĂNG STREAM ===


@pi_bp.route('/processed_data_upload', methods=['POST'])
def processed_data_upload():
    global latest_processed_data
    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'Invalid data'}), 400

    data['shot_id'] = time.time()
    data['saved_to_db'] = False
    data['image_path'] = None 

    active_session_id = None
    active_soldier_id = None

    with STATE_LOCK:
        active_session_id = ACTIVE_SHOOTER_STATE.get('session_id')
        active_soldier_id = ACTIVE_SHOOTER_STATE.get('soldier_id')
    
    if active_session_id and active_soldier_id:
        try:
            current_session = db.session.get(TrainingSession, active_session_id)
            if current_session and current_session.status != SessionStatus.COMPLETED:
                score = data.get('score')
                target_name = data.get('target')
                image_data = data.get('image_data')

                image_filename = None
                if image_data:
                    try:
                        image_filename = f"shot_{active_session_id}_{active_soldier_id}_{int(time.time())}.jpg"
                        image_path = os.path.join(current_app.config['SHOT_IMAGE_FOLDER'], image_filename)
                        img_bytes = base64.b64decode(image_data)
                        with open(image_path, 'wb') as f:
                            f.write(img_bytes)
                        current_app.logger.info(f"✅ Đã lưu ảnh kết quả: {image_path}")
                    except Exception as e:
                        current_app.logger.error(f"❌ Lỗi khi lưu ảnh kết quả: {e}", exc_info=True)
                        image_filename = None

                new_shot = Shot(
                    session_id=active_session_id,
                    soldier_id=active_soldier_id,
                    score=score,
                    target_name=target_name,
                    result_image_path=image_filename
                )
                
                db.session.add(new_shot)
                db.session.commit()
                current_app.logger.info(f"💾 Đã lưu lần bắn vào CSDL cho phiên {active_session_id}")
                data['saved_to_db'] = True
            else:
                status_str = "không tồn tại" if not current_session else "đã kết thúc"
                current_app.logger.warning(f"⚠️ Từ chối lưu vì phiên #{active_session_id} {status_str}.")
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"❌ Lỗi khi lưu lần bắn vào CSDL: {e}", exc_info=True)
    else:
        current_app.logger.warning("⚠️ Nhận được dữ liệu bắn nhưng không lưu vì không có xạ thủ được kích hoạt.")

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
        response = requests.head(PI_STREAM_URL, timeout=1.5)
        if response.status_code == 200:
            is_connected = True
    except requests.exceptions.RequestException:
        is_connected = False

    if is_connected:
        return jsonify({
            'status': 'connected',
            'zoom': CURRENT_PI_CONFIG.get('zoom', 1.0)
        })
    else:
        return jsonify({'status': 'disconnected'})

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
        CURRENT_PI_CONFIG['zoom'] = float(zoom_level)
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
    if isinstance(center_value, dict) and 'x' in center_value and 'y' in center_value:
        command = {'type': 'center', 'value': center_value}
    elif isinstance(center_value, str):
        command = {'type': 'center', 'value': center_value}
    else:
        return jsonify({'status': 'error', 'message': 'Dữ liệu không hợp lệ.'}), 400

    try:
        COMMAND_QUEUE.put_nowait(command)
        return jsonify({'status': 'success'})
    except queue.Full:
        return jsonify({'status': 'error', 'message': 'Hàng đợi lệnh đang đầy.'}), 503

@pi_bp.route('/get_command')
def get_command():
    response_data = {'command': None, 'timestamp': time.time()}
    try:
        command = COMMAND_QUEUE.get_nowait()
        response_data['command'] = command
    except queue.Empty:
        pass
    return jsonify(response_data)