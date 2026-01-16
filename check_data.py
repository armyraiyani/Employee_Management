import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from accounts.models import CustomUser, Employee, Payroll, LeaveRequest, ProfileUpdateRequest

print(f"Users: {CustomUser.objects.count()}")
print(f"Employees: {Employee.objects.count()}")
print(f"Payroll Records: {Payroll.objects.count()}")
print(f"Leave Requests: {LeaveRequest.objects.count()}")
print(f"Profile Update Requests: {ProfileUpdateRequest.objects.count()}")

# Print details of a few payroll records if they exist to check dates/status
if Payroll.objects.exists():
    print("\nRecent Payroll Records:")
    for salary in Payroll.objects.all().order_by('-month')[:5]:
        print(f"- {salary.employee.user.get_full_name()} | {salary.month} | Amount: {salary.amount}")

# Print Users to help with debugging
if CustomUser.objects.exists():
    print("\nUsers found:")
    for u in CustomUser.objects.all():
         print(f"- {u.username} (Role: {u.role})")
