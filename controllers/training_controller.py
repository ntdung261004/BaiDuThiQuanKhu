# controllers/training_controller.py

from flask import Blueprint, request, jsonify
from models import db, Exercise, TrainingSession

training_bp = Blueprint('training_bp', __name__)

@training_bp.route('/api/exercises', methods=['GET'])
def get_exercises():
    try:
        exercises = Exercise.query.all()
        return jsonify([{'id': ex.id, 'exercise_name': ex.exercise_name} for ex in exercises])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@training_bp.route('/api/training_sessions', methods=['POST'])
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

@training_bp.route('/api/training_sessions', methods=['GET'])
def get_training_sessions():
    sessions = TrainingSession.query.order_by(TrainingSession.id.desc()).all()
    session_list = []
    for session in sessions:
        exercise_name = session.exercise.exercise_name if session.exercise else 'Không xác định'
        session_list.append({
            'id': session.id, 'session_name': session.session_name, 'exercise_name': exercise_name
        })
    return jsonify(session_list)

@training_bp.route('/api/training_sessions/<int:session_id>', methods=['DELETE'])
def delete_training_session(session_id):
    try:
        session = db.session.get(TrainingSession, session_id)
        if session is None:
            return jsonify({'message': 'Không tìm thấy phiên tập.'}), 404
        db.session.delete(session)
        db.session.commit()
        return jsonify({'message': 'Đã xóa phiên tập thành công.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Lỗi server: ' + str(e)}), 500

@training_bp.route('/api/training_sessions/<int:session_id>', methods=['PUT'])
def update_training_session(session_id):
    data = request.get_json()
    new_name = data.get('session_name')
    if not new_name:
        return jsonify({'message': 'Tên mới không được để trống.'}), 400
    try:
        session = db.session.get(TrainingSession, session_id)
        if session is None:
            return jsonify({'message': 'Không tìm thấy phiên tập.'}), 404
        session.session_name = new_name
        db.session.commit()
        return jsonify({'message': 'Cập nhật tên phiên thành công.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Lỗi server: ' + str(e)}), 500