from flask import Flask, render_template, request, jsonify, redirect, url_for, Response, session, flash, send_from_directory
from flask_login import login_required, LoginManager, UserMixin, login_user, logout_user, current_user
import base64, threading, time, queue, socket, uuid, os, platform, secrets, string
from datetime import datetime
from waitress import serve
from werkzeug.security import generate_password_hash, check_password_hash
from pathlib import Path
import logging
from logging.handlers import RotatingFileHandler

# Import models và blueprints
from models import db, User, Soldier, TrainingSession, Exercise, Shot, init_db, SessionStatus
from controllers.soldier_controller import soldier_bp
from controllers.pi_controller import pi_bp
from controllers.training_controller import training_bp
from controllers.report_controller import report_bp

app = Flask(__name__)

# === BẮT ĐẦU PHẦN SỬA LỖI: QUẢN LÝ ĐƯỜDẪN DỮ LIỆU TẬP TRUNG ===
APP_NAME = "HeThongHuanLuyenDA01"

# Xác định đường dẫn thư mục dữ liệu dựa trên hệ điều hành
if platform.system() == "Windows":
    data_dir = Path(os.getenv('APPDATA')) / APP_NAME
else: # macOS và Linux
    data_dir = Path.home() / f".{APP_NAME}"

# Tạo thư mục nếu nó chưa tồn tại
data_dir.mkdir(parents=True, exist_ok=True)

# Tạo các thư mục con cần thiết
AVATAR_UPLOAD_FOLDER = data_dir / 'avatars'
SHOT_IMAGE_FOLDER = data_dir / 'shot_images'
AVATAR_UPLOAD_FOLDER.mkdir(exist_ok=True)
SHOT_IMAGE_FOLDER.mkdir(exist_ok=True)
# === KẾT THÚC PHẦN SỬA LỖI ===

# --- Cấu hình ứng dụng ---
app.config['SECRET_KEY'] = 'your_very_secret_key_change_this' # Thay đổi key này trong thực tế

# Sử dụng đường dẫn CSDL đã được xác định ở trên
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{data_dir / "database.db"}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Cấu hình đường dẫn upload
app.config['AVATAR_UPLOAD_FOLDER'] = str(AVATAR_UPLOAD_FOLDER)
app.config['SHOT_IMAGE_FOLDER'] = str(SHOT_IMAGE_FOLDER)

