from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

# <<< THÊM MỚI: Bảng trung gian cho quan hệ Nhiều-Nhiều >>>
# Bảng này liên kết TrainingSession và Soldier, cho phép một phiên có nhiều chiến sĩ
# và một chiến sĩ có thể tham gia nhiều phiên.
session_soldiers = db.Table('session_soldiers',
    db.Column('session_id', db.Integer, db.ForeignKey('training_sessions.id'), primary_key=True),
    db.Column('soldier_id', db.Integer, db.ForeignKey('soldiers.id'), primary_key=True)
)

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128)) # <<< SỬA ĐỔI: Lưu password hash thay vì password gốc để bảo mật

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Soldier(db.Model):
    __tablename__ = 'soldiers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    unit = db.Column(db.String(100))
    rank = db.Column(db.String(50), nullable=False)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    shots = db.relationship('Shot', backref='soldier', lazy=True)
    
    # <<< SỬA ĐỔI: Quan hệ nhiều-nhiều với TrainingSession thông qua bảng session_soldiers >>>
    training_sessions = db.relationship('TrainingSession', secondary=session_soldiers, back_populates='soldiers', lazy='dynamic')

class Exercise(db.Model):
    __tablename__ = 'exercises'
    id = db.Column(db.Integer, primary_key=True)
    exercise_name = db.Column(db.String(100), unique=True, nullable=False)
    sessions = db.relationship('TrainingSession', backref='exercise', lazy=True)

class TrainingSession(db.Model):
    __tablename__ = 'training_sessions'
    id = db.Column(db.Integer, primary_key=True)
    session_name = db.Column(db.String(255), nullable=True)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'), nullable=False)
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime, nullable=True)
    
    shots = db.relationship('Shot', backref='session', lazy=True, cascade="all, delete-orphan")
    
    # <<< SỬA ĐỔI: Quan hệ nhiều-nhiều với Soldier >>>
    soldiers = db.relationship('Soldier', secondary=session_soldiers, back_populates='training_sessions', lazy='dynamic')

class Shot(db.Model):
    __tablename__ = 'shots'
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('training_sessions.id'), nullable=False)
    soldier_id = db.Column(db.Integer, db.ForeignKey('soldiers.id'), nullable=False)
    shot_time = db.Column(db.DateTime, default=datetime.utcnow)
    score = db.Column(db.Float, nullable=False)
    
    # <<< THÊM MỚI: Các trường để lưu trữ dữ liệu phong phú hơn >>>
    target_name = db.Column(db.String(50)) # Ví dụ: 'bia_so_4', 'bia_so_7_8'
    hit_location_x = db.Column(db.Float)   # Tọa độ X trên bia gốc
    hit_location_y = db.Column(db.Float)   # Tọa độ Y trên bia gốc
    result_image_path = db.Column(db.String(255)) # Đường dẫn tới file ảnh kết quả

def init_db(app):
    with app.app_context():
        db.init_app(app)
        db.create_all()
        
        # Khởi tạo người dùng admin nếu chưa có
        if not User.query.filter_by(username='admin').first():
            admin_user = User(username='admin')
            admin_user.set_password('123') # <<< SỬA ĐỔI: Mã hóa mật khẩu
            db.session.add(admin_user)
            db.session.commit()
            
        # Khởi tạo các bài tập mẫu nếu chưa có
        if not Exercise.query.all():
            ex1 = Exercise(exercise_name='Phân đoạn 1 - Bắn bia số 4')
            ex2 = Exercise(exercise_name='Phân đoạn 2 - Bắn bia số 7-8')
            db.session.add_all([ex1, ex2])
            db.session.commit()