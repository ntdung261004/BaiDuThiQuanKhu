from flask import Flask, render_template, request, jsonify, redirect, url_for, Response
from flask_login import login_required, LoginManager, UserMixin, login_user, logout_user, current_user
import base64, threading, time
from datetime import datetime
import queue
from waitress import serve
import socket # <<< THÊM MỚI

from models import db, User, Soldier, TrainingSession, Exercise, Shot, init_db
from controllers.soldier_controller import soldier_bp
from controllers.pi_controller import pi_bp
from controllers.training_controller import training_bp

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

# --- Đăng ký Blueprints ---
app.register_blueprint(soldier_bp)
app.register_blueprint(pi_bp)
app.register_blueprint(training_bp)

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