# --- Cấu hình Logging ---
file_handler = RotatingFileHandler(data_dir / 'app.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info(f'--- HỆ THỐNG KHỞI ĐỘNG --- Dữ liệu được lưu tại: {data_dir}')


# --- Khởi tạo DB và Login Manager ---
init_db(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@app.context_processor
def inject_profile_status():
    """
    Tự động kiểm tra và gửi trạng thái profile đến tất cả các template.
    """
    if current_user.is_authenticated and not current_user.is_profile_complete:
        if request.endpoint and 'logout' not in request.endpoint and 'static' not in request.endpoint:
             return dict(PROFILE_INCOMPLETE=True)
    return dict(PROFILE_INCOMPLETE=False)

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# --- Đăng ký Blueprints ---
app.register_blueprint(soldier_bp)
app.register_blueprint(pi_bp)
app.register_blueprint(training_bp)
app.register_blueprint(report_bp)

def get_ip_address():
    """Tìm địa chỉ IP nội bộ của máy chủ."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

@app.route('/user_data/<path:filename>')
@login_required
def serve_user_data(filename):
    """
    Route an toàn để phục vụ các file từ thư mục dữ liệu của ứng dụng.
    """
    if 'avatar_' in filename:
        return send_from_directory(app.config['AVATAR_UPLOAD_FOLDER'], filename)
    elif 'shot_' in filename:
        return send_from_directory(app.config['SHOT_IMAGE_FOLDER'], filename)
    else:
        return "File not found", 404

@app.route('/')
@login_required
def index():
    search_query = request.args.get('search', '').strip()
    unit_filter = request.args.get('unit', '').strip()

    query = Soldier.query
    if search_query:
        query = query.filter(Soldier.name.ilike(f'%{search_query}%'))
    if unit_filter:
        query = query.filter(Soldier.unit == unit_filter)
    soldiers = query.order_by(Soldier.created_at.desc()).all()

    all_units = db.session.query(Soldier.unit).distinct().order_by(Soldier.unit).all()
    unit_list = [unit[0] for unit in all_units if unit[0]]
    
    total_soldiers = Soldier.query.count()
    total_sessions = TrainingSession.query.count()
    active_session = TrainingSession.query.filter_by(status=SessionStatus.IN_PROGRESS).first()
    is_system_active = True if active_session else False
    
    return render_template(
        'index.html', 
        total_soldiers=total_soldiers, 
        total_sessions=total_sessions, 
        is_system_active=is_system_active,
        unit_list=unit_list,
        search_query=search_query,
        unit_filter=unit_filter
    )

@app.route('/login', methods=['GET', 'POST'])
def login():
    if not User.query.first():
        flash('Chào mừng! Vui lòng tạo tài khoản quản trị viên đầu tiên.', 'info')
        return redirect(url_for('setup'))

    if current_user.is_authenticated:
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form['username'].strip()
        password = request.form['password']
        user = User.query.filter_by(username=username).first()

        if user and user.check_password(password):
            login_user(user)
            session['username'] = user.username
            return redirect(url_for('index'))
        else:
            flash('Sai tên đăng nhập hoặc mật khẩu.', 'danger')

    return render_template('login.html')

@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    if 'user_id_for_reset' not in session:
        flash('Vui lòng xác thực bằng mã khôi phục trước.', 'warning')
        return redirect(url_for('forgot_password'))

    if request.method == 'POST':
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        if not password or not confirm_password:
            flash('Vui lòng nhập đầy đủ mật khẩu mới.', 'danger')
            return render_template('reset_password.html')

        if password != confirm_password:
            flash('Mật khẩu xác nhận không khớp.', 'danger')
            return render_template('reset_password.html')

        if len(password) < 6:
            flash('Mật khẩu phải có ít nhất 6 ký tự.', 'danger')
            return render_template('reset_password.html')

        try:
            user_id = session['user_id_for_reset']
            user = db.session.get(User, user_id)
            if user:
                user.set_password(password)
                db.session.commit()
                session.pop('user_id_for_reset', None)
                flash('Mật khẩu của bạn đã được cập nhật thành công! Vui lòng đăng nhập lại.', 'success')
                return redirect(url_for('login'))
            else:
                flash('Không tìm thấy người dùng để cập nhật.', 'danger')
                return redirect(url_for('forgot_password'))
        except Exception as e:
            db.session.rollback()
            flash(f'Đã xảy ra lỗi: {e}', 'danger')

    return render_template('reset_password.html')

@app.route('/setup', methods=['GET', 'POST'])
def setup():
    if User.query.first():
        return redirect(url_for('login'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        if not all([username, password, confirm_password]):
            flash('Vui lòng điền đầy đủ các trường thông tin.', 'danger')
            return render_template('setup.html')

        if password != confirm_password:
            flash('Mật khẩu xác nhận không khớp.', 'danger')
            return render_template('setup.html')
        
        if len(password) < 6:
            flash('Mật khẩu phải có ít nhất 6 ký tự.', 'danger')
            return render_template('setup.html')

        try:
            new_user = User(username=username)
            new_user.set_password(password)
            db.session.add(new_user)
            db.session.commit()
            login_user(new_user)
            session['username'] = new_user.username
            flash('Tài khoản đã tạo! Giờ hãy lưu mã khôi phục của bạn.', 'success')
            return redirect(url_for('setup_recovery'))
        except Exception as e:
            db.session.rollback()
            flash(f'Đã xảy ra lỗi khi tạo tài khoản: {e}', 'danger')
            return render_template('setup.html')

    return render_template('setup.html')

@app.route('/setup/recovery')
@login_required
def setup_recovery():
    if current_user.recovery_code_hash:
        return redirect(url_for('index'))

    alphabet = string.ascii_uppercase + string.digits
    parts = [''.join(secrets.choice(alphabet) for _ in range(4)) for _ in range(3)]
    recovery_code = '-'.join(parts)

    current_user.recovery_code_hash = generate_password_hash(recovery_code)
    db.session.commit()

    return render_template('setup_recovery.html', recovery_code=recovery_code)

@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        recovery_code = request.form.get('recovery_code', '').strip()

        if not username or not recovery_code:
            flash('Vui lòng nhập đầy đủ thông tin.', 'danger')
            return render_template('forgot_password.html')

        user = User.query.filter_by(username=username).first()

        if user and user.recovery_code_hash and check_password_hash(user.recovery_code_hash, recovery_code):
            session['user_id_for_reset'] = user.id
            flash('Xác thực thành công! Vui lòng đặt lại mật khẩu mới.', 'success')
            return redirect(url_for('reset_password'))
        else:
            flash('Tên người dùng hoặc Mã khôi phục không chính xác.', 'danger')

    return render_template('forgot_password.html')

@app.route("/list", endpoint="list_page")
@login_required
def list_page():
    return render_template("list.html")

# === THÊM MỚI ROUTE NÀY VÀO CUỐI TỆP ===
@app.route('/hdsd')
@login_required
def hdsd():
    """
    Hiển thị trang hướng dẫn sử dụng.
    """
    return render_template('hdsd.html')
# === KẾT THÚC PHẦN THÊM MỚI ===
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/livestream', endpoint='livestream')
@login_required
def livestream():
    return render_template('livestream.html')

@app.route('/report')
@login_required
def report():
    return render_template('report.html')

@app.route('/report/<string:report_type>/<int:report_id>')
@login_required
def report_page(report_type, report_id):
    return render_template('report.html', 
                           report_type=report_type, 
                           report_id=report_id)

@app.route('/training', endpoint='training')
@login_required
def training():
    return render_template('training_session.html')

@app.route('/profile')
@login_required
def profile_page():
    return render_template('profile.html')

@app.route('/session/<int:session_id>')
@login_required
def session_details(session_id):
    return render_template('session_details.html', session_id=session_id)

@app.route('/profile/update', methods=['POST'])
@login_required
def api_update_profile():
    try:
        user = current_user
        user.username = request.form.get('username', user.username).strip()
        user.full_name = request.form.get('full_name', user.full_name).strip()
        user.rank = request.form.get('rank', user.rank).strip()
        user.position = request.form.get('position', user.position).strip()
        user.unit = request.form.get('unit', user.unit).strip()

        if 'avatar' in request.files:
            file = request.files['avatar']
            if file and file.filename != '':
                filename = "avatar_" + str(current_user.id) + "_" + str(uuid.uuid4())[:8] + ".jpg"
                file.save(os.path.join(app.config['AVATAR_UPLOAD_FOLDER'], filename))
                user.avatar_url = filename

        new_password = request.form.get('new_password')
        if new_password:
            confirm_password = request.form.get('confirm_password')
            if new_password != confirm_password:
                return jsonify({'error': 'Mật khẩu xác nhận không khớp.'}), 400
            user.set_password(new_password)

        db.session.commit()
        return jsonify({
            'message': 'Cập nhật thông tin thành công!',
            'user': {
                'full_name': user.full_name,
                'position': user.position,
                'avatar_url': user.avatar_url 
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Đã có lỗi xảy ra', 'detail': str(e)}), 500
    
@app.route('/update_profile', methods=['POST'])
@login_required
def update_profile():
    data = request.form
    new_username = data.get('username', '').strip()
    full_name = data.get('full_name', '').strip()
    rank = request.form.get('rank', '').strip()
    position = request.form.get('position', '').strip()
    unit = request.form.get('unit', '').strip()
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')

    if not all([new_username, full_name, rank, position, unit]):
        return jsonify({'error': 'Vui lòng điền đầy đủ các trường bắt buộc.'}), 400

    if new_password != confirm_password:
        return jsonify({'error': 'Mật khẩu xác nhận không khớp.'}), 400
    
    existing_user = User.query.filter(User.username == new_username, User.id != current_user.id).first()
    if existing_user:
        return jsonify({'error': f'Tên đăng nhập "{new_username}" đã tồn tại.'}), 400

    user = current_user
    user.username = new_username
    user.full_name = full_name
    user.rank = rank
    user.position = position
    user.unit = unit
    if new_password:
        user.set_password(new_password)
    user.is_profile_complete = True
    db.session.commit()

    return jsonify({'message': 'Cập nhật thông tin thành công!'}), 200

# --- Khởi chạy Server ---
if __name__ == '__main__':
    ip_address = get_ip_address()
    
    app.logger.info("===================================================")
    app.logger.info(f"✅ Server Flask đã sẵn sàng!")
    app.logger.info(f"   - Địa chỉ IP của máy chủ: {ip_address}")
    app.logger.info(f"   - Vui lòng truy cập http://{ip_address}:8080 trên các thiết bị trong cùng mạng.")
    app.logger.info("===================================================")
    
    # Dùng waitress cho production
    serve(app, host='0.0.0.0', port=8080, threads=8)