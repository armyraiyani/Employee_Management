from django.contrib import admin
from .models import CustomUser, Department, Employee, Holiday, WorkSchedule, Attendance, ProfileUpdateRequest, LeaveRequest

admin.site.register(CustomUser)
admin.site.register(Department)
admin.site.register(Employee)
admin.site.register(Holiday)
admin.site.register(WorkSchedule)
admin.site.register(Attendance)
admin.site.register(ProfileUpdateRequest)
admin.site.register(LeaveRequest)
