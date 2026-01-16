import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from rest_framework.request import Request
from rest_framework.test import APIRequestFactory, force_authenticate
from accounts.models import CustomUser
from accounts.views import employee_list

# Get the admin user
user = CustomUser.objects.get(username='admin')
print(f"Testing as user: {user.username} (Role: {user.role})")

# Create a request
factory = APIRequestFactory()
request = factory.get('/api/employees/')
force_authenticate(request, user=user)

response = employee_list(request)

print(f"Status Code: {response.status_code}")
print(f"Data: {response.data}")
