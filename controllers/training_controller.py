# controllers/training_controller.py

from flask import Blueprint, request, jsonify, session
from models import db, Exercise, TrainingSession, Soldier

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
    session_name = data.get('session_name') or 'Phiên tập' # Dùng 'or' để có giá trị mặc định
    soldier_ids = data.get('soldier_ids') # Nhận danh sách ID chiến sĩ

    # Kiểm tra dữ liệu đầu vào
    if not exercise_id or not soldier_ids:
        return jsonify({'message': 'Thiếu thông tin bài tập hoặc danh sách chiến sĩ.'}), 400

    try:
        # Tạo một phiên tập mới
        new_session = TrainingSession(
            session_name=session_name, 
            exercise_id=exercise_id
        )
        
        # Tìm các đối tượng Soldier từ danh sách ID
        selected_soldiers = Soldier.query.filter(Soldier.id.in_(soldier_ids)).all()
        
        # Kiểm tra xem có tìm thấy đủ chiến sĩ không
        if len(selected_soldiers) != len(soldier_ids):
            return jsonify({'message': 'Một hoặc nhiều ID chiến sĩ không hợp lệ.'}), 400
            
        # Thêm các chiến sĩ đã chọn vào phiên tập
        new_session.soldiers.extend(selected_soldiers)
        
        # Lưu vào database
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
    
    # <<< THÊM MỚI: API để lấy chi tiết một phiên tập >>>

@training_bp.route('/api/training_sessions/<int:session_id>', methods=['GET'])
def get_session_details(session_id):
    session = db.session.get(TrainingSession, session_id)
    if not session:
        return jsonify({'error': 'Không tìm thấy phiên tập'}), 404

    # Lấy danh sách chiến sĩ tham gia phiên này
    soldiers_in_session = [{'id': s.id, 'name': s.name, 'rank': s.rank} for s in session.soldiers]
    
    session_details = {
        'id': session.id,
        'session_name': session.session_name,
        'exercise_name': session.exercise.exercise_name,
        'soldiers': soldiers_in_session
    }
    return jsonify(session_details)

# API để kích hoạt xạ thủ đang bắn >>>
@training_bp.route('/api/activate_shooter', methods=['POST'])
def activate_shooter():
    data = request.get_json()
    session_id = data.get('session_id')
    soldier_id = data.get('soldier_id')

    if not session_id or not soldier_id:
        return jsonify({'error': 'Thiếu thông tin'}), 400

    # Lưu vào session phía server, gắn liền với trình duyệt của người đội trưởng
    session['active_session_id'] = session_id
    session['active_soldier_id'] = soldier_id
    
    soldier = db.session.get(Soldier, soldier_id)
    print(f"🔫 Đã kích hoạt xạ thủ: {soldier.name} cho phiên {session_id}")
    return jsonify({'status': 'success', 'message': f'Đã kích hoạt xạ thủ {soldier.name}'})