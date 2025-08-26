# controllers/training_controller.py

from flask import Blueprint, request, jsonify, session
from models import db, Exercise, TrainingSession, Soldier, Shot, SessionStatus
from controllers.pi_controller import ACTIVE_SHOOTER_STATE, latest_processed_data
import time

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
            'id': session.id, 
            'session_name': session.session_name, 
            'exercise_name': exercise_name,
            'status': session.status.name # .name sẽ trả về 'NOT_STARTED', 'IN_PROGRESS'...
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
    session_obj = db.session.get(TrainingSession, session_id)
    if not session_obj:
        return jsonify({'error': 'Không tìm thấy phiên tập'}), 404

    soldiers_in_session = []
    for soldier in session_obj.soldiers:
        # Đếm số lần bắn của chiến sĩ này TRONG phiên tập này
        shot_count = Shot.query.filter_by(session_id=session_id, soldier_id=soldier.id).count()
        soldiers_in_session.append({
            'id': soldier.id, 
            'name': soldier.name, 
            'rank': soldier.rank,
            'shot_count': shot_count # Thêm số phát bắn vào dữ liệu trả về
        })
    
    session_details = {
        'id': session_obj.id,
        'session_name': session_obj.session_name,
        'exercise_name': session_obj.exercise.exercise_name,
        'soldiers': soldiers_in_session,
        'status': session_obj.status.name 
    }
    return jsonify(session_details)

@training_bp.route('/api/sessions/<int:session_id>/shots', methods=['GET'])
def get_session_shots(session_id):
    """API mới để lấy lịch sử bắn của một phiên."""
    session_obj = db.session.get(TrainingSession, session_id)
    if not session_obj:
        return jsonify({'error': 'Không tìm thấy phiên tập'}), 404
        
    shots_history = []
    # Sắp xếp các lần bắn theo thời gian mới nhất lên đầu
    shots = Shot.query.filter_by(session_id=session_id).order_by(Shot.shot_time.desc()).all()
    
    for shot in shots:
        shots_history.append({
            'id': shot.id,
            'score': shot.score,
            'shot_time': shot.shot_time.strftime('%H:%M:%S'),
            'target_name': shot.target_name,
            'soldier_name': shot.soldier.name,
            'soldier_rank': shot.soldier.rank
        })
    return jsonify(shots_history)

# API để kích hoạt xạ thủ đang bắn >>>
@training_bp.route('/api/activate_shooter', methods=['POST'])
def activate_shooter():
    data = request.get_json()
    session_id = data.get('session_id')
    soldier_id = data.get('soldier_id')

    if not session_id or not soldier_id:
        return jsonify({'error': 'Thiếu thông tin'}), 400

    # <<< SỬA ĐỔI LOGIC TẠI ĐÂY >>>
    # Thay vì lưu vào session, hãy cập nhật vào biến trạng thái toàn cục
    ACTIVE_SHOOTER_STATE['session_id'] = session_id
    ACTIVE_SHOOTER_STATE['soldier_id'] = soldier_id
    ACTIVE_SHOOTER_STATE['heartbeat'] = time.time()
    
    # Reset lại dữ liệu của phát bắn cuối cùng trên server
    # để tránh client lấy phải dữ liệu cũ
    latest_processed_data.update({
        'time': '--:--:--',
        'target': '--',
        'score': '--.-',
        'image_data': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'shot_id': None # Rất quan trọng để tránh race condition ở frontend
    })
    
    soldier = db.session.get(Soldier, soldier_id)
    if soldier:
        print(f"🔫 Đã kích hoạt xạ thủ: {soldier.rank} {soldier.name} cho phiên {session_id}")
        return jsonify({'status': 'success', 'message': f'Đã kích hoạt xạ thủ {soldier.name}'})
    else:
        return jsonify({'error': 'Không tìm thấy chiến sĩ'}), 404
    
@training_bp.route('/api/session/<int:session_id>/active_shooter', methods=['GET'])
def get_active_shooter_for_session(session_id):
    """
    API để kiểm tra xem có xạ thủ nào đang hoạt động cho phiên này không.
    """
    active_session_id = ACTIVE_SHOOTER_STATE.get('session_id')
    active_soldier_id = ACTIVE_SHOOTER_STATE.get('soldier_id')

    # Chỉ trả về ID xạ thủ nếu phiên đang hoạt động khớp với phiên đang xem
    if active_session_id and int(active_session_id) == session_id:
        return jsonify({'active_soldier_id': active_soldier_id})
    
    return jsonify({'active_soldier_id': None})

# API để kích hoạt 1 phiên huấn luyện mới >>>
@training_bp.route('/api/training_sessions/<int:session_id>/start', methods=['POST'])
def start_training_session(session_id):
    """
    API để cập nhật trạng thái của một phiên thành IN_PROGRESS.
    """
    try:
        session_to_start = db.session.get(TrainingSession, session_id)
        if not session_to_start:
            return jsonify({'message': 'Không tìm thấy phiên tập.'}), 404

        # Chỉ đổi trạng thái nếu phiên chưa bắt đầu để tránh các xử lý không cần thiết
        if session_to_start.status == SessionStatus.NOT_STARTED:
            session_to_start.status = SessionStatus.IN_PROGRESS
            db.session.commit()
            print(f"✅ Trạng thái phiên #{session_id} đã chuyển thành IN_PROGRESS.")
        
        return jsonify({'message': 'Phiên đã được bắt đầu.', 'status': 'IN_PROGRESS'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Lỗi khi bắt đầu phiên: {e}")
        return jsonify({'message': 'Lỗi server: ' + str(e)}), 500

# API để kết thúc 1 phiên huấn luyện>>>  
@training_bp.route('/api/training_sessions/<int:session_id>/finish', methods=['POST'])
def finish_training_session(session_id):
    """
    API để cập nhật trạng thái của một phiên thành COMPLETED.
    """
    try:
        session_to_finish = db.session.get(TrainingSession, session_id)
        if not session_to_finish:
            return jsonify({'message': 'Không tìm thấy phiên tập.'}), 404

        session_to_finish.status = SessionStatus.COMPLETED
        db.session.commit()
        print(f"✅ Trạng thái phiên #{session_id} đã chuyển thành COMPLETED.")
        
        return jsonify({'message': 'Phiên đã được kết thúc.', 'status': 'COMPLETED'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Lỗi khi kết thúc phiên: {e}")
        return jsonify({'message': 'Lỗi server: ' + str(e)}), 500
 
@training_bp.route('/api/deactivate_shooter', methods=['POST'])
def deactivate_shooter():
    """
    API để hủy kích hoạt xạ thủ, reset trạng thái về mặc định.
    Được gọi khi người dùng rời khỏi trang chi tiết phiên tập.
    """
    global ACTIVE_SHOOTER_STATE
    ACTIVE_SHOOTER_STATE = {
        'session_id': None,
        'soldier_id': None,
        'heartbeat': 0
    }
    print("🔴 Xạ thủ đã được hủy kích hoạt.")
    return jsonify({'status': 'deactivated'}), 200