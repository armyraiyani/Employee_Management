from accounts.models import Employee

def clear_all_resumes():
    employees = Employee.objects.all()
    count = 0
    for emp in employees:
        if emp.resume:
            print(f"Deleting resume for {emp.user.username}...")
            # delete(save=True) removes the file from storage and sets the field to None, then saves the instance
            emp.resume.delete(save=True) 
            count += 1
    print(f"Successfully deleted {count} resumes.")

clear_all_resumes()
