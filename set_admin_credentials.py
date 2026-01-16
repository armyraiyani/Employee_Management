
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from accounts.models import CustomUser

def set_admin_credentials():
    username = 'admin'
    password = 'Admin@_123'
    
    try:
        if CustomUser.objects.filter(username=username).exists():
            print(f"User '{username}' found. Updating credentials...")
            user = CustomUser.objects.get(username=username)
            user.set_password(password)
            user.role = 'ADMIN'
            user.is_superuser = True
            user.is_staff = True
            user.save()
            print("Credentials updated successfully.")
        else:
            print(f"User '{username}' not found. Creating new admin user...")
            user = CustomUser.objects.create_superuser(
                username=username,
                email='admin@example.com',
                password=password
            )
            user.role = 'ADMIN'
            user.save()
            print("New admin user created successfully.")
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    set_admin_credentials()
