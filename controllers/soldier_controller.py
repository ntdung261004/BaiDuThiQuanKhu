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
    Trả về danh sách chiến sĩ có phân trang, tìm kiếm, lọc và sắp xếp.
    """
    page = request.args.get('page', 1, type=int)
    search_query = request.args.get('search', '').strip()
    unit_filter = request.args.get('unit', '').strip()
    # === THÊM MỚI: Nhận tham số sắp xếp ===
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')

    pagination = soldier_service.list_soldiers(
        page=page, 
        per_page=10,
        search_query=search_query, 
        unit_filter=unit_filter,
        sort_by=sort_by, # << Truyền tham số
        sort_order=sort_order # << Truyền tham số
    )
    
    soldiers_data = [
        {
            'id': s.id,
            'name': s.name,
            'unit': s.unit or '',
            'rank': s.rank or '',
            'notes': s.notes or '',
        } for s in pagination.items
    ]

    return jsonify({
        'soldiers': soldiers_data,
        'pagination': {
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total_pages': pagination.pages,
            'total_items': pagination.total,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    })

@soldier_bp.route("/", methods=['POST'])
@login_required
def create_soldier():
    """
    Tạo mới một chiến sĩ.
    Bắt buộc phải có: name, rank, unit.
    """
    try:
        data = request.get_json(silent=True) or request.form
        name = (data.get('name') or '').strip()
        rank = (data.get('rank') or '').strip()
        unit = (data.get('unit') or '').strip()

        # === BẮT ĐẦU PHẦN NÂNG CẤP LOGIC LỖI ===
        if not all([name, rank, unit]):
            return jsonify({'error': 'Vui lòng nhập đầy đủ Tên, Cấp bậc và Đơn vị.'}), 400
        # === KẾT THÚC PHẦN NÂNG CẤP ===
            
        soldier = soldier_service.create_soldier(
            name=name,
            unit=unit,
            rank=rank,
            notes=data.get('notes')
        )
        return jsonify({'message': f'Đã thêm thành công chiến sĩ "{soldier.name}"', 'id': soldier.id})
        
    except Exception as e:
        return jsonify({'error': 'Lỗi server khi tạo chiến sĩ', 'detail': str(e)}), 500


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
        return jsonify({'message': 'Cập nhật chiến sĩ thành công'})
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
