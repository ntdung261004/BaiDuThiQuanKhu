# controllers/report_controller.py

from flask import Blueprint, jsonify
from sqlalchemy import func, case
from models import db, TrainingSession, Soldier, Shot

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
    soldier_stats = db.session.query(
        Soldier.id,
        Soldier.name,
        Soldier.rank,
        func.count(Shot.id).label('soldier_total_shots'),
        func.avg(Shot.score).label('soldier_avg_score')
    ).join(Shot, Soldier.id == Shot.soldier_id).filter(
        # Bộ lọc quan trọng: chỉ lấy các phát bắn thuộc phiên này
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
            'avg_score': round(float(stat.soldier_avg_score or 0), 2)
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

    # --- Lấy thành tích của chiến sĩ trong từng phiên đã tham gia ---
    sessions_query = db.session.query(
        TrainingSession.id,
        TrainingSession.session_name,
        func.avg(Shot.score).label('session_avg_score'),
        func.count(Shot.id).label('session_total_shots')
    ).join(Shot).filter(
        Shot.soldier_id == soldier_id,
        Shot.session_id == TrainingSession.id
    ).group_by(TrainingSession.id).order_by(TrainingSession.id.desc()).all()

    sessions_performance = [
        {
            'session_id': s.id,
            'session_name': s.session_name,
            'avg_score': round(float(s.session_avg_score or 0), 2),
            'total_shots': s.session_total_shots
        } for s in sessions_query
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
        'sessions_performance': sessions_performance
    }

    return jsonify(report_data)