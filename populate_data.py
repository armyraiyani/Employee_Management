import os
import django
import random
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from accounts.models import CustomUser, Employee, Department

def populate():
    # Departments
    depts = ['Engineering', 'Design', 'Marketing', 'Human Resources', 'Finance', 'Operations', 'Sales']
    dept_objs = []
    for d_name in depts:
        dept, _ = Department.objects.get_or_create(name=d_name)
        dept_objs.append(dept)

    # Designations
    designations = [
        'Junior Developer', 'Senior Developer', 'UI Designer', 'Lead Designer',
        'HR Manager', 'Financial Analyst', 'Marketing Specialist', 'Sales Representative',
        'Project Manager', 'DevOps Engineer'
    ]

    # Sample Data
    names = [
        ('Alice', 'Johnson'), ('Bob', 'Smith'), ('Charlie', 'Brown'), ('Diana', 'Prince'),
        ('Ethan', 'Hunt'), ('Fiona', 'Gallagher'), ('George', 'Costanza'), ('Hannah', 'Baker'),
        ('Ian', 'Wright'), ('Jane', 'Austen')
    ]

    for first, last in names:
        username = f"{first.lower()}.{last.lower()}"
        if not CustomUser.objects.filter(username=username).exists():
            user = CustomUser.objects.create_user(
                username=username,
                email=f"{username}@company.com",
                password="User@123",
                role='EMPLOYEE',
                first_name=first,
                last_name=last
            )
            
            # Employee Profile
            Employee.objects.create(
                user=user,
                department=random.choice(dept_objs),
                designation=random.choice(designations),
                phone_number=f"{random.randint(100,999)}-{random.randint(100,999)}-{random.randint(1000,9999)}"[:15],
                address=f"{random.randint(10,999)} Corporate Blvd, Suite {random.randint(1,100)}",
                salary=random.randint(45000, 120000),
                date_of_joining=timezone.now().date() - timezone.timedelta(days=random.randint(0, 365))
            )

    print("Successfully populated employee data!")

if __name__ == '__main__':
    populate()
