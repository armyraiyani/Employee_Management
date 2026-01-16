import os
import django
import sys
import json

# Setup Django environment
sys.path.append(r'C:\Users\LENOVO\Desktop\internship project\ems_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from accounts.models import Payroll, Employee
from accounts.serializers import PayrollSerializer

print("--- Debugging Serializer ---\n")

employee = Employee.objects.get(user__username='army_01')
payrolls = Payroll.objects.filter(employee=employee)

print(f"Found {payrolls.count()} records.")

serializer = PayrollSerializer(payrolls, many=True)
data = serializer.data

import json
print(json.dumps(data, indent=2, default=str))

print("\n--- End Debug ---")
