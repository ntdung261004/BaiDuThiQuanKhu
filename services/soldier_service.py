from models import db, Soldier

def list_soldiers(page=1, per_page=10, search_query=None, unit_filter=None, sort_by='created_at', sort_order='desc'):
    """
    Lấy danh sách chiến sĩ có phân trang, tìm kiếm, lọc và sắp xếp.
    """
    query = Soldier.query

    if search_query:
        query = query.filter(Soldier.name.ilike(f'%{search_query}%'))
    
    if unit_filter:
        query = query.filter(Soldier.unit == unit_filter)

    # === BẮT ĐẦU PHẦN THÊM MỚI: LOGIC SẮP XẾP ===
    sort_column = getattr(Soldier, sort_by, Soldier.created_at) # Mặc định sắp xếp theo ngày tạo
    if sort_order == 'asc':
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())
    # === KẾT THÚC PHẦN THÊM MỚI ===

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return pagination

def create_soldier(name, unit=None, rank=None, notes=None):
    soldier = Soldier(
        name=name.strip(),
        unit=(unit or None),
        rank=(rank or None),
        notes=(notes or None),
    )
    db.session.add(soldier)
    db.session.commit()
    return soldier

def update_soldier(soldier_id, data: dict):
    soldier = Soldier.query.get_or_404(soldier_id)
    if 'name' in data:
        soldier.name = (data.get('name') or soldier.name).strip()
    if 'unit' in data:
        soldier.unit = (data.get('unit') or None)
    if 'rank' in data:
        soldier.rank = (data.get('rank') or None)
    if 'notes' in data:
        soldier.notes = (data.get('notes') or None)
    db.session.commit()
    return soldier

def delete_soldier(soldier_id):
    soldier = Soldier.query.get_or_404(soldier_id)
    db.session.delete(soldier)
    db.session.commit()
    return True
