from flask import Flask, render_template, request, jsonify, redirect, url_for, Response
from flask_login import login_required, LoginManager, UserMixin, login_user, logout_user, current_user
import base64, threading, time
from datetime import datetime

from models import db, User, Soldier, TrainingSession, Exercise, Shot, init_db
from controllers.soldier_controller import soldier_bp

app = Flask(__name__)
app.config['SECRET_KEY'] = 'a_very_secret_key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# DB init
init_db(app)

# Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Livestream state
latest_frame = None
pi_connected = False
last_heartbeat = 0
frame_lock = threading.Lock()
latest_processed_data = {
    'time': '--:--:--',
    'target': 'Chưa có kết quả',
    'score': '--.-',
    'image_data': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
}
new_frame_event = threading.Event()

# Register controllers
app.register_blueprint(soldier_bp)

# Pages
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

# Livestream APIs
@app.route('/video_upload', methods=['POST'])
def video_upload():
    global latest_frame, pi_connected, last_heartbeat
    frame_data_binary = request.data
    if not frame_data_binary:
        return jsonify({'status': 'error', 'message': 'Invalid data'}), 400
    with frame_lock:
        latest_frame = frame_data_binary
        last_heartbeat = time.time()
        pi_connected = True
        new_frame_event.set()
    return jsonify({'status': 'success'})

@app.route('/processed_data_upload', methods=['POST'])
def processed_data_upload():
    global latest_processed_data
    data = request.get_json()
    if data:
        latest_processed_data['time'] = data.get('time', latest_processed_data['time'])
        latest_processed_data['target'] = data.get('target_name', data.get('target', latest_processed_data['target']))
        latest_processed_data['score'] = data.get('score', latest_processed_data['score'])
        latest_processed_data['image_data'] = data.get('image_data', latest_processed_data['image_data'])
        print('Nhận dữ liệu thành công!')
        return jsonify({'status': 'success'})
    return jsonify({'status': 'error', 'message': 'Invalid data'}), 400

@app.route('/connection-status')
def connection_status():
    global pi_connected, last_heartbeat
    if time.time() - last_heartbeat > 5:
        pi_connected = False
    status = 'connected' if pi_connected else 'disconnected'
    return jsonify({'status': status})

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

@app.route('/data_feed')
@login_required
def data_feed():
    global latest_processed_data, pi_connected
    if not pi_connected:
        return jsonify({})
    return jsonify(latest_processed_data)

def generate_frames():
    global latest_frame
    while True:
        new_frame_event.wait()
        with frame_lock:
            if latest_frame:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + latest_frame + b'\r\n')
        new_frame_event.clear()

@app.route('/video_feed')
@login_required
def video_feed():
    global pi_connected
    if not pi_connected:
        return Response("<h1>Không có luồng video</h1>", mimetype='text/html')
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


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

# API for training sessions and exercises
@app.route('/api/exercises', methods=['GET'])
@login_required
def get_exercises():
    try:
        exercises = Exercise.query.all()
        exercises_list = []
        for exercise in exercises:
            exercises_list.append({
                'id': exercise.id,
                'exercise_name': exercise.exercise_name
            })
        return jsonify(exercises_list)
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
    # Sắp xếp theo ID giảm dần để các phiên mới nhất hiện lên đầu
    sessions = TrainingSession.query.order_by(TrainingSession.id.desc()).all()
    session_list = []
    for session in sessions:
        exercise = Exercise.query.get(session.exercise_id)
        exercise_name = exercise.exercise_name if exercise else 'Không xác định'
        
        session_list.append({
            'id': session.id,
            'session_name': session.session_name,
            'exercise_name': exercise_name
        })
    return jsonify(session_list)


if __name__ == '__main__':
    print("LOG: [Server] Khởi động Flask server…")
    app.run(host='0.0.0.0', port=5000, debug=True)