# controllers/report_controller.py

from flask import Blueprint, jsonify
from sqlalchemy import func, case
from models import db, TrainingSession, Soldier, Shot, Exercise

# Tạo một Blueprint mới cho các chức năng báo cáo
report_bp = Blueprint('report_bp', __name__, url_prefix='/api/report')

# Thay thế hoàn toàn hàm get_session_report cũ bằng hàm này
@report_bp.route('/session/<int:session_id>', methods=['GET'])
def get_session_report(session_id):
    """
    API trả về dữ liệu báo cáo tổng hợp cho một phiên tập cụ thể.
    """
    session = db.session.get(TrainingSession, session_id)
    if not session:
        return jsonify({'error': 'Không tìm thấy phiên tập'}), 404

    # 1. Tính các chỉ số tổng quan cho toàn phiên (Phần này đã đúng)
    overall_stats = db.session.query(
        func.count(Shot.id).label('total_shots'),
        func.avg(Shot.score).label('avg_score'),
        func.sum(case((Shot.score > 0, 1), else_=0)).label('hit_shots')
    ).filter(Shot.session_id == session_id).one()

    total_shots = overall_stats.total_shots or 0
    avg_score = float(overall_stats.avg_score or 0)
    hit_rate = (overall_stats.hit_shots / total_shots * 100) if total_shots > 0 else 0

    # --- 2. SỬA LỖI LOGIC TẠI ĐÂY ---
    # Truy vấn lại để chỉ lấy thông tin của các xạ thủ TRONG PHIÊN NÀY
# --- 2. NÂNG CẤP TRUY VẤN ĐỂ LẤY THÊM SỐ PHÁT BẮN TRÚNG ---
    soldier_stats = db.session.query(
        Soldier.id,
        Soldier.name,
        Soldier.rank,
        func.count(Shot.id).label('soldier_total_shots'),
        func.avg(Shot.score).label('soldier_avg_score'),
        # <<< THÊM DÒNG NÀY ĐỂ ĐẾM SỐ PHÁT BẮN CÓ ĐIỂM > 0 >>>
        func.sum(case((Shot.score > 0, 1), else_=0)).label('soldier_hit_shots')
    ).join(Shot, Soldier.id == Shot.soldier_id).filter(
        Shot.session_id == session_id
    ).group_by(
        Soldier.id, Soldier.name, Soldier.rank
    ).order_by(
        func.avg(Shot.score).desc()
    ).all()

    soldiers_performance = [
        {
            'id': stat.id,
            'name': stat.name,
            'rank': stat.rank,
            'total_shots': stat.soldier_total_shots,
            'avg_score': round(float(stat.soldier_avg_score or 0), 2),
            'hit_shots': int(stat.soldier_hit_shots or 0) # <<< THÊM DỮ LIỆU MỚI VÀO RESPONSE >>>
        } for stat in soldier_stats
    ]

    # --- Tổng hợp thành một đối tượng JSON hoàn chỉnh ---
    report_data = {
        'session_id': session.id,
        'session_name': session.session_name,
        'exercise_name': session.exercise.exercise_name,
        'total_shots': total_shots,
        'avg_score': round(avg_score, 2),
        'hit_rate': round(hit_rate, 2),
        'soldiers_performance': soldiers_performance
    }

    return jsonify(report_data)

# Thêm hàm này vào cuối file controllers/report_controller.py
@report_bp.route('/soldier/<int:soldier_id>', methods=['GET'])
def get_soldier_report(soldier_id):
    """
    API trả về dữ liệu báo cáo tổng hợp cho một chiến sĩ cụ thể.
    """
    soldier = db.session.get(Soldier, soldier_id)
    if not soldier:
        return jsonify({'error': 'Không tìm thấy chiến sĩ'}), 404

    # --- Tính toán các chỉ số tổng quan của chiến sĩ này ---
    overall_stats = db.session.query(
        func.count(Shot.id).label('total_shots'),
        func.avg(Shot.score).label('avg_score'),
        func.count(func.distinct(Shot.session_id)).label('total_sessions'),
        func.sum(case((Shot.score > 0, 1), else_=0)).label('hit_shots')
    ).filter(Shot.soldier_id == soldier_id).one()

    total_shots = overall_stats.total_shots or 0
    avg_score = float(overall_stats.avg_score or 0)
    hit_rate = (overall_stats.hit_shots / total_shots * 100) if total_shots > 0 else 0

    # --- NÂNG CẤP: Lấy thành tích VÀ TÊN BÀI TẬP trong từng phiên ---
    sessions_query = db.session.query(
        TrainingSession.id,
        TrainingSession.session_name,
        Exercise.exercise_name, # <<< Lấy thêm tên bài tập
        func.avg(Shot.score).label('session_avg_score'),
        func.count(Shot.id).label('session_total_shots'),
        func.sum(case((Shot.score > 0, 1), else_=0)).label('session_hit_shots')
    ).join(Shot, Shot.session_id == TrainingSession.id
    ).join(Exercise, Exercise.id == TrainingSession.exercise_id # <<< Join với bảng Exercise
    ).filter(
        Shot.soldier_id == soldier_id
    ).group_by(
        TrainingSession.id, TrainingSession.session_name, Exercise.exercise_name
    ).order_by(TrainingSession.id.desc()).all()

    sessions_performance = [
        {
            'session_id': s.id,
            'session_name': s.session_name,
            'exercise_name': s.exercise_name, # <<< Thêm tên bài tập vào response
            'avg_score': round(float(s.session_avg_score or 0), 2),
            'total_shots': s.session_total_shots,
            'hit_shots': int(s.session_hit_shots or 0)
        } for s in sessions_query
    ]
    
    # <<< TÍNH TOÁN DỮ LIỆU MỚI: Thành tích theo từng loại bài tập >>>
    exercise_performance_query = db.session.query(
        Exercise.exercise_name,
        func.avg(Shot.score).label('avg_score')
    ).join(TrainingSession, TrainingSession.exercise_id == Exercise.id
    ).join(Shot, Shot.session_id == TrainingSession.id
    ).filter(
        Shot.soldier_id == soldier_id
    ).group_by(Exercise.exercise_name).all()

    performance_by_exercise = [
        {
            'exercise_name': e.exercise_name,
            'avg_score': round(float(e.avg_score or 0), 2)
        } for e in exercise_performance_query
    ]

    # --- Tổng hợp thành một đối tượng JSON hoàn chỉnh ---
    report_data = {
        'soldier_id': soldier.id,
        'soldier_name': soldier.name,
        'soldier_rank': soldier.rank,
        'overall_stats': {
            'total_sessions': overall_stats.total_sessions or 0,
            'total_shots': total_shots,
            'avg_score': round(avg_score, 2),
            'hit_rate': round(hit_rate, 2)
        },
        'sessions_performance': sessions_performance,
        'performance_by_exercise': performance_by_exercise
    }

    return jsonify(report_data)