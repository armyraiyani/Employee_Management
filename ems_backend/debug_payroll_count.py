import os
import django
import sys

# Setup Django
sys.path.append(r'c:\Users\LENOVO\Desktop\internship project\ems_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from accounts.models import Employee, Attendance
from datetime import date

# Change to the employee ID from the screenshot if known, or just check the one with joining date 2026-01-07
emp = Employee.objects.filter(date_of_joining__year=2026, date_of_joining__month=1, date_of_joining__day=7).first()
if emp:
    print(f"Checking Attendance for {emp.user.username} (ID: {emp.id})")
    records = Attendance.objects.filter(employee=emp, date__month=1, date__year=2026).order_by('date')
    for r in records:
        print(f"Date: {r.date}, Status: '{r.status}', Check-in: {r.check_in_time}, Check-out: {r.check_out_time}")
else:
    print("Employee join on 2026-01-07 not found.")
