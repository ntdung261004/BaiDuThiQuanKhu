from models import db, TrainingSession, SessionStatus

def list_sessions(status_filter=None, exercise_filter=None, sort_by='date_created', sort_order='desc'):
    """
    Lấy danh sách phiên tập có hỗ trợ lọc và sắp xếp.
    """
    query = TrainingSession.query

    if status_filter:
        query = query.filter(TrainingSession.status == SessionStatus[status_filter])
    
    if exercise_filter:
        query = query.filter(TrainingSession.exercise_id == exercise_filter)

    # Logic sắp xếp
    order_column = None
    if sort_by == 'session_name':
        order_column = TrainingSession.session_name
    else: # Mặc định hoặc khi sort_by == 'date_created'
        order_column = TrainingSession.date_created

    # Áp dụng thứ tự sắp xếp (asc/desc)
    if sort_order == 'asc':
        query = query.order_by(order_column.asc())
    else:
        query = query.order_by(order_column.desc())
    # --- KẾT THÚC PHẦN SỬA ĐỔI ---

    return query.all()