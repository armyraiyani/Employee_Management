import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from accounts.models import CustomUser

print("Superusers:")
for u in CustomUser.objects.filter(is_superuser=True):
    print(f"Username: {u.username} | Role: {u.role} | Has Profile: {hasattr(u, 'employee_profile')}")

print("\nUsers with Role='ADMIN':")
for u in CustomUser.objects.filter(role='ADMIN'):
    print(f"Username: {u.username} | Role: {u.role} | Has Profile: {hasattr(u, 'employee_profile')}")
