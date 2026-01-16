import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from accounts.models import CustomUser, Employee

print(f"{'Username':<20} | {'Role':<10} | {'Has Profile'}")
print("-" * 50)
for user in CustomUser.objects.all():
    has_profile = hasattr(user, 'employee_profile')
    print(f"{user.username:<20} | {user.role:<10} | {has_profile}")
