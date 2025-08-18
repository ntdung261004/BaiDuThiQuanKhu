# controllers/soldier_controller.py
from flask import Blueprint, jsonify, request
from flask_login import login_required
import services.soldier_service as soldier_service
from models import Soldier

# Blueprint đặt prefix "/api/soldiers"
soldier_bp = Blueprint('soldier_bp', __name__, url_prefix="/api/soldiers")

@soldier_bp.route("/", methods=['GET'])
@login_required
def get_soldiers():
    """
    Trả về danh sách tất cả chiến sĩ dưới dạng JSON.
    Endpoint: GET /api/soldiers/
    """
    soldiers = soldier_service.list_soldiers()
    return jsonify([
        {
            'id': s.id,
            'name': s.name,
            'unit': s.unit or '',
            'rank': s.rank or '',
            'notes': s.notes or '',
            'created_at': s.created_at.isoformat()
        } for s in soldiers
    ])


@soldier_bp.route("/", methods=['POST'])
@login_required
def create_soldier():
    """
    Tạo mới một chiến sĩ.
    Endpoint: POST /api/soldiers/
    Accepts: JSON or form data { name, unit, rank, notes }
    """
    try:
        data = request.get_json(silent=True) or request.form
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'error': 'Tên chiến sĩ là bắt buộc'}), 400
        soldier = soldier_service.create_soldier(
            name=name,
            unit=data.get('unit'),
            rank=data.get('rank'),
            notes=data.get('notes')
        )
        return jsonify({'message': 'Tạo thành công', 'id': soldier.id})
    except Exception as e:
        # Trả lỗi chung để client biết
        return jsonify({'error': 'Lỗi khi tạo chiến sĩ', 'detail': str(e)}), 500


@soldier_bp.route("/<int:soldier_id>", methods=['PUT', 'PATCH'])
@login_required
def update_soldier(soldier_id):
    """
    Cập nhật chiến sĩ theo ID.
    Endpoint: PATCH /api/soldiers/<id>
    """
    try:
        data = request.get_json(silent=True) or {}
        soldier_service.update_soldier(soldier_id, data)
        return jsonify({'message': 'Cập nhật thành công'})
    except Exception as e:
        return jsonify({'error': 'Lỗi khi cập nhật', 'detail': str(e)}), 500


@soldier_bp.route("/<int:soldier_id>", methods=['DELETE'])
@login_required
def delete_soldier(soldier_id):
    """
    Xoá chiến sĩ theo ID.
    Endpoint: DELETE /api/soldiers/<id>
    """
    try:
        soldier_service.delete_soldier(soldier_id)
        return jsonify({'message': 'Đã xoá chiến sĩ'})
    except Exception as e:
        return jsonify({'error': 'Lỗi khi xoá', 'detail': str(e)}), 500


@soldier_bp.route('/count', methods=['GET'])
@login_required
def get_soldier_count():
    """
    Trả về số lượng chiến sĩ.
    Endpoint: GET /api/soldiers/count
    """
    total_soldiers = Soldier.query.count()
    print("tổng CS: ", total_soldiers)
    return jsonify({'total': total_soldiers})

# Endpoint mới để lấy thông tin một chiến sĩ cụ thể
@soldier_bp.route('/<int:soldier_id>', methods=['GET'])
def get_soldier(soldier_id):
    soldier = Soldier.query.get(soldier_id)
    if not soldier:
        return jsonify({'error': 'Không tìm thấy chiến sĩ'}), 404
    
    soldier_info = {
        'id': soldier.id,
        'name': soldier.name,
        'unit': soldier.unit,
        'rank': soldier.rank,
        'notes': soldier.notes
    }
    return jsonify(soldier_info)
