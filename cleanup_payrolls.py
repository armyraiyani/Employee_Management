import os
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from accounts.models import Payroll

def cleanup_future_payrolls():
    today = timezone.localdate()
    # We want to delete any payroll where the month is strictly in the future.
    # Payroll month is stored as a date (usually 1st of the month).
    # If today is Jan 13, 2026.
    # Feb 1, 2026 is > today.
    
    future_payrolls = Payroll.objects.filter(month__gt=today)
    count = future_payrolls.count()
    
    print(f"Found {count} future payroll records.")
    if count > 0:
        future_payrolls.delete()
        print("Successfully deleted future payroll records.")
    else:
        print("No future payroll records found.")

if __name__ == '__main__':
    cleanup_future_payrolls()
