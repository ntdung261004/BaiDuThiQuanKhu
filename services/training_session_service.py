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
    sort_column = getattr(TrainingSession, sort_by, TrainingSession.date_created)
    if sort_order == 'asc':
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    return query.all()