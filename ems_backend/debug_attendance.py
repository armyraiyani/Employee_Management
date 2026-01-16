import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from accounts.models import CustomUser, Attendance, Employee
from accounts.views import attendance_list

# Check DB content
print(f"Total Attendance Records: {Attendance.objects.count()}")
for att in Attendance.objects.all():
    print(f"- {att.employee.user.username} | {att.date} | {att.status} | In: {att.check_in_time} | Out: {att.check_out_time}")

# Test API for army_raiyani86
try:
    user = CustomUser.objects.get(username='army_raiyani86')
    print(f"\nTesting API for user: {user.username}")
    
    factory = APIRequestFactory()
    request = factory.get('/api/attendance/')
    force_authenticate(request, user=user)
    
    response = attendance_list(request)
    print(f"Status: {response.status_code}")
    print(f"Data count: {len(response.data)}")
    print(f"Data: {response.data}")

except CustomUser.DoesNotExist:
    print("User army_raiyani86 not found")
