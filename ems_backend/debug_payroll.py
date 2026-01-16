import os
import django
import sys

# Setup Django environment
sys.path.append(r'C:\Users\LENOVO\Desktop\internship project\ems_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from accounts.models import Payroll, Employee, CustomUser

print("--- Debugging Payroll ---\n")



with open('debug_output.txt', 'w') as f:
    f.write(f"DEBUG: Starting Payroll Check...\n")
    count = Payroll.objects.count()
    f.write(f"DEBUG: Total Payroll Records: {count}\n")

    if count > 0:
        for p in Payroll.objects.all():
            f.write(f"DEBUG: Payroll ID: {p.id}, Employee: {p.employee.user.username} (ID: {p.employee.id}), Month: {p.month}, Amount: {p.amount}\n")
    else:
        f.write("DEBUG: No Payroll records found.\n")

    f.write(f"DEBUG: Total Employees: {Employee.objects.count()}\n")


