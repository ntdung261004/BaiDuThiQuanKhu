# controllers/pi_controller.py

from flask import Blueprint, request, jsonify, Response
import queue
import threading
import time

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

# <<< THÊM LẠI: Route để Pi gửi dữ liệu đã xử lý lên >>>
@pi_bp.route('/processed_data_upload', methods=['POST'])
def processed_data_upload():
    global latest_processed_data
    data = request.get_json()
    if data:
        latest_processed_data.update(data)
        return jsonify({'status': 'success'})
    return jsonify({'status': 'error', 'message': 'Invalid data'}), 400

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

@pi_bp.route('/get_command')
def get_command():
    try:
        command = COMMAND_QUEUE.get_nowait()
        return jsonify(command)
    except queue.Empty:
        return jsonify({})