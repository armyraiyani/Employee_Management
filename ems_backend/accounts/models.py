from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('EMPLOYEE', 'Employee'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='EMPLOYEE')
    raw_password = models.CharField(max_length=128, blank=True, null=True) # For admin reference
   
    def __str__(self):
        return self.username

class Department(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class Employee(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='employee_profile')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    designation = models.CharField(max_length=100, blank=True, null=True)
    salary = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    date_of_joining = models.DateField(default=timezone.localdate, null=True, blank=True)
    resume = models.FileField(upload_to='resumes/', null=True, blank=True)
    resume_2 = models.FileField(upload_to='resumes/', null=True, blank=True)
    
    def __str__(self):
        return self.user.username


class Holiday(models.Model):
    date = models.DateField(unique=True)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.date}"

class WorkSchedule(models.Model):
    standard_check_in = models.TimeField(default='09:00:00')
    standard_check_out = models.TimeField(default='18:00:00')
    check_in_tolerance = models.IntegerField(default=15) 
    check_out_tolerance = models.IntegerField(default=15)
    half_day_threshold = models.TimeField(default='15:30:00')
    off_days = models.CharField(max_length=20, default='0') 
    
    def __str__(self):
        return "Schedule Settings"


class Attendance(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField(default=timezone.localdate)
    status = models.CharField(max_length=15, choices=(('Present', 'Present'), ('Absent', 'Absent'), ('Half Day', 'Half Day'), ('Leave', 'Leave'), ('Holiday', 'Holiday'), ('Pending', 'Pending')), default='Absent')
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    remarks = models.CharField(max_length=50, blank=True, null=True)
    is_dismissed_by_admin = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ('employee', 'date')
    def __str__(self):
        return f"{self.employee.user.username} - {self.date}"

class ProfileUpdateRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='profile_requests')
    new_username = models.CharField(max_length=150, null=True, blank=True)
    new_email = models.EmailField(null=True, blank=True)
    new_address = models.TextField(null=True, blank=True)
    new_phone_number = models.CharField(max_length=15, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    is_seen_by_employee = models.BooleanField(default=True)
    is_seen_by_admin = models.BooleanField(default=False)
    is_dismissed_by_employee = models.BooleanField(default=False)
    is_dismissed_by_admin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Update Request from {self.employee.user.username} - {self.status}"

class LeaveRequest(models.Model):
    LEAVE_TYPES = [
        ('Sick Leave', 'Sick Leave'),
        ('Casual Leave', 'Casual Leave'),
        ('Annual Leave', 'Annual / Paid Leave'),
        ('Unpaid Leave', 'Unpaid Leave'),
        ('Emergency Leave', 'Emergency Leave'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.CharField(max_length=50, choices=LEAVE_TYPES)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    is_half_day = models.BooleanField(default=False)
    attachment = models.FileField(upload_to='leave_attachments/', null=True, blank=True)
    contact_number = models.CharField(max_length=15, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    is_seen_by_employee = models.BooleanField(default=True) 
    is_seen_by_admin = models.BooleanField(default=False)
    is_dismissed_by_employee = models.BooleanField(default=False)
    is_dismissed_by_admin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.employee.user.username} - {self.leave_type} ({self.status})"

class Payroll(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payroll_records')
    payment_date = models.DateField(auto_now_add=True)
    month = models.DateField() 
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, default='PAID')
    is_seen_by_employee = models.BooleanField(default=False)
    is_dismissed_by_employee = models.BooleanField(default=False)
    message = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('employee', 'month')

    def __str__(self):
        return f"Payroll - {self.employee.user.username} - {self.month.strftime('%B %Y')}"
