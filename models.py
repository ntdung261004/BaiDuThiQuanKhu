from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

# Bảng hiện có của bạn
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)

    def check_password(self, password):
        return self.password == password

class Soldier(db.Model):
    __tablename__ = 'soldiers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    unit = db.Column(db.String(100))
    rank = db.Column(db.String(50), nullable=False)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
# --- Bảng Exercises ---
class Exercise(db.Model):
    __tablename__ = 'exercises'
    id = db.Column(db.Integer, primary_key=True)
    exercise_name = db.Column(db.String(100), unique=True, nullable=False)

# --- Bảng TrainingSessions đã chỉnh sửa ---
class TrainingSession(db.Model):
    __tablename__ = 'training_sessions'
    id = db.Column(db.Integer, primary_key=True)
    session_name = db.Column(db.String(255), nullable=True)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=True)
    end_time = db.Column(db.DateTime, nullable=True)

class Shot(db.Model):
    __tablename__ = 'shots'
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('training_sessions.id'), nullable=False)
    soldier_id = db.Column(db.Integer, db.ForeignKey('soldiers.id'), nullable=False)
    shot_time = db.Column(db.DateTime, default=datetime.utcnow)
    score = db.Column(db.Float, nullable=False)
    image_data = db.Column(db.Text, nullable=True)

# --- Khởi tạo cơ sở dữ liệu ---
def init_db(app):
    with app.app_context():
        db.init_app(app)
        db.create_all()
        
        if not User.query.filter_by(username='admin').first():
            admin_user = User(username='admin', password='123')
            db.session.add(admin_user)
            db.session.commit()
            
        if not Exercise.query.all():
            ex1 = Exercise(exercise_name='Phân đoạn 1 - Bắn bia số 4')
            ex2 = Exercise(exercise_name='Phân đoạn 2 - Bắn bia số 7')
            ex3 = Exercise(exercise_name='Phân đoạn 3 - Bắn bia số 8')
            db.session.add_all([ex1, ex2, ex3])
            db.session.commit()