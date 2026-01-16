import os
import django
import sys
from datetime import date
from decimal import Decimal

# Add the project directory to sys.path
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from accounts.models import Employee, Attendance, CustomUser
from accounts.views import compute_employee_salary

def test_salary_logic():
    # Setup a dummy employee
    user, _ = CustomUser.objects.get_or_create(username="test_payroll_user", defaults={"email": "test@test.com"})
    emp, _ = Employee.objects.get_or_create(user=user, defaults={"salary": Decimal("120000.00")}) # 10,000 per month
    
    # Clear existing attendance
    month_str = "2026-01-01"
    Attendance.objects.filter(employee=emp, date__month=1, date__year=2026).delete()
    
    print(f"Testing for Employee: {user.username}, Monthly Salary: 10,000")
    
    # Scenario 1: Clean month (all Present or Pending)
    # result = compute_employee_salary(emp, month_str)
    # print(f"Clean Month: Payable = {result['payable_amount']} (Expected 10000)")
    
    # Scenario 2: 1 Absent (Cut ~322.58 for 31 days)
    Attendance.objects.create(employee=emp, date=date(2026, 1, 2), status='Absent')
    result = compute_employee_salary(emp, month_str)
    print(f"1 Absent: Total Deduction = {result['total_deduction']}, Payable = {result['payable_amount']}")
    
    # Scenario 3: 1 Half Day (Cut ~161.29)
    Attendance.objects.create(employee=emp, date=date(2026, 1, 3), status='Half Day')
    result = compute_employee_salary(emp, month_str)
    print(f"1 Absent + 1 Half Day: Total Deduction = {result['total_deduction']}")
    
    # Scenario 4: 1 Leave (Paid)
    Attendance.objects.create(employee=emp, date=date(2026, 1, 4), status='Leave')
    result = compute_employee_salary(emp, month_str)
    print(f"1 Absent + 1 Half Day + 1 Leave: Extra Leaves = {result['stats']['extra_leaves']}, Deduction same as above")
    
    # Scenario 5: 2 Leaves (1 Paid, 1 Cut)
    Attendance.objects.create(employee=emp, date=date(2026, 1, 5), status='Leave')
    result = compute_employee_salary(emp, month_str)
    print(f"1 Abs + 1 Half + 2 Leaves: Extra Leaves = {result['stats']['extra_leaves']}, Deduction should increase by 1 day rate")
    
    # Cleanup
    # Attendance.objects.filter(employee=emp).delete()
    # emp.delete()
    # user.delete()

if __name__ == "__main__":
    test_salary_logic()
