import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from accounts.models import CustomUser

print(f"Total Users: {CustomUser.objects.count()}")

print("\nDetail User List:")
print(f"{'Username':<20} | {'Role':<10} | {'ID':<5}")
print("-" * 40)
for user in CustomUser.objects.all():
    print(f"{user.username:<20} | {user.role:<10} | {user.id:<5}")
