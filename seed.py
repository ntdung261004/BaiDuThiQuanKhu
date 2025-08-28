# seed.py
import random
from faker import Faker
from app import app, db
from models import Soldier, Exercise, TrainingSession, Shot, SessionStatus, session_soldiers

# Khởi tạo Faker để tạo dữ liệu giả
fake = Faker('vi_VN') # Sử dụng ngôn ngữ Tiếng Việt

def create_fake_soldiers(n=15):
    """Tạo ra n chiến sĩ giả."""
    ranks = ['Binh nhất', 'Binh nhì', 'Hạ sĩ', 'Trung sĩ', 'Thượng sĩ']
    units = ['Đại đội 1', 'Đại đội 2', 'Tiểu đoàn 301', 'Trung đoàn 14']
    soldiers = []
    for _ in range(n):
        soldier = Soldier(
            name=fake.name(),
            rank=random.choice(ranks),
            unit=random.choice(units),
            notes=fake.sentence(nb_words=10)
        )
        soldiers.append(soldier)
    db.session.add_all(soldiers)
    print(f"✅ Đã tạo {n} chiến sĩ.")

def create_fake_exercises(n=5):
    """Tạo ra n bài tập giả."""
    exercise_names = [
        "Phân đoạn 1 - Bắn bia số 4",
        "Phân đoạn 2 - Bắn bia số 7, 8",
        "Bắn mục tiêu ẩn hiện ban ngày",
        "Kiểm tra 3 tư thế (nằm, quỳ, đứng)",
        "Bắn ứng dụng ban đêm"
    ]
    for i in range(n):
        exercise = Exercise(
            exercise_name=exercise_names[i] if i < len(exercise_names) else f"Bài tập tùy chỉnh {i+1}",
        )
        db.session.add(exercise)
    print(f"✅ Đã tạo {n} bài tập.")

def create_fake_sessions_and_shots():
    """Tạo các phiên tập và các phát bắn cho chúng."""
    soldiers = Soldier.query.all()
    exercises = Exercise.query.all()

    if not soldiers or not exercises:
        print(" Lỗi: Cần có chiến sĩ và bài tập trước khi tạo phiên.")
        return

    session_count = 0
    for i in range(8): # Tạo 8 phiên tập
        session_name = f"Phiên tập ngày {fake.day_of_month()}/{fake.month()}"
        exercise = random.choice(exercises)

        # Chọn ngẫu nhiên 3 đến 8 chiến sĩ cho phiên này
        session_soldiers = random.sample(soldiers, k=random.randint(3, 8))

        # Đặt trạng thái ngẫu nhiên
        status = random.choices(
            [SessionStatus.NOT_STARTED, SessionStatus.IN_PROGRESS, SessionStatus.COMPLETED],
            weights=[1, 2, 5], # Tỷ lệ: 5 phiên hoàn thành, 2 phiên đang diễn ra, 1 chưa bắt đầu
            k=1
        )[0]

        session = TrainingSession(
            session_name=session_name,
            exercise=exercise,
            status=status,
            soldiers=session_soldiers
        )
        db.session.add(session)
        db.session.commit() # Commit để lấy session.id

        # Chỉ tạo phát bắn cho các phiên Đang diễn ra hoặc Đã hoàn thành
        if status != SessionStatus.NOT_STARTED:
            shot_count_total = 0
            for soldier in session_soldiers:
                num_shots = random.randint(5, 20) # Mỗi chiến sĩ bắn từ 5-20 viên
                for _ in range(num_shots):
                    shot = Shot(
                        session_id=session.id,
                        soldier_id=soldier.id,
                        score=round(random.uniform(5.0, 10.0), 1),
                        target_name=f"Bia số {random.randint(1, 10)}"
                    )
                    db.session.add(shot)
                shot_count_total += num_shots
            print(f"  -> Đã tạo {shot_count_total} phát bắn cho phiên #{session.id} ({status.name})")

        session_count += 1
    print(f"✅ Đã tạo {session_count} phiên tập và các phát bắn liên quan.")


if __name__ == '__main__':
    # Đặt ứng dụng vào ngữ cảnh để có thể thao tác với database
    with app.app_context():
        print("Bắt đầu gieo dữ liệu...")

        # Xóa toàn bộ dữ liệu cũ trong các bảng
        # Chú ý: Thứ tự xóa quan trọng để không vi phạm khóa ngoại
        Shot.query.delete()
        db.session.execute(session_soldiers.delete())
        TrainingSession.query.delete()
        Soldier.query.delete()
        Exercise.query.delete()
        db.session.commit()
        print(" Dữ liệu cũ đã được dọn dẹp.")

        # Tạo dữ liệu mới
        create_fake_exercises()
        create_fake_soldiers()
        db.session.commit() # Commit để đảm bảo chiến sĩ và bài tập có ID

        create_fake_sessions_and_shots()
        db.session.commit()

        print("\n🎉 Gieo dữ liệu thành công! 🎉")