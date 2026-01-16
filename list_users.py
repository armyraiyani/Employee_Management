import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()
from accounts.models import CustomUser
for u in CustomUser.objects.all():
    print(f"User: {u.username}, Role: {u.role}")
