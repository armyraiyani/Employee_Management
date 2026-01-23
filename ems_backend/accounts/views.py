from django import views
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import CustomUser, Employee, Department, Attendance, ProfileUpdateRequest, Holiday, WorkSchedule, LeaveRequest, Payroll
from .serializers import UserSerializer, EmployeeSerializer, AttendanceSerializer, DepartmentSerializer, ProfileUpdateRequestSerializer, HolidaySerializer, WorkScheduleSerializer, LeaveRequestSerializer, PayrollSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=username, password=password)
    
    if user is not None:
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'status': 'success',
            'role': user.role,
            'user_id': user.id,
            'token': token.key
        })
    else:
        return Response({'status': 'error', 'message': 'Invalid username or password'}, status=401)



@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    data = request.data
    role = data.get('role', 'EMPLOYEE')
    
    # Logic to handle full name if provided instead of split names
    full_name = data.get('full_name', '').strip() if isinstance(data.get('full_name'), str) else ''
    first_name = data.get('first_name', '')
    last_name = data.get('last_name', '')
    
    if full_name and not first_name:
        parts = full_name.split(' ')
        first_name = parts[0]
        last_name = ' '.join(parts[1:]) if len(parts) > 1 else 'Employee'

    serializer = UserSerializer(data=data)
    if serializer.is_valid():
        user = serializer.save()
        user.role = role
        user.first_name = first_name
        user.last_name = last_name
        user.save()
        
        # Consistently create Employee profile for ALL roles to avoid frontend breaks
        # We can differentiate them later if needed, but this ensures a linked record exists
        Employee.objects.get_or_create(
            user=user,
            defaults={
                'designation': 'Administrator' if role == 'ADMIN' else 'Team Member',
                'salary': 0
            }
        )
            
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'status': 'success',
            'role': user.role,
            'user_id': user.id,
            'token': token.key,
            'username': user.username
        })
    return Response(serializer.errors, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_list(request):
    if request.user.role == 'ADMIN':
        # Exclude admin users from the employee list
        employees = Employee.objects.filter(user__role='EMPLOYEE')
        serializer = EmployeeSerializer(employees, many=True)
        return Response(serializer.data)
    else:
        try:
            employee = Employee.objects.get(user=request.user)
            serializer = EmployeeSerializer(employee)
            return Response([serializer.data])  # Wrapped in a list
        except Employee.DoesNotExist:
            return Response([])

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_employee(request):
    if request.user.role != 'ADMIN':
        return Response({'status': 'error', 'message': 'Unauthorized'}, status=403)
    
    data = request.data
    username = data.get('username')
    email = data.get('email', '')
    password = data.get('password', 'User@123') 
    
    if CustomUser.objects.filter(username=username).exists():
        return Response({'status': 'error', 'message': 'Username already exists'}, status=400)
        
    try:
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        
        # Create user
        user = CustomUser.objects.create_user(
            username=username, 
            email=email, 
            password=password, 
            role='EMPLOYEE',
            first_name=first_name,
            last_name=last_name
        )
        
        # Explicitly set and save raw_password
        user.raw_password = password
        user.save(update_fields=['raw_password', 'role', 'first_name', 'last_name', 'email'])
        
        # Handle Department - lookup or create by name
        dept_name = data.get('department_name')
        if dept_name:
            department, _ = Department.objects.get_or_create(name=dept_name)
            data['department_id'] = department.id

        profile_data = data.copy()
        profile_data['user'] = user.id
        
        serializer = EmployeeSerializer(data=profile_data)
        if serializer.is_valid():
            serializer.save()
            return Response({'status': 'success', 'message': 'Employee added successfully'})
        else:
            user.delete()
            return Response({'status': 'error', 'errors': serializer.errors}, status=400)
            
    except Exception as e:
        # Cleanup if something fails
        if 'user' in locals():
            user.delete()
        return Response({'status': 'error', 'message': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_list(request):
    if request.user.role == 'ADMIN':
        attendance = Attendance.objects.all().order_by('-date')
    else:
        try:
            employee = Employee.objects.get(user=request.user)
            attendance = Attendance.objects.filter(employee=employee).order_by('-date')
        except Employee.DoesNotExist:
            attendance = []
            
    serializer = AttendanceSerializer(attendance, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_attendance(request):
    try:
        employee = Employee.objects.get(user=request.user)
    except Employee.DoesNotExist:
        return Response({'error': 'Employee profile not found'}, status=404)

    from datetime import datetime, date, timedelta

    today = timezone.localdate()
    now_time = timezone.localtime().time()
    action = request.data.get('action') # 'check-in' or 'check-out'
    
    # Check if employee is on approved leave today
    isOnLeave = LeaveRequest.objects.filter(
        employee=employee,
        status='APPROVED',
        start_date__lte=today,
        end_date__gte=today
    ).exists()

    if isOnLeave:
        return Response({
            'status': 'error', 
            'message': 'You are on an approved leave today. Attendance action is not required.'
        }, status=400)

    attendance, created = Attendance.objects.get_or_create(
        employee=employee,
        date=today,
        defaults={'status': 'Absent'} # Default to Absent until validated
    )

    if action == 'check-in':
        if attendance.check_in_time:
            return Response({'status': 'error', 'message': 'You have already checked in today.'}, status=400)
            
        # Check for Early Check-in
        schedule, _ = WorkSchedule.objects.get_or_create(id=1)
        if now_time < schedule.standard_check_in:
            return Response({
                'status': 'error', 
                'message': f'Shift starts at {schedule.standard_check_in.strftime("%I:%M %p")}. You cannot check in yet.'
            }, status=400)

        attendance.check_in_time = now_time
        attendance.status = 'Pending'
        
        # Calculate Check-in Status (Late / On Time)
        tz = timezone.get_current_timezone()
        
        # Combine today's date with the shift start time and make it timezone-aware
        shift_start_dt = timezone.make_aware(datetime.combine(today, schedule.standard_check_in), tz)
        late_threshold = shift_start_dt + timedelta(minutes=schedule.check_in_tolerance)
        
        # Current time in the same timezone
        current_dt = timezone.localtime()
        
        if current_dt > late_threshold:
            attendance.remarks = 'Late Check-in'
        else:
            attendance.remarks = 'On Time Check-in'
            
        attendance.save()
        return Response({'status': 'success', 'message': f'Checked in successfully. Status: {attendance.remarks}'})

    elif action == 'check-out':
        if not attendance.check_in_time:
            return Response({'status': 'error', 'message': 'You must check in first.'}, status=400)
        if attendance.check_out_time:
            return Response({'status': 'error', 'message': 'You have already checked out today.'}, status=400)
        
        attendance.check_out_time = now_time
        
        # Calculate Final Status (Present / Half Day / Absent)
        schedule, _ = WorkSchedule.objects.get_or_create(id=1)
        
        dummy_date = date(2000, 1, 1)
        dt_out = datetime.combine(dummy_date, now_time)
        shift_end = datetime.combine(dummy_date, schedule.standard_check_out)
        out_limit = shift_end - timedelta(minutes=schedule.check_out_tolerance)
        late_out_threshold = shift_end + timedelta(minutes=schedule.check_out_tolerance)
        half_day_time = datetime.combine(dummy_date, schedule.half_day_threshold)
        
        # Append check-out remarks if late
        if dt_out > late_out_threshold:
            current_remarks = attendance.remarks or ''
            if current_remarks:
                attendance.remarks = f"{current_remarks}, Check-out Late"
            else:
                attendance.remarks = "Check-out Late"
        
        if dt_out >= out_limit:
            attendance.status = 'Present'
        elif dt_out >= half_day_time:
            attendance.status = 'Half Day'
        else:
            attendance.status = 'Absent'
            
        attendance.save()
        return Response({'status': 'success', 'message': f'Checked out successfully. Status: {attendance.status}'})
    
    return Response({'error': 'Invalid action'}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def override_attendance(request):
    if request.user.role != 'ADMIN':
        return Response({'error': 'Unauthorized'}, status=403)
    
    employee_id = request.data.get('employee_id')
    date_str = request.data.get('date')
    new_status = request.data.get('status')
    
    try:
        employee = Employee.objects.get(id=employee_id)
        attendance, created = Attendance.objects.get_or_create(
            employee=employee,
            date=date_str
        )
        
        attendance.status = new_status
        if new_status == 'Absent':
            attendance.check_in_time = None
            attendance.check_out_time = None
            attendance.remarks = 'Marked Absent by Admin'
        elif new_status == 'Present':
            if not attendance.check_in_time:
                schedule = WorkSchedule.objects.first()
                if schedule:
                    attendance.check_in_time = schedule.standard_check_in
                    attendance.check_out_time = schedule.standard_check_out
                else:
                    attendance.check_in_time = "09:00:00"
                    attendance.check_out_time = "18:00:00"
            attendance.remarks = 'Manually Marked Present'
            
        attendance.save()
        return Response({'status': 'success', 'message': f'Attendance updated to {new_status}'})
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_employee_attendance(request, employee_id):
    if request.user.role != 'ADMIN':
         return Response({'status': 'error', 'message': 'Unauthorized'}, status=403)
    
    records = Attendance.objects.filter(employee_id=employee_id).order_by('-date')
    serializer = AttendanceSerializer(records, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    try:
        employee = Employee.objects.get(user=request.user)
    except Employee.DoesNotExist:
        return Response({'error': 'Employee profile not found'}, status=404)
    
    # Handle File Upload (Resume) - still direct as it's a file
    if 'resume' in request.FILES:
        employee.resume = request.FILES['resume']
        employee.save()
        return Response({'status': 'success', 'message': 'Resume uploaded successfully'})
    
    if 'resume_2' in request.FILES:
        employee.resume_2 = request.FILES['resume_2']
        employee.save()
        return Response({'status': 'success', 'message': 'Resume uploaded successfully'})
    
    # Create a Profile Update Request for admin approval
    data = request.data
    new_username = data.get('username')
    new_email = data.get('email')
    new_address = data.get('address')
    new_phone = data.get('phone_number')
    
    if any([new_username, new_email, new_address, new_phone]):
        # If user is ADMIN, update directly
        if request.user.role == 'ADMIN':
            if new_username:
                employee.user.username = new_username
            if new_email:
                employee.user.email = new_email
            employee.user.save()
            
            if new_address:
                employee.address = new_address
            if new_phone:
                employee.phone_number = new_phone
            employee.save()
            return Response({'status': 'success', 'message': 'Profile updated successfully'})
        
        # If user is EMPLOYEE, create request
        else:
            ProfileUpdateRequest.objects.create(
                employee=employee,
                new_username=new_username,
                new_email=new_email,
                new_address=new_address,
                new_phone_number=new_phone,
                status='PENDING'
            )
            return Response({
                'status': 'success', 
                'message': 'Profile update request submitted for admin approval.'
            })
    
    return Response({'error': 'No data provided'}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_profile_requests(request):
    if request.user.role != 'ADMIN':
        return Response({'error': 'Unauthorized'}, status=403)
    
    requests = ProfileUpdateRequest.objects.filter(status='PENDING').order_by('-created_at')
    serializer = ProfileUpdateRequestSerializer(requests, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def handle_profile_request(request, pk):
    if request.user.role != 'ADMIN':
        return Response({'error': 'Unauthorized'}, status=403)
    
    try:
        profile_req = ProfileUpdateRequest.objects.get(pk=pk)
    except ProfileUpdateRequest.DoesNotExist:
        return Response({'error': 'Request not found'}, status=404)
    
    action = request.data.get('action') # 'APPROVE' or 'REJECT'
    
    if action == 'APPROVE':
        profile_req.status = 'APPROVED'
        profile_req.is_seen_by_employee = False
        # Apply changes to employee profile and user record
        employee = profile_req.employee
        user = employee.user
        
        if profile_req.new_username:
            user.username = profile_req.new_username
        if profile_req.new_email:
            user.email = profile_req.new_email
        user.save()

        if profile_req.new_address:
            employee.address = profile_req.new_address
        if profile_req.new_phone_number:
            employee.phone_number = profile_req.new_phone_number
        employee.save()
        
        profile_req.save()
        return Response({'status': 'success', 'message': 'Profile update approved and applied.'})
    
    elif action == 'REJECT':
        profile_req.status = 'REJECTED'
        profile_req.is_seen_by_employee = False
        profile_req.save()
        return Response({'status': 'success', 'message': 'Profile update rejected.'})
    
    return Response({'error': 'Invalid action'}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_profile(request):
    try:
        employee = Employee.objects.get(user=request.user)
        serializer = EmployeeSerializer(employee)
        return Response(serializer.data)
    except Employee.DoesNotExist:
        return Response({'status': 'error', 'message': 'Employee profile not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_employee_detail(request, pk):
    try:
        employee = Employee.objects.get(pk=pk)
        if request.user.role != 'ADMIN' and employee.user != request.user:
             return Response({'status': 'error', 'message': 'Unauthorized'}, status=403)
             
        serializer = EmployeeSerializer(employee)
        return Response(serializer.data)
    except Employee.DoesNotExist:
        return Response({'status': 'error', 'message': 'Employee not found'}, status=404)

from rest_framework.parsers import MultiPartParser, FormParser

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def admin_update_employee(request, pk):
    if request.user.role != 'ADMIN':
        return Response({'error': 'Unauthorized'}, status=403)
    
    try:
        employee = Employee.objects.get(pk=pk)
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=404)
    
    data = request.data
    
    # Handle Salary - prevent empty string errors
    new_salary = data.get('salary')
    if new_salary == '' or new_salary is None:
        employee.salary = 0
    else:
        employee.salary = new_salary
    
    # Update related User fields
    user = employee.user
    user.first_name = data.get('first_name', user.first_name).strip()
    user.last_name = data.get('last_name', user.last_name).strip()
    user.save()
    
    # Handle Department change
    dept_name = data.get('department_name')
    if dept_name:
        department, _ = Department.objects.get_or_create(name=dept_name)
        employee.department = department

    # Handle Personal Info directly
    if 'address' in data:
        employee.address = data.get('address')
    if 'phone_number' in data:
        employee.phone_number = data.get('phone_number')
    
    # Handle Designation
    if 'designation' in data:
        employee.designation = data.get('designation')

    # Handle Resume Upload (for Admin)
    if 'resume' in request.FILES:
        employee.resume = request.FILES['resume']
    if 'resume_2' in request.FILES:
        employee.resume_2 = request.FILES['resume_2']

    employee.save()
    employee.save()
    serializer = EmployeeSerializer(employee)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_resume(request, pk):
    # Allow admins to delete any resume, or employees to delete their own
    try:
        employee = Employee.objects.get(pk=pk)
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=404)

    # Check permissions
    is_admin = request.user.role == 'ADMIN'
    is_owner = employee.user == request.user

    if not (is_admin or is_owner):
        return Response({'error': 'Unauthorized'}, status=403)

    # Perform deletion
    # Perform deletion
    resume_index = request.data.get('resume_index', '1') # Default to 1
    
    if str(resume_index) == '2':
        if employee.resume_2:
            employee.resume_2.delete(save=False)
            employee.resume_2 = None
            employee.save()
            return Response({'status': 'success', 'message': 'Resume 2 deleted successfully'})
        else:
            return Response({'error': 'No resume found to delete'}, status=400)
    else:
        if employee.resume:
            employee.resume.delete(save=False) # Delete file from storage
            employee.resume = None
            employee.save()
            return Response({'status': 'success', 'message': 'Resume deleted successfully'})
        else:
            return Response({'error': 'No resume found to delete'}, status=400)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_employee(request, pk):
    if request.user.role != 'ADMIN':
        return Response({'error': 'Unauthorized'}, status=403)
    
    try:
        employee = Employee.objects.get(pk=pk)
        user = employee.user
        # Prevent admin from deleting themselves
        if user == request.user:
            return Response({'error': 'You cannot delete yourself!'}, status=400)
            
        employee.delete()
        user.delete()
        return Response({'status': 'success', 'message': 'Employee deleted successfully'})
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_employee_password(request, pk):
    """
    Reset an employee's password (Admin only)
    Requires admin password verification
    """
    if request.user.role != 'ADMIN':
        return Response({"error": "Unauthorized"}, status=403)
        
    try:
        # Verify Admin Password
        admin_password = request.data.get('admin_password')
        if not admin_password:
            return Response({"error": "Admin password is required to confirm this action"}, status=400)
            
        if not request.user.check_password(admin_password):
            return Response({"error": "Incorrect admin password"}, status=401)

        employee = Employee.objects.get(pk=pk)
        new_password = request.data.get('new_password', 'User@123')
        
        user = employee.user
        user.set_password(new_password)
        user.raw_password = new_password
        user.save()
        
        return Response({
            "status": "success", 
            "message": f"Password reset successfully for {user.username}",
            "new_password": new_password
        })
    except Employee.DoesNotExist:
        return Response({"error": "Employee not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reveal_employee_password(request, pk):
    """
    Reveal an employee's raw password after admin verification
    """
    if request.user.role != 'ADMIN':
        return Response({"error": "Unauthorized"}, status=403)
    
    try:
        # Verify Admin Password
        admin_password = request.data.get('admin_password')
        if not admin_password:
            return Response({"error": "Admin password is required"}, status=400)
            
        if not request.user.check_password(admin_password):
            return Response({"error": "Incorrect admin password"}, status=401)

        employee = Employee.objects.get(pk=pk)
        # Check if raw_password exists
        raw_pass = getattr(employee.user, 'raw_password', None)
        
        if not raw_pass:
             return Response({"error": "Password cannot be retrieved (hashed only). Reset required."}, status=400)

        return Response({
            "status": "success", 
            "password": raw_pass
        })
    except Employee.DoesNotExist:
        return Response({"error": "Employee not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_admin_password(request):
    """
    Verify the logged-in admin's password for sensitive operations.
    """
    if request.user.role != 'ADMIN':
        return Response({"error": "Unauthorized"}, status=403)
        
    password = request.data.get('password')
    if not password:
        return Response({"error": "Password is required"}, status=400)
        
    if request.user.check_password(password):
        return Response({"status": "success", "message": "Verification successful"})
    else:
        return Response({"status": "error", "message": "Incorrect admin password"}, status=401)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def department_list(request):
    departments = Department.objects.filter(status=True)
    serializer = DepartmentSerializer(departments, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_daily_attendance(request):
    if request.user.role != 'ADMIN':
        return Response({'error': 'Unauthorized'}, status=403)
    
    today = timezone.localdate()
    
    # Check if today is a Holiday
    is_holiday = Holiday.objects.filter(date=today).exists()
    status_to_mark = 'Holiday' if is_holiday else 'Absent'
    
    employees = Employee.objects.all()
    count = 0
    
    for emp in employees:
        # Check if record exists for today
        if Attendance.objects.filter(employee=emp, date=today).exists():
            continue
            
        # Check if employee is on Approved Leave today
        isOnLeave = LeaveRequest.objects.filter(
            employee=emp,
            status='APPROVED',
            start_date__lte=today,
            end_date__gte=today
        ).exists()
        
        if isOnLeave:
            Attendance.objects.create(
                employee=emp,
                date=today,
                status='Leave',
                remarks='Leave Synchronized'
            )
            count += 1
            continue

        Attendance.objects.create(
            employee=emp,
            date=today,
            status=status_to_mark
        )
        count += 1
            
    return Response({'status': 'success', 'message': f'Processed Daily Logs: {count} employees marked as {status_to_mark} for {today}.'})

@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def holiday_manager(request, pk=None):
    if request.method == 'GET':
        holidays = Holiday.objects.all().order_by('date')
        serializer = HolidaySerializer(holidays, many=True)
        return Response(serializer.data)
        
    # POST and DELETE remain ADMIN only
    if request.user.role != 'ADMIN':
        return Response({'error': 'Unauthorized'}, status=403)
        
    if request.method == 'POST':
        holiday_name = request.data.get('name', '').strip()
        
        # Check if a holiday with the same name already exists
        if Holiday.objects.filter(name__iexact=holiday_name).exists():
            return Response({
                'status': 'error', 
                'message': f'Holiday with name "{holiday_name}" already exists'
            }, status=400)
        
        serializer = HolidaySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'status': 'success', 'message': 'Holiday added successfully'})
        return Response(serializer.errors, status=400)
    
    if request.method == 'DELETE' and pk:
        Holiday.objects.filter(pk=pk).delete()
        return Response({'status': 'success', 'message': 'Holiday deleted'})

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def schedule_settings(request):
    schedule, _ = WorkSchedule.objects.get_or_create(id=1)
    
    if request.method == 'GET':
        serializer = WorkScheduleSerializer(schedule)
        return Response(serializer.data)
        
    # POST remains ADMIN only
    if request.user.role != 'ADMIN':
         return Response({'error': 'Unauthorized'}, status=403)
         
    if request.method == 'POST':
        serializer = WorkScheduleSerializer(schedule, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'status': 'success', 'message': 'Schedule updated'})
        return Response(serializer.errors, status=400)

@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def manage_leaves(request):
    """
    POST: Submit a leave request (Employee)
    GET: List my leave requests (Employee)
    """
    try:
        if hasattr(request.user, 'employee_profile'):
             employee = request.user.employee_profile
        else:
             from django.core.exceptions import ObjectDoesNotExist
             raise ObjectDoesNotExist
    except Exception:
        return Response({"error": "Employee profile not found"}, status=404)

    if request.method == 'POST':
        data = request.data.copy()
        data['employee'] = employee.id
        serializer = LeaveRequestSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    elif request.method == 'GET':
        leaves = LeaveRequest.objects.filter(employee=employee).order_by('-created_at')
        serializer = LeaveRequestSerializer(leaves, many=True)
        return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_leaves(request):
    """
    List all leave requests (Admin only)
    """
    if request.user.role != 'ADMIN':
        return Response({"error": "Unauthorized"}, status=403)
    
    leaves = LeaveRequest.objects.all().order_by('-created_at')
    serializer = LeaveRequestSerializer(leaves, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def handle_leave_request(request, pk):
    """
    Approve or Reject a leave request (Admin only)
    """
    if request.user.role != 'ADMIN':
        return Response({"error": "Unauthorized"}, status=403)

    try:
        leave_request = LeaveRequest.objects.get(pk=pk)
    except LeaveRequest.DoesNotExist:
        return Response({"error": "Leave request not found"}, status=404)

    status = request.data.get('status')
    if status not in ['APPROVED', 'REJECTED']:
        return Response({"error": "Invalid status"}, status=400)

    leave_request.status = status
    leave_request.is_seen_by_employee = False  # Trigger notification for employee
    leave_request.save()

    if status == 'APPROVED':
        from datetime import timedelta
        current_date = leave_request.start_date
        while current_date <= leave_request.end_date:
            Attendance.objects.update_or_create(
                employee=leave_request.employee,
                date=current_date,
                defaults={
                    'status': 'Leave',
                    'check_in_time': None,
                    'check_out_time': None,
                    'remarks': f"Leave: {leave_request.leave_type}"
                }
            )
            current_date += timedelta(days=1)
    
    return Response({"message": f"Leave request {status.lower()} successfully"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_leave_seen(request, pk):
    """
    Mark a leave request status change as seen by the employee
    """
    try:
        employee = request.user.employee_profile
        leave_request = LeaveRequest.objects.get(pk=pk, employee=employee)
    except (Employee.DoesNotExist, LeaveRequest.DoesNotExist):
        return Response({"error": "Leave request not found"}, status=404)

    leave_request.is_seen_by_employee = True
    leave_request.save()
    return Response({"message": "Marked as seen"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    """
    Unified endpoint for employee notifications (Leaves + Profile updates)
    """
    try:
        employee = request.user.employee_profile
    except Employee.DoesNotExist:
        return Response({"error": "Employee profile not found"}, status=404)

    leaves = LeaveRequest.objects.filter(employee=employee, status__in=['APPROVED', 'REJECTED'], is_seen_by_employee=False, is_dismissed_by_employee=False)
    profiles = ProfileUpdateRequest.objects.filter(employee=employee, status__in=['APPROVED', 'REJECTED'], is_seen_by_employee=False, is_dismissed_by_employee=False)
    payrolls = Payroll.objects.filter(employee=employee, is_seen_by_employee=False, is_dismissed_by_employee=False)
    
    leave_data = LeaveRequestSerializer(leaves, many=True).data
    for l in leave_data: l['type'] = 'LEAVE_UPDATE'
    
    profile_data = ProfileUpdateRequestSerializer(profiles, many=True).data
    for p in profile_data: p['type'] = 'PROFILE_UPDATE'
    
    payroll_data = PayrollSerializer(payrolls, many=True).data
    for p in payroll_data: p['type'] = 'PAYROLL'
    
    all_notifs = sorted(leave_data + profile_data + payroll_data, key=lambda x: x['created_at'], reverse=True)
    return Response(all_notifs)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_seen(request):
    """
    Unified mark seen for any notification type (Employee)
    """
    try:
        employee = request.user.employee_profile
    except Employee.DoesNotExist:
        return Response({"error": "Employee profile not found"}, status=404)

    notif_type = request.data.get('type')
    pk = request.data.get('id')

    if notif_type == 'LEAVE_UPDATE':
        LeaveRequest.objects.filter(pk=pk, employee=employee).update(is_seen_by_employee=True)
    elif notif_type == 'PROFILE_UPDATE':
        ProfileUpdateRequest.objects.filter(pk=pk, employee=employee).update(is_seen_by_employee=True)
    elif notif_type == 'PAYROLL':
        Payroll.objects.filter(pk=pk, employee=employee).update(is_seen_by_employee=True)
    
    return Response({"message": "Notification marked as seen"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_seen(request):
    """
    Mark ALL unread approved/rejected notifications as seen for the employee
    """
    try:
        employee = request.user.employee_profile
    except Employee.DoesNotExist:
        return Response({"error": "Employee profile not found"}, status=404)

    # Mark Leaves
    LeaveRequest.objects.filter(
        employee=employee, 
        status__in=['APPROVED', 'REJECTED'],
        is_seen_by_employee=False,
        is_dismissed_by_employee=False
    ).update(is_seen_by_employee=True)
    
    # Mark Profile Updates
    ProfileUpdateRequest.objects.filter(
        employee=employee,
        status__in=['APPROVED', 'REJECTED'],
        is_seen_by_employee=False,
        is_dismissed_by_employee=False
    ).update(is_seen_by_employee=True)
    
    # Mark Payrolls
    Payroll.objects.filter(
        employee=employee, 
        is_seen_by_employee=False,
        is_dismissed_by_employee=False
    ).update(is_seen_by_employee=True)
    
    return Response({"message": "All marked as seen"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_admin_notifications(request):
    """
    Unified endpoint for Admin notifications (Pending + History)
    """
    if request.user.role != 'ADMIN':
        return Response({"error": "Unauthorized"}, status=403)

    leaves = LeaveRequest.objects.filter(is_dismissed_by_admin=False)
    profiles = ProfileUpdateRequest.objects.filter(is_dismissed_by_admin=False)
    
    leave_data = LeaveRequestSerializer(leaves, many=True).data
    for l in leave_data: l['type'] = 'LEAVE'
    
    profile_data = ProfileUpdateRequestSerializer(profiles, many=True).data
    for p in profile_data: p['type'] = 'PROFILE'
    
    all_notifs = sorted(leave_data + profile_data, key=lambda x: x['created_at'], reverse=True)
    return Response(all_notifs)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dismiss_notification_employee(request):
    """
    Unified dismiss for Employee notifications
    """
    try:
        employee = request.user.employee_profile
    except Employee.DoesNotExist:
        return Response({"error": "Employee profile not found"}, status=404)

    notif_type = request.data.get('type')
    pk = request.data.get('id')

    if notif_type == 'LEAVE_UPDATE':
        LeaveRequest.objects.filter(pk=pk, employee=employee).update(is_dismissed_by_employee=True)
    elif notif_type == 'PROFILE_UPDATE':
        ProfileUpdateRequest.objects.filter(pk=pk, employee=employee).update(is_dismissed_by_employee=True)
    elif notif_type == 'PAYROLL':
        Payroll.objects.filter(pk=pk, employee=employee).update(is_dismissed_by_employee=True)
    
    return Response({"message": "Dismissed successfully"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dismiss_notification_admin(request):
    """
    Unified dismiss for Admin notifications
    """
    if request.user.role != 'ADMIN':
        return Response({"error": "Unauthorized"}, status=403)

    notif_type = request.data.get('type')
    pk = request.data.get('id')

    if notif_type == 'LEAVE':
        LeaveRequest.objects.filter(pk=pk).update(is_dismissed_by_admin=True)
    elif notif_type == 'PROFILE':
        ProfileUpdateRequest.objects.filter(pk=pk).update(is_dismissed_by_admin=True)
    
    return Response({"message": "Dismissed successfully"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_admin_notifications_seen(request):
    """
    Mark all non-dismissed admin notifications as seen.
    """
    if request.user.role != 'ADMIN':
        return Response({"error": "Unauthorized"}, status=403)

    LeaveRequest.objects.filter(is_dismissed_by_admin=False).update(is_seen_by_admin=True)
    ProfileUpdateRequest.objects.filter(is_dismissed_by_admin=False).update(is_seen_by_admin=True)

    return Response({"message": "All marked as seen"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notification_history(request):
    """
    Get complete notification history for employee (all approved/rejected requests)
    """
    try:
        employee = request.user.employee_profile
    except Employee.DoesNotExist:
        return Response({"error": "Employee profile not found"}, status=404)

    # Get all non-pending leave and profile requests (not dismissed)
    leaves = LeaveRequest.objects.filter(employee=employee, status__in=['APPROVED', 'REJECTED'], is_dismissed_by_employee=False).order_by('-created_at')
    profiles = ProfileUpdateRequest.objects.filter(employee=employee, status__in=['APPROVED', 'REJECTED'], is_dismissed_by_employee=False).order_by('-created_at')
    payrolls = Payroll.objects.filter(employee=employee, is_dismissed_by_employee=False).order_by('-created_at')
    
    leave_data = LeaveRequestSerializer(leaves, many=True).data
    for l in leave_data: l['type'] = 'LEAVE_UPDATE'
    
    profile_data = ProfileUpdateRequestSerializer(profiles, many=True).data
    for p in profile_data: p['type'] = 'PROFILE_UPDATE'
    
    payroll_data = PayrollSerializer(payrolls, many=True).data
    for p in payroll_data: p['type'] = 'PAYROLL'
    
    all_history = sorted(leave_data + profile_data + payroll_data, key=lambda x: x['created_at'], reverse=True)
    return Response(all_history)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_monthly_payroll_status(request):
    """
    Get payroll status for all employees for a specific month
    """
    if request.user.role != 'ADMIN':
        return Response({"error": "Unauthorized"}, status=403)
        
    date_str = request.query_params.get('month') # Format YYYY-MM-01
    if not date_str:
        today = timezone.localdate()
        date_str = f"{today.year}-{today.month:02d}-01"
        
    try:
        from datetime import datetime
        month_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return Response({"error": "Invalid date format. Use YYYY-MM-DD (first of month)"}, status=400)
    
    # Get all employees
    employees = Employee.objects.filter(user__is_active=True)
    
    # Get payroll records for this month
    payrolls = Payroll.objects.filter(month=month_date)
    payroll_map = {p.employee.id: p for p in payrolls}
    
    data = []
    for emp in employees:
        paid_record = payroll_map.get(emp.id)
        status = 'PAID' if paid_record else 'PENDING'
        
        data.append({
            'employee_id': emp.id,
            'employee_name': f"{emp.user.first_name} {emp.user.last_name}".strip() or emp.user.username,
            'designation': emp.designation,
            'department': emp.department.name if emp.department else 'N/A',
            'base_salary': emp.salary,
            'salary_status': status,
            'payment_date': paid_record.payment_date if paid_record else None,
            'amount_paid': paid_record.amount if paid_record else None
        })
        
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_salary_payment(request):
    """
    Mark an employee as PAID for a specific month
    """
    if request.user.role != 'ADMIN':
        return Response({"error": "Unauthorized"}, status=403)
        
    employee_id = request.data.get('employee_id')
    amount = request.data.get('amount')
    month_str = request.data.get('month') # YYYY-MM-01
    message = request.data.get('message', '')
    
    if not all([employee_id, amount, month_str]):
        return Response({"error": "Missing required fields (employee_id, amount, month)"}, status=400)
        
    try:
        from decimal import Decimal
        employee = Employee.objects.get(pk=employee_id)
        
        # Safe conversion to Decimal
        final_amount = Decimal(str(amount))
        annual_salary = employee.salary or Decimal('0')
        
        # SELF-HEALING LOGIC: 
        # If the admin mistakenly sends the full annual salary as the payment amount,
        # we automatically scale it down to the monthly equivalent (Annual / 12).
        if annual_salary > 0 and final_amount == annual_salary:
            final_amount = annual_salary / Decimal('12')
            
        # Prevent future payments
        from datetime import datetime
        today = timezone.localdate()
        pay_date = datetime.strptime(month_str, '%Y-%m-%d').date()
        if pay_date > today:
            return Response({"error": "Cannot process salary for future months"}, status=400)
            
        payroll, created = Payroll.objects.get_or_create(
            employee=employee,
            month=month_str,
            defaults={'amount': final_amount, 'status': 'PAID', 'message': message}
        )
        
        if not created:
            payroll.amount = final_amount
            payroll.message = message
            payroll.is_seen_by_employee = False
            payroll.save()
            
        return Response({"status": "success", "message": f"Monthly salary (₹{final_amount:,.2f}) marked as PAID for {employee.user.username}"})
        
    except Employee.DoesNotExist:
        return Response({"error": "Employee not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_payroll_history(request):
    """
    Get payroll history for the logged-in employee
    """
    try:
        employee = request.user.employee_profile
        payrolls = Payroll.objects.filter(employee=employee).order_by('-month')
        serializer = PayrollSerializer(payrolls, many=True)
        return Response(serializer.data)
    except Employee.DoesNotExist:
        return Response({"error": "Employee profile not found"}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_payroll_history(request):
    """
    Get entire payroll history (Admin only)
    """
    if request.user.role != 'ADMIN':
        return Response({"error": "Unauthorized"}, status=403)
        
    payrolls = Payroll.objects.all().order_by('-created_at')
    serializer = PayrollSerializer(payrolls, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calculate_payroll_deductions(request):
    if request.user.role != 'ADMIN':
        return Response({"error": "Unauthorized"}, status=403)
        
    employee_id = request.query_params.get('employee_id')
    month_str = request.query_params.get('month') # YYYY-MM-01
    
    if not all([employee_id, month_str]):
        return Response({"error": "Missing required params"}, status=400)
        
    try:
        employee = Employee.objects.get(pk=employee_id)
        result = compute_employee_salary(employee, month_str)
        return Response(result)
    except Employee.DoesNotExist:
        return Response({"error": "Employee not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

def compute_employee_salary(employee, month_str):
    from datetime import datetime, date
    import calendar
    from decimal import Decimal
    
    if isinstance(month_str, str):
        try:
            # Handle YYYY-MM-DD
            month_date = datetime.strptime(month_str, "%Y-%m-%d").date()
        except ValueError:
            # Handle YYYY-MM
            month_date = datetime.strptime(month_str + "-01", "%Y-%m-%d").date()
    else:
        month_date = month_str
        
    year = month_date.year
    month = month_date.month
    days_in_month = calendar.monthrange(year, month)[1]
    month_start = date(year, month, 1)
    month_end = date(year, month, days_in_month)

    # Get Schedule for Off-Days
    schedule, _ = WorkSchedule.objects.get_or_create(id=1)
    off_days = [int(d) for d in schedule.off_days.split(',') if d.strip().isdigit()]
    
    # Get Holidays for this month
    holidays = Holiday.objects.filter(date__year=year, date__month=month).values_list('date', flat=True)
    
    # Joining Date considerations
    joining_date = employee.date_of_joining or month_start
    # Effective Start is whichever is later: Month Start or Joining Date
    effective_start = max(month_start, joining_date)
    is_mid_month_joiner = effective_start > month_start and effective_start <= month_end

    # Calculate Working Days for FULL month (for daily rate)
    # AND for Effective Period (for base salary)
    work_days_total = 0
    work_days_in_period = 0
    off_days_count = 0
    holidays_count = 0
    
    for d in range(1, days_in_month + 1):
        curr_date = date(year, month, d)
        python_weekday = curr_date.weekday()
        mapped_weekday = (python_weekday + 1) % 7 # 0 is Sun
        
        is_holiday = curr_date in holidays
        is_off = mapped_weekday in off_days
        
        if not is_holiday and not is_off:
            work_days_total += 1
            if curr_date >= effective_start:
                work_days_in_period += 1
        
        # We only count exclusions for the period they were active
        if curr_date >= effective_start:
            if is_holiday:
                holidays_count += 1
            elif is_off:
                off_days_count += 1

    monthly_salary_standard = (employee.salary or Decimal('0')) / Decimal('12')
    daily_rate = monthly_salary_standard / Decimal(max(1, work_days_total))
    
    # Effective base salary depends on how many working days they were contracted for
    effective_base_salary = daily_rate * Decimal(work_days_in_period)
    
    # Fetch attendance and approved leaves for the period
    attendance_records = Attendance.objects.filter(
        employee=employee,
        date__range=[effective_start, month_end]
    ).values('date', 'status')
    att_dict = {r['date']: r['status'] for r in attendance_records}

    approved_leaves = LeaveRequest.objects.filter(
        employee=employee,
        status='APPROVED',
        start_date__lte=month_end,
        end_date__gte=effective_start
    )
    
    # Helper to check if a date is within an approved leave
    def is_on_leave(dt):
        return any(l.start_date <= dt <= l.end_date for l in approved_leaves)

    absent_count = 0
    half_day_count = 0
    leave_count = 0
    today = timezone.localdate()

    # We iterate through the active period up to today
    # to count actual attendance status or lack thereof
    for d in range(1, days_in_month + 1):
        curr_date = date(year, month, d)
        
        # Only count up to today for deductions
        if curr_date < effective_start or curr_date > today:
            continue
            
        python_weekday = curr_date.weekday()
        mapped_weekday = (python_weekday + 1) % 7 # 0 is Sun
        is_holiday = curr_date in holidays
        is_off = mapped_weekday in off_days
        
        # We only care about statuses on working days
        if not is_holiday and not is_off:
            status = att_dict.get(curr_date)
            if status:
                # Use explicit status if it exists
                if status == 'Absent':
                    absent_count += 1
                elif status == 'Half Day':
                    half_day_count += 1
                elif status == 'Leave':
                    leave_count += 1
            else:
                # No attendance record. Check if it's an approved leave.
                if is_on_leave(curr_date):
                    leave_count += 1
                else:
                    # Missing record on working day prior to/on today = Implicit Absent
                    absent_count += 1
    
    # 1 leave is paid, any additional are deducted
    extra_leaves = max(0, leave_count - 1)
    
    deduction_absent = Decimal(absent_count) * daily_rate
    deduction_half = Decimal(half_day_count) * (daily_rate / Decimal('2'))
    deduction_extra_leave = Decimal(extra_leaves) * daily_rate
    
    total_deduction = deduction_absent + deduction_half + deduction_extra_leave
    payable_amount = effective_base_salary - total_deduction
    
    return {
        "base_salary": round(float(effective_base_salary), 2),
        "standard_monthly": round(float(monthly_salary_standard), 2),
        "days_in_month": days_in_month,
        "work_days": work_days_in_period,
        "total_month_work_days": work_days_total,
        "off_days_count": off_days_count,
        "holidays_count": holidays_count,
        "joining_date": str(joining_date) if is_mid_month_joiner else None,
        "stats": {
            "absent": absent_count,
            "half_day": half_day_count,
            "leave": leave_count,
            "extra_leaves": extra_leaves
        },
        "deductions": {
            "absent": round(float(deduction_absent), 2),
            "half_day": round(float(deduction_half), 2),
            "extra_leave": round(float(deduction_extra_leave), 2)
        },
        "total_deduction": round(float(total_deduction), 2),
        "payable_amount": round(max(0, float(payable_amount)), 2)
    }

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pay_all_salaries(request):
    """
    Pay all employees their monthly salary based on annual salary / 12
    Admin only
    """
    if request.user.role != 'ADMIN':
        return Response({"error": "Unauthorized"}, status=403)
    
    month_str = request.data.get('month')
    if not month_str:
        return Response({"error": "Month is required (YYYY-MM-DD format)"}, status=400)
    
    try:
        # Prevent future payments
        from datetime import datetime
        today = timezone.localdate()
        pay_date = datetime.strptime(month_str, '%Y-%m-%d').date()
        # Compare year and month only
        pay_month_start = pay_date.replace(day=1)
        current_month_start = today.replace(day=1)
        
        if pay_month_start > current_month_start:
             return Response({"error": "Cannot process bulk salary for future months"}, status=400)

        # Get all active employees
        employees = Employee.objects.all()
        paid_count = 0
        skipped_count = 0
        errors = []
        
        for employee in employees:
            try:
                if not employee.salary or employee.salary <= 0:
                    skipped_count += 1
                    continue
                
                from decimal import Decimal
                # Calculate monthly salary with deductions
                salary_data = compute_employee_salary(employee, month_str)
                monthly_amount = Decimal(str(salary_data['payable_amount']))
                
                # Create or update payroll record
                payroll, created = Payroll.objects.get_or_create(
                    employee=employee,
                    month=month_str,
                    defaults={'amount': monthly_amount, 'status': 'PAID', 'message': 'Auto-processed with attendance-based deductions'}
                )
                
                if not created and payroll.status != 'PAID':
                    # If exists but not paid, update it
                    payroll.amount = monthly_amount
                    payroll.status = 'PAID'
                    payroll.is_seen_by_employee = False
                    payroll.save()
                    paid_count += 1
                elif created:
                    paid_count += 1
                    
            except Exception as e:
                errors.append(f"{employee.user.username}: {str(e)}")
        
        return Response({
            "status": "success",
            "paid_count": paid_count,
            "skipped_count": skipped_count,
            "total_employees": employees.count(),
            "errors": errors
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)

