import requests

BASE_URL = 'http://127.0.0.1:8000'

def test_admin_history():
    # 1. Login as Admin
    print("Logging in as Admin...")
    resp = requests.post(f"{BASE_URL}/api/login/", json={
        'username': 'admin',  # Assuming standard admin username, check populate scripts if unsure
        'password': 'admin'   # Assuming standard password
    })
    
    if resp.status_code != 200:
        print("Login Failed:", resp.text)
        # Try creating a temporary admin if needed or use existing one if known.
        # For now, let's assume 'admin' exists. If not, we might need to verify users.
        return

    token = resp.json().get('access')
    headers = {'Authorization': f'Bearer {token}'}
    print("Login Success. Token acquired.")

    # 2. Fetch History
    print("\nFetching Admin History (payroll/history/all/)...")
    history_resp = requests.get(f"{BASE_URL}/api/payroll/history/all/", headers=headers)
    
    print(f"Status Code: {history_resp.status_code}")
    print(f"Response Body: {history_resp.text}")

    if history_resp.status_code == 200:
        data = history_resp.json()
        print(f"\nRecord Count: {len(data) if isinstance(data, list) else len(data.get('results', []))}")
        if isinstance(data, list) and len(data) > 0:
            print("Sample Record 1:", data[0])

if __name__ == "__main__":
    test_admin_history()
