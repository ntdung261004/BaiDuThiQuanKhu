from flask import Flask, render_template, request, jsonify, redirect, url_for, Response
from flask_login import login_required, LoginManager, UserMixin, login_user, logout_user, current_user
import base64, threading, time
from datetime import datetime
import queue
from waitress import serve
import socket # <<< THÊM MỚI

from models import db, User, Soldier, TrainingSession, Exercise, Shot, init_db
from controllers.soldier_controller import soldier_bp

app = Flask(__name__)

# --- Hàng đợi lệnh ---
COMMAND_QUEUE = queue.Queue(maxsize=10)

# <<< THÊM MỚI: Hàm để lấy địa chỉ IP nội bộ >>>
def get_ip_address():
    """Tìm địa chỉ IP nội bộ của máy chủ."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Không cần gửi dữ liệu, chỉ cần kết nối tới một IP bất kỳ để lấy thông tin card mạng
        s.connect(('8.8.8.8', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

# --- Cấu hình ứng dụng ---
app.config['SECRET_KEY'] = 'a_very_secret_key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
init_db(app)

# --- Quản lý Login ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id)) # Dùng phương thức mới, tránh warning

# --- Trạng thái hệ thống ---
pi_connected = False
last_heartbeat = 0
latest_processed_data = {
    'time': '--:--:--', 'target': 'Chưa có kết quả', 'score': '--.-',
    'image_data': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
}
CURRENT_PI_CONFIG = {'zoom': 1.0, 'center': None}

# --- Quản lý Livestream (Bản sửa lỗi không chặn) ---
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
                time.sleep(1/30) # Giới hạn 30 FPS
            except GeneratorExit:
                return

livestream_manager = LivestreamManager()

# --- Đăng ký Blueprints ---
app.register_blueprint(soldier_bp)

# --- Các trang (Pages) ---
@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    error = None
    if request.method == 'POST':
        username = request.form['username'].strip()
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('index'))
        else:
            error = 'Sai tên đăng nhập hoặc mật khẩu.'
    return render_template('login.html', error=error)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/livestream', endpoint='livestream')
@login_required
def livestream():
    return render_template('livestream.html')

@app.route('/report', endpoint='report')
@login_required
def reports():
    return render_template('reports.html')

@app.route('/setting', endpoint='setting')
@login_required
def setting():
    return render_template('settings.html')

@app.route('/che_do_1')
@login_required
def che_do_1():
    return render_template('training_session.html')

@app.route('/che_do_2')
@login_required
def che_do_2():
    return render_template('che_do_2.html')

@app.route('/che_do_3')
@login_required
def che_do_3():
    return render_template('che_do_3.html')

# --- Các API ---
@app.route('/video_upload', methods=['POST'])
def video_upload():
    global pi_connected, last_heartbeat
    livestream_manager.update_frame(request.data)
    last_heartbeat = time.time()
    pi_connected = True
    return ('', 204)

@app.route('/processed_data_upload', methods=['POST'])
def processed_data_upload():
    global latest_processed_data
    data = request.get_json()
    if data:
        latest_processed_data.update(data)
        return jsonify({'status': 'success'})
    return jsonify({'status': 'error', 'message': 'Invalid data'}), 400

@app.route('/connection-status')
def connection_status():
    global pi_connected, last_heartbeat
    if time.time() - last_heartbeat > 5:
        pi_connected = False
    return jsonify({'status': 'connected' if pi_connected else 'disconnected'})

@app.route('/video_feed')
@login_required
def video_feed():
    if not pi_connected:
        return Response("<h1>Thiết bị không kết nối</h1>", mimetype='text/html')
    return Response(livestream_manager.generate_frames_for_client(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/data_feed')
@login_required
def data_feed():
    return jsonify(latest_processed_data)

# --- API Điều khiển và Đồng bộ ---
@app.route('/report_config', methods=['POST'])
def report_config():
    global CURRENT_PI_CONFIG
    data = request.get_json()
    if data:
        CURRENT_PI_CONFIG['zoom'] = data.get('zoom', CURRENT_PI_CONFIG['zoom'])
        CURRENT_PI_CONFIG['center'] = data.get('center', CURRENT_PI_CONFIG['center'])
        print(f"Nhận được cấu hình từ Pi: {CURRENT_PI_CONFIG}")
        return jsonify({'status': 'success'})
    return jsonify({'status': 'error'}), 400

@app.route('/get_current_config')
@login_required
def get_current_config():
    return jsonify(CURRENT_PI_CONFIG)

@app.route('/set_zoom', methods=['POST'])
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
    
@app.route('/set_center', methods=['POST'])
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

@app.route('/get_command')
def get_command():
    try:
        command = COMMAND_QUEUE.get_nowait()
        return jsonify(command)
    except queue.Empty:
        return jsonify({})

# --- Các API Database ---
@app.route('/api/exercises', methods=['GET'])
@login_required
def get_exercises():
    try:
        exercises = Exercise.query.all()
        return jsonify([{'id': ex.id, 'exercise_name': ex.exercise_name} for ex in exercises])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/training_sessions', methods=['POST'])
@login_required
def create_training_session():
    data = request.get_json()
    exercise_id = data.get('exercise_id')
    session_name = data.get('session_name', 'Phiên tập')
    if not exercise_id:
        return jsonify({'message': 'ID bài tập không được để trống.'}), 400
    try:
        new_session = TrainingSession(session_name=session_name, exercise_id=exercise_id)
        db.session.add(new_session)
        db.session.commit()
        return jsonify({'id': new_session.id, 'session_name': new_session.session_name}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Lỗi server: ' + str(e)}), 500

@app.route('/api/training_sessions', methods=['GET'])
@login_required
def get_training_sessions():
    sessions = TrainingSession.query.order_by(TrainingSession.id.desc()).all()
    session_list = []
    for session in sessions:
        exercise_name = session.exercise.exercise_name if session.exercise else 'Không xác định'
        session_list.append({
            'id': session.id, 'session_name': session.session_name, 'exercise_name': exercise_name
        })
    return jsonify(session_list)

@app.route('/api/training_sessions/<int:session_id>', methods=['DELETE'])
@login_required
def delete_training_session(session_id):
    try:
        session = TrainingSession.query.get(session_id)
        if session is None:
            return jsonify({'message': 'Không tìm thấy phiên tập.'}), 404
        db.session.delete(session)
        db.session.commit()
        return jsonify({'message': 'Đã xóa phiên tập thành công.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Lỗi server: ' + str(e)}), 500

@app.route('/api/training_sessions/<int:session_id>', methods=['PUT'])
@login_required
def update_training_session(session_id):
    data = request.get_json()
    new_name = data.get('session_name')
    if not new_name:
        return jsonify({'message': 'Tên mới không được để trống.'}), 400
    try:
        session = TrainingSession.query.get(session_id)
        if session is None:
            return jsonify({'message': 'Không tìm thấy phiên tập.'}), 404
        session.session_name = new_name
        db.session.commit()
        return jsonify({'message': 'Cập nhật tên phiên thành công.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Lỗi server: ' + str(e)}), 500

# --- Khởi chạy Server ---
if __name__ == '__main__':
    # <<< SỬA ĐỔI: Thêm các dòng print mới >>>
    ip_address = get_ip_address()
    print("===================================================")
    print(f"✅ Server Flask đã sẵn sàng!")
    print(f"   - Địa chỉ IP của máy chủ: {ip_address}")
    print(f"   - Vui lòng cấu hình Pi để kết nối tới: http://{ip_address}:5000")
    print("🚀 Server đang khởi chạy bằng Waitress...")
    print("===================================================")
    serve(app, host='0.0.0.0', port=5000, threads=8)