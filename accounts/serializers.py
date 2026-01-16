from rest_framework import serializers
from .models import CustomUser, Employee, Department, Attendance, ProfileUpdateRequest, Holiday, WorkSchedule, LeaveRequest, Payroll

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role', 'is_active', 'password', 'full_name', 'raw_password']
        extra_kwargs = {
            'password': {'write_only': True},
            'raw_password': {'read_only': True} 
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        full_name = validated_data.pop('full_name', '')
        first_name = ''
        last_name = ''
        if full_name:
            parts = full_name.strip().split(' ')
            first_name = parts[0]
            last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''

        instance = self.Meta.model(**validated_data)
        instance.first_name = first_name
        instance.last_name = last_name

        if password is not None:
            instance.set_password(password)
            instance.raw_password = password 
        instance.save()
        return instance

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.username', read_only=True)
    check_in_time = serializers.TimeField(format='%H:%M:%S', required=False, allow_null=True)
    check_out_time = serializers.TimeField(format='%H:%M:%S', required=False, allow_null=True)
    
    class Meta:
        model = Attendance
        fields = '__all__'

class EmployeeSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source='department', write_only=True, required=False, allow_null=True
    )
    attendance_records = AttendanceSerializer(many=True, read_only=True)
    # Also include the username for easier frontend display
    user_username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = Employee
        fields = '__all__'

class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = '__all__'

class WorkScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkSchedule
        fields = '__all__'

class ProfileUpdateRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.username', read_only=True)
    
    class Meta:
        model = ProfileUpdateRequest
        fields = ['id', 'employee', 'employee_name', 'new_username', 'new_email', 'new_address', 'new_phone_number', 'status', 'is_dismissed_by_admin', 'is_seen_by_admin', 'created_at']

class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.username', read_only=True)
    
    class Meta:
        model = LeaveRequest
        fields = '__all__'

class PayrollSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.username', read_only=True)
    first_name = serializers.CharField(source='employee.user.first_name', read_only=True)
    last_name = serializers.CharField(source='employee.user.last_name', read_only=True)
    
    class Meta:
        model = Payroll
        fields = '__all__'
