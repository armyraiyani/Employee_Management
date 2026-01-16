# Employee Management System

A full-stack Employee Management System (EMS) built using Django REST Framework and React.
This application helps organizations manage employees, attendance, payroll (demo), and roles with secure authentication.
---
## 🚀 Features
### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin / Employee)
- Secure login and registration
### 👨‍💼 Admin Module
- Manage employees (Create, Read, Update, Delete)
- View and manage attendance records
- Approve and manage leave requests
- View employee payroll history (demo)
- Dashboard with employee insights
### 👩‍💻 Employee Module
- View personal profile
- Mark daily attendance
- View attendance history
- Apply for leave
- View payroll details (demo)
### 🕒 Attendance & Leave Management
- Date-wise attendance tracking
- Leave request and approval system
- Admin-only access to all employee data
### 💰 Payroll (Demo)
- Sample payroll calculation
- Employee payroll history view
- Admin payroll actions
---
## 🛠️ Tech Stack
### Frontend
- React.js
- React Router
- CSS
### Backend
- Django
- Django REST Framework
- JWT Authentication (SimpleJWT)
### Database
- MySQL

```
📂 Project Structure
Employee_Management_System/
│
├── ems_backend/
│   ├── accounts/
│   ├── employees/
│   ├── attendance/
│   ├── payroll/
│   ├── manage.py
│
├── ems_frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│
├── .gitignore
├── README.md
└── requirements.txt

```

## ⚙️ Installation & Setup
### 🔹 Backend Setup
```
python -m venv venv
venv\Scripts\activate

pip install -r requirements.txt

python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

### 🔹 Frontend Setup
```
cd ems_frontend
npm install
npm start
```

### 🔑 Environment Variables

Create a .env file in backend root:
```
DEBUG=True
SECRET_KEY=your-secret-key
DB_NAME=ems_db
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
```
### 🔐 User Roles
```
Role	Permissions
Admin	Full system access
Employee	Limited to own data
```
Employees cannot access admin functionality.
---

## 📜 License

This project is created for educational and internship purposes.

## 👤 Author

Army Raiyani