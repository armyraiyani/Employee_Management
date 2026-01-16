import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from accounts.models import CustomUser, Employee

def setup_admin():
    username = 'admin'
    password = 'Admin@_123'
    email = 'admin@company.com'

    user, created = CustomUser.objects.get_or_create(
        username=username,
        defaults={
            'email': email,
            'role': 'ADMIN',
            'first_name': 'System',
            'last_name': 'Administrator',
            'is_staff': True,
            'is_superuser': True
        }
    )

    user.set_password(password)
    user.role = 'ADMIN' # Ensure role is set correctly
    user.save()

    # Ensure Employee profile exists for the admin (to avoid frontend breaks)
    Employee.objects.get_or_create(
        user=user,
        defaults={
            'designation': 'Administrator',
            'salary': 0
        }
    )

    if created:
        print(f"✓ Created new admin user: {username}")
    else:
        print(f"✓ Updated existing admin user: {username}")
    
    print(f"Credentials set: {username} / {password}")

if __name__ == '__main__':
    setup_admin()
