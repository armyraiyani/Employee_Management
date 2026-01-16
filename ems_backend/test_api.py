import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from django.test import Client
from accounts.models import CustomUser

try:
    user = CustomUser.objects.get(username='ayushi_togadiya2682')
    print(f"User: {user.username}")
    
    c = Client()
    c.force_login(user)
    
    endpoints = [
        '/api/attendance/',
        '/api/attendance/holidays/',
        '/api/attendance/schedule/',
        '/api/leaves/',
    ]
    
    for ep in endpoints:
        try:
            response = c.get(ep, HTTP_HOST='127.0.0.1')
            print(f"{ep} -> {response.status_code}")
        except Exception as e:
            print(f"{ep} -> EXCEPTION: {e}")
            
except CustomUser.DoesNotExist:
    print("User not found.")
