import os
import django
from django.conf import settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from accounts.models import CustomUser

try:
    user = CustomUser.objects.get(username='ayushi_togadiya2682')
    token, created = Token.objects.get_or_create(user=user)
    print(f"User: {user.username}")
    print(f"Token: {token.key}")

    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)

    endpoints = [
        '/api/attendance/',
        '/api/leaves/',
    ]

    for ep in endpoints:
        resp = client.get(ep)
        print(f"{ep} -> {resp.status_code}")

except CustomUser.DoesNotExist:
    print("User not found")
