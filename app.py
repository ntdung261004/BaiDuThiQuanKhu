from flask import Flask, render_template, request, jsonify, redirect, url_for, Response
from flask_login import login_required, LoginManager, UserMixin, login_user, logout_user, current_user
import base64, threading, time
from datetime import datetime
import queue
from waitress import serve
import socket # <<< THÊM MỚI
import cloudinary
import os
import logging
from logging.handlers import RotatingFileHandler
import secrets
import string
from werkzeug.utils import secure_filename
import uuid
from werkzeug.security import generate_password_hash,  check_password_hash
from flask import flash, session

from models import db, User, Soldier, TrainingSession, Exercise, Shot, init_db, SessionStatus
from controllers.soldier_controller import soldier_bp
from controllers.pi_controller import pi_bp
from controllers.training_controller import training_bp
from controllers.report_controller import report_bp #

app = Flask(__name__)
# === BẮT ĐẦU PHẦN THÊM MỚI: CẤU HÌNH LOGGING ===
# Đảm bảo thư mục 'instance' tồn tại
if not os.path.exists('instance'):
    os.makedirs('instance')

# Thiết lập handler để ghi log vào file, có xoay vòng
# (Tối đa 10MB mỗi file, giữ lại 5 file cũ)
file_handler = RotatingFileHandler('instance/app.log', maxBytes=10240, backupCount=5)

# Định dạng cho mỗi dòng log (Thời gian - Cấp độ - Nội dung - Vị trí lỗi)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))

# Đặt cấp độ ghi log (INFO và cao hơn sẽ được ghi lại)
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)

app.logger.setLevel(logging.INFO)
app.logger.info('--- Ứng dụng DA01 Khởi động ---')
# === KẾT THÚC PHẦN THÊM MỚI ===

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
# Thêm cấu hình cho thư mục upload, đặt gần các app.config khác
UPLOAD_FOLDER = os.path.join(app.static_folder, 'uploads', 'avatars')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# Tạo thư mục nếu chưa tồn tại
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

app.config['SECRET_KEY'] = 'a_very_secret_key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
init_db(app)

# CẤU HÌNH CLOUDINARY>>>
cloudinary.config( 
    cloud_name = "dmeho8uqs", 
    api_key = "274359684344333", 
    api_secret = "YTVCyDi_WIJXvKOfp6lc4nlGsks",
    secure=True
)
# --- Quản lý Login ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# === BẮT ĐẦU PHẦN THÊM MỚI: KIỂM TRA PROFILE ===
@app.context_processor
def inject_profile_status():
    """
    Tự động kiểm tra và gửi trạng thái profile đến tất cả các template.
    """
    if current_user.is_authenticated and not current_user.is_profile_complete:
        # Nếu người dùng đã đăng nhập nhưng chưa hoàn thành profile
        # và họ không đang ở trang đăng xuất, thì gửi cờ TRUE
        if request.endpoint and 'logout' not in request.endpoint and 'static' not in request.endpoint:
             return dict(PROFILE_INCOMPLETE=True)
    return dict(PROFILE_INCOMPLETE=False)
# === KẾT THÚC PHẦN THÊM MỚI ===

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id)) # Dùng phương thức mới, tránh warning

# --- Đăng ký Blueprints ---
app.register_blueprint(soldier_bp)
app.register_blueprint(pi_bp)
app.register_blueprint(training_bp)
app.register_blueprint(report_bp)
# --- Các trang (Pages) ---
@app.route('/')
@login_required
def index():
    # Lấy các tham số từ URL, ví dụ: /?search=Minh&unit=C1
    search_query = request.args.get('search', '').strip()
    unit_filter = request.args.get('unit', '').strip()

    # --- Lọc và tìm kiếm chiến sĩ ---
    query = Soldier.query
    if search_query:
        query = query.filter(Soldier.name.ilike(f'%{search_query}%'))
    if unit_filter:
        query = query.filter(Soldier.unit == unit_filter)
    soldiers = query.order_by(Soldier.created_at.desc()).all()

    # Lấy danh sách các đơn vị duy nhất để điền vào dropdown
    all_units = db.session.query(Soldier.unit).distinct().order_by(Soldier.unit).all()
    unit_list = [unit[0] for unit in all_units if unit[0]]
    
    # 1. Lấy tổng số chiến sĩ
    total_soldiers = Soldier.query.count()

    # 2. Lấy tổng số phiên tập
    total_sessions = TrainingSession.query.count()

    # 3. Kiểm tra xem có phiên nào đang diễn ra không
    active_session = TrainingSession.query.filter_by(status=SessionStatus.IN_PROGRESS).first()
    is_system_active = True if active_session else False
    # === KẾT THÚC PHẦN THÊM MỚI ===
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
    """
    Xử lý trang đăng nhập.
    (Sử dụng flash để gửi thông báo lỗi)
    """
    # --- Logic "Người Gác Cổng" ---
    if not User.query.first():
        flash('Chào mừng! Vui lòng tạo tài khoản quản trị viên đầu tiên.', 'info')
        return redirect(url_for('setup'))
    # -----------------------------

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
            # === SỬA ĐỔI CHÍNH ===
            # Dùng flash để gửi thông báo lỗi thay vì biến error
            flash('Sai tên đăng nhập hoặc mật khẩu.', 'danger')
            # =====================

    return render_template('login.html')

