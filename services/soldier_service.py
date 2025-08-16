from models import db, Soldier

def list_soldiers():
    return Soldier.query.order_by(Soldier.created_at.desc()).all()

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
