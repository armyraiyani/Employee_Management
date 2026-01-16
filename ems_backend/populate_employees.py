import os
import django
import random
from datetime import date, timedelta

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ems_backend.settings')
django.setup()

from accounts.models import CustomUser, Employee, Department

# Sample data
first_names = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
    'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
    'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
    'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Dorothy', 'George', 'Melissa',
    'Edward', 'Deborah', 'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon',
    'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
    'Nicholas', 'Shirley', 'Eric', 'Angela', 'Jonathan', 'Helen', 'Stephen', 'Anna',
    'Larry', 'Brenda', 'Justin', 'Pamela', 'Scott', 'Nicole', 'Brandon', 'Emma'
]

last_names = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
    'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
    'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
    'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
    'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
    'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson'
]

departments_list = [
    'Engineering', 'Sales', 'Marketing', 'Human Resources', 'Finance',
    'Operations', 'Customer Support', 'Product Management', 'Design', 'Legal'
]

designations = [
    'Software Engineer', 'Senior Developer', 'Team Lead', 'Project Manager',
    'Sales Executive', 'Marketing Specialist', 'HR Manager', 'Financial Analyst',
    'Operations Manager', 'Support Specialist', 'Product Designer', 'Legal Counsel',
    'Data Analyst', 'Business Analyst', 'Quality Assurance', 'DevOps Engineer'
]

cities = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'
]

# Create departments
print("Creating departments...")
dept_objects = {}
for dept_name in departments_list:
    dept, created = Department.objects.get_or_create(
        name=dept_name,
        defaults={'description': f'{dept_name} Department', 'status': True}
    )
    dept_objects[dept_name] = dept
    if created:
        print(f"  ✓ Created {dept_name}")

# Generate 80 employees
print("\nGenerating 80 employees...")
created_count = 0

for i in range(80):
    first_name = random.choice(first_names)
    last_name = random.choice(last_names)
    username = f"{first_name.lower()}.{last_name.lower()}{random.randint(1, 999)}"
    
    # Skip if username already exists
    if CustomUser.objects.filter(username=username).exists():
        continue
    
    # Create user
    user = CustomUser.objects.create_user(
        username=username,
        password='Employee@123',
        first_name=first_name,
        last_name=last_name,
        email=f"{username}@company.com",
        role='EMPLOYEE'
    )
    
    # Create employee profile
    department = random.choice(list(dept_objects.values()))
    designation = random.choice(designations)
    salary = random.randint(300000, 1500000)  # 3L to 15L INR
    
    # Random joining date in the last 2 years
    days_ago = random.randint(1, 730)
    joining_date = date.today() - timedelta(days=days_ago)
    
    # Random address
    street = f"{random.randint(1, 999)} {random.choice(['Main', 'Park', 'Lake', 'Hill', 'Garden'])} Street"
    city = random.choice(cities)
    address = f"{street}, {city}, India"
    
    # Random phone
    phone = f"{random.randint(7000000000, 9999999999)}"
    
    Employee.objects.create(
        user=user,
        department=department,
        phone_number=phone,
        address=address,
        designation=designation,
        salary=salary,
        date_of_joining=joining_date
    )
    
    created_count += 1
    if (created_count) % 10 == 0:
        print(f"  ✓ Created {created_count} employees...")

print(f"\n✅ Successfully created {created_count} employees!")
print(f"📊 Total employees in database: {Employee.objects.filter(user__role='EMPLOYEE').count()}")
print("\nDefault credentials for all employees: Employee@123")