@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    """
    Xử lý việc đặt lại mật khẩu mới sau khi đã xác thực thành công.
    """
    # KIỂM LỖI: Đảm bảo người dùng đã đi qua bước xác thực
    if 'user_id_for_reset' not in session:
        flash('Vui lòng xác thực bằng mã khôi phục trước.', 'warning')
        return redirect(url_for('forgot_password'))

    if request.method == 'POST':
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        # Kiểm tra dữ liệu đầu vào
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
            # Tìm người dùng và cập nhật mật khẩu mới
            user_id = session['user_id_for_reset']
            user = db.session.get(User, user_id)
            if user:
                user.set_password(password)
                db.session.commit()

                # Xóa session tạm sau khi đã reset thành công
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
    """
    Hiển thị và xử lý form tạo tài khoản quản trị viên lần đầu tiên.
    (ĐÃ SỬA LỖI 'role' is an invalid keyword argument)
    """
    # KIỂM LỖI: Chỉ cho phép truy cập khi CSDL trống
    if User.query.first():
        return redirect(url_for('login'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        # --- KIỂM LỖI DỮ LIỆU ĐẦU VÀO ---
        if not all([username, password, confirm_password]):
            flash('Vui lòng điền đầy đủ các trường thông tin.', 'danger')
            return render_template('setup.html')

        if password != confirm_password:
            flash('Mật khẩu xác nhận không khớp.', 'danger')
            return render_template('setup.html')
        
        if len(password) < 6:
            flash('Mật khẩu phải có ít nhất 6 ký tự.', 'danger')
            return render_template('setup.html')
        # ---------------------------------

        try:
            # === PHẦN SỬA LỖI CHÍNH XÁC ===
            # 1. Tạo người dùng mới chỉ với username.
            # Model User của bạn không có trường 'role'.
            new_user = User(username=username)
            
            # 2. Dùng phương thức set_password của model để mã hóa và gán mật khẩu.
            new_user.set_password(password)
            # ==============================
            
            db.session.add(new_user)
            db.session.commit()

            login_user(new_user)
            session['username'] = new_user.username

            flash('Tài khoản đã tạo! Giờ hãy lưu mã khôi phục của bạn.', 'success')

            # THAY ĐỔI DÒNG NÀY:
            return redirect(url_for('setup_recovery'))

        except Exception as e:
            db.session.rollback()
            # Hiển thị lỗi một cách thân thiện hơn
            flash(f'Đã xảy ra lỗi khi tạo tài khoản: {e}', 'danger')
            return render_template('setup.html')

    return render_template('setup.html')

@app.route('/setup/recovery')
@login_required
def setup_recovery():
    """
    Tạo và hiển thị mã khôi phục cho người dùng sau khi đăng ký.
    """
    # KIỂM LỖI: Đảm bảo người dùng chưa có mã khôi phục
    if current_user.recovery_code_hash:
        # Nếu đã có mã, chuyển thẳng về trang chính
        return redirect(url_for('index'))

    # Tạo mã khôi phục ngẫu nhiên (ví dụ: ABCD-EFGH-IJKL)
    alphabet = string.ascii_uppercase + string.digits
    parts = [''.join(secrets.choice(alphabet) for _ in range(4)) for _ in range(3)]
    recovery_code = '-'.join(parts)

    # Hash mã khôi phục trước khi lưu vào CSDL
    current_user.recovery_code_hash = generate_password_hash(recovery_code)
    db.session.commit()

    # Truyền mã khôi phục (dạng chữ) ra template để hiển thị cho người dùng
    return render_template('setup_recovery.html', recovery_code=recovery_code)

@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    """
    Xử lý việc xác thực người dùng bằng username và mã khôi phục.
    """
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        recovery_code = request.form.get('recovery_code', '').strip()

        if not username or not recovery_code:
            flash('Vui lòng nhập đầy đủ thông tin.', 'danger')
            return render_template('forgot_password.html')

        user = User.query.filter_by(username=username).first()

        # Kiểm tra xem người dùng có tồn tại không và mã khôi phục có khớp không
        if user and user.recovery_code_hash and check_password_hash(user.recovery_code_hash, recovery_code):
            # Nếu thành công, lưu tạm ID người dùng vào session để cho phép reset
            session['user_id_for_reset'] = user.id
            flash('Xác thực thành công! Vui lòng đặt lại mật khẩu mới.', 'success')
            return redirect(url_for('reset_password'))
        else:
            flash('Tên người dùng hoặc Mã khôi phục không chính xác.', 'danger')

    return render_template('forgot_password.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/livestream', endpoint='livestream')
@login_required
def livestream():
    return render_template('livestream.html')

# báo cáo tổng quan
@app.route('/report') # Đường dẫn chung cho trang báo cáo
@login_required
def report():
    # Render template report.html, không cần truyền tham số ở đây
    return render_template('report.html')

#báo cáo chi tiết
@app.route('/report/<string:report_type>/<int:report_id>')
@login_required
def report_page(report_type, report_id):
    """
    Hiển thị trang báo cáo chi tiết cho một phiên hoặc một chiến sĩ.
    """
    # Chỉ render template, logic xử lý dữ liệu sẽ nằm ở JavaScript
    return render_template('report.html', 
                           report_type=report_type, 
                           report_id=report_id)


@app.route('/training', endpoint='training')
@login_required
def training():
    return render_template('training_session.html')

# ROUTE CHO TRANG PROFILE ===
@app.route('/profile')
@login_required
def profile_page():
    """
    Hiển thị trang chỉnh sửa thông tin cá nhân của người dùng.
    """
    return render_template('profile.html')

#Route để hiển thị trang chi tiết phiên tập >>>
@app.route('/session/<int:session_id>')
@login_required
def session_details(session_id):
    # Chúng ta chỉ cần render trang, JavaScript sẽ tự tải dữ liệu
    return render_template('session_details.html', session_id=session_id)

# ROUTE XỬ LÝ CẬP NHẬT PROFILE ===
@app.route('/profile/update', methods=['POST'])
@login_required
def api_update_profile():
    try:
        user = current_user
        
        # Lấy dữ liệu từ form
        user.username = request.form.get('username', user.username).strip()
        user.full_name = request.form.get('full_name', user.full_name).strip()
        user.rank = request.form.get('rank', user.rank).strip()
        user.position = request.form.get('position', user.position).strip()
        user.unit = request.form.get('unit', user.unit).strip()

        # Xử lý ảnh đại diện nếu có file được tải lên
        if 'avatar' in request.files:
            file = request.files['avatar']
            if file and file.filename != '':
                # Tạo tên file duy nhất để tránh trùng lặp
                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                
                # Lưu file vào thư mục static/uploads/avatars
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(file_path)
                
                # Lưu đường dẫn tương đối để có thể truy cập từ web
                user.avatar_url = f"/static/uploads/avatars/{unique_filename}"

        # Xử lý đổi mật khẩu
        new_password = request.form.get('new_password')
        if new_password:
            confirm_password = request.form.get('confirm_password')
            if new_password != confirm_password:
                return jsonify({'error': 'Mật khẩu xác nhận không khớp.'}), 400
            user.set_password(new_password)

        db.session.commit()
                # === BẮT ĐẦU PHẦN THÊM MỚI ĐỂ TEST ===
        print("--- KIỂM TRA DỮ LIỆU SAU KHI LƯU ---")
        print(f"Đã lưu avatar_url cho user '{user.username}' là: {user.avatar_url}")
        print("------------------------------------")
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
    
#  modal CẬP NHẬT PROFILE ===
@app.route('/update_profile', methods=['POST'])
@login_required
def update_profile():
    """
    API endpoint để xử lý cập nhật profile. Trả về JSON.
    """
    data = request.form
    new_username = data.get('username', '').strip()
    full_name = data.get('full_name', '').strip()
    rank = request.form.get('rank', '').strip()
    position = request.form.get('position', '').strip()
    unit = request.form.get('unit', '').strip()
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')

    # --- Kiểm tra lỗi ---
    if not all([new_username, full_name, rank, position, unit]):
        return jsonify({'error': 'Vui lòng điền đầy đủ các trường bắt buộc.'}), 400

    if new_password != confirm_password:
        return jsonify({'error': 'Mật khẩu xác nhận không khớp.'}), 400
    
    # Kiểm tra xem username mới có bị trùng không
    existing_user = User.query.filter(User.username == new_username, User.id != current_user.id).first()
    if existing_user:
        return jsonify({'error': f'Tên đăng nhập "{new_username}" đã tồn tại.'}), 400

    # --- Cập nhật vào database ---
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
    # <<< SỬA ĐỔI: Thêm các dòng print mới >>>
    ip_address = get_ip_address()
    app.logger.info("===================================================")
    app.logger.info(f"✅ Server Flask đã sẵn sàng!")
    app.logger.info(f"   - Địa chỉ IP của máy chủ: {ip_address}")
    app.logger.info(f"   - Vui lòng truy cập http://{ip_address}:8080 trên các thiết bị trong cùng mạng.")
    app.logger.info("===================================================")
    serve(app, host='0.0.0.0', port=5000, threads=8)