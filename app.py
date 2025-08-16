from flask import Flask, render_template, redirect, url_for, request, Response, jsonify
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
import base64, threading, time

from models import init_db, db, User
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

# Livestream state (giữ nguyên logic của bạn)
latest_frame = None
pi_connected = False
last_heartbeat = 0
frame_lock = threading.Lock()
latest_processed_data = {
    'time': '--:--:--',
    'target': 'Chưa có kết quả',
    'score': '--.-',
    'force': '--',
    'image_url': 'https://i.imgur.com/vHqB3pG.png'
}

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
    return redirect(url_for('login')
)

# Livestream APIs
@app.route('/video_upload', methods=['POST'])
def video_upload():
    global latest_frame, pi_connected, last_heartbeat
    # Nhận dữ liệu nhị phân thô (raw binary data)
    frame_data_binary = request.data
    if not frame_data_binary:
        return jsonify({'status': 'error', 'message': 'Invalid data'}), 400
    with frame_lock:
        latest_frame = frame_data_binary
        last_heartbeat = time.time()
        pi_connected = True
    return jsonify({'status': 'success'})

@app.route('/processed_data_upload', methods=['POST'])
def processed_data_upload():
    global latest_processed_data
    data = request.get_json()
    if data:
        latest_processed_data = data
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
        with frame_lock:
            if latest_frame:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + latest_frame + b'\r\n')
        time.sleep(0.05)

@app.route('/video_feed')
@login_required
def video_feed():
    global pi_connected
    if not pi_connected:
        return Response("<h1>Không có luồng video</h1>", mimetype='text/html')
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# New routes for modes
@app.route('/che_do_1')
@login_required
def che_do_1():
    return render_template('che_do_1.html')

@app.route('/che_do_2')
@login_required
def che_do_2():
    return render_template('che_do_2.html')
    
@app.route('/che_do_3')
@login_required
def che_do_3():
    return render_template('che_do_3.html')


if __name__ == '__main__':
    print("LOG: [Server] Khởi động Flask server…")
    app.run(host='0.0.0.0', port=5000, debug=True)