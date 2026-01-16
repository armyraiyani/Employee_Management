import os
import django
import sys
from datetime import date

# Add the project directory to sys.path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from accounts.models import CustomUser, Employee, Attendance, LeaveRequest, WorkSchedule, Holiday
from accounts.serializers import AttendanceSerializer, LeaveRequestSerializer, HolidaySerializer, WorkScheduleSerializer

def check_user_data(username):
    print(f"--- Checking Data for {username} ---")
    try:
        user = CustomUser.objects.get(username=username)
        print(f"User: {user.username} (ID: {user.id}) | Role: {user.role}")
        
        try:
            emp = user.employee_profile
            print(f"Employee Profile Found: ID {emp.id}")
            
            # Check Attendance
            attendance_qs = Attendance.objects.filter(employee=emp).order_by('-date')
            print(f"Attendance Records: {attendance_qs.count()}")
            if attendance_qs.exists():
                print("Testing Attendance Serialization...")
                try:
                    data = AttendanceSerializer(attendance_qs, many=True).data
                    print("Attendance Serialization Success.")
                except Exception as e:
                    print(f"Attendance Serialization FAILED: {e}")

            # Check Leaves
            leaves_qs = LeaveRequest.objects.filter(employee=emp).order_by('-created_at')
            print(f"Leave Requests: {leaves_qs.count()}")
            if leaves_qs.exists():
                print("Testing Leave Serialization...")
                try:
                    data = LeaveRequestSerializer(leaves_qs, many=True).data
                    print("Leave Serialization Success.")
                except Exception as e:
                    print(f"Leave Serialization FAILED: {e}")

        except Employee.DoesNotExist:
            print("ERROR: No Employee Profile linked to this user!")

    except CustomUser.DoesNotExist:
        print(f"ERROR: User {username} does not exist.")

    print("\n--- Checking General Data ---")
    print(f"Holidays: {Holiday.objects.count()}")
    try:
        HolidaySerializer(Holiday.objects.all(), many=True).data
        print("Holiday Serialization Success.")
    except Exception as e: print(f"Holiday Serialization FAILED: {e}")

    print(f"WorkSchedule: {WorkSchedule.objects.count()}")
    try:
        WorkScheduleSerializer(WorkSchedule.objects.all(), many=True).data
        print("WorkSchedule Serialization Success.")
    except Exception as e: print(f"WorkSchedule Serialization FAILED: {e}")

if __name__ == "__main__":
    check_user_data('ayushi_togadiya2682')
