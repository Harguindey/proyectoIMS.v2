#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class ErpApiTester:
    def __init__(self, base_url="https://eee00b16-7b9c-46a1-b044-77883a1417ae.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                    if isinstance(response_data, list):
                        print(f"   Response: Array with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json() if response.content else {}
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'endpoint': endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e),
                'endpoint': endpoint
            })
            return False, {}

    def authenticate(self):
        """Authenticate using dev login"""
        print("🔐 Authenticating...")
        success, response = self.run_test(
            "Dev Login Authentication",
            "GET",
            "/api/dev-login?email=admin@tiremax.com",
            200
        )
        if success:
            print("✅ Authentication successful")
            return True
        else:
            print("❌ Authentication failed")
            return False

    def seed_erp_data(self):
        """Seed ERP demo data"""
        print("🌱 Seeding ERP data...")
        success, response = self.run_test(
            "Seed ERP Data",
            "POST",
            "/api/erp/seed",
            200
        )
        return success

    def test_erp_endpoints(self):
        """Test all ERP endpoints"""
        print("\n" + "="*50)
        print("🧪 TESTING ERP API ENDPOINTS")
        print("="*50)

        # Test GET endpoints
        endpoints_to_test = [
            ("Get Invoices", "GET", "/api/erp/invoices", 200),
            ("Get Purchase Orders", "GET", "/api/erp/purchase-orders", 200),
            ("Get Chart of Accounts", "GET", "/api/erp/accounts", 200),
            ("Get CRM Deals", "GET", "/api/erp/crm/deals", 200),
            ("Get CRM Activities", "GET", "/api/erp/crm/activities", 200),
            ("Get Employees", "GET", "/api/erp/employees", 200),
            ("Get Departments", "GET", "/api/erp/departments", 200),
            ("Get Journal Entries", "GET", "/api/erp/journal-entries", 200),
            ("Get Fiscal Years", "GET", "/api/erp/fiscal-years", 200),
        ]

        for name, method, endpoint, expected_status in endpoints_to_test:
            self.run_test(name, method, endpoint, expected_status)

    def test_create_operations(self):
        """Test create operations"""
        print("\n" + "="*50)
        print("🆕 TESTING CREATE OPERATIONS")
        print("="*50)

        # Test create invoice
        invoice_data = {
            "customerName": "Test Customer",
            "customerTaxId": "B12345678",
            "customerAddress": "Test Address 123",
            "customerCity": "Madrid",
            "customerPostalCode": "28001",
            "type": "standard",
            "paymentMethod": "transfer",
            "paymentTerms": "30_days",
            "subtotal": "1000.00",
            "taxAmount": "210.00",
            "totalAmount": "1210.00",
            "notes": "Test invoice created by automated test"
        }
        
        success, invoice_response = self.run_test(
            "Create Invoice",
            "POST",
            "/api/erp/invoices",
            201,
            data=invoice_data
        )

        # Store invoice ID for SII/Verifactu tests
        if success and invoice_response:
            self.test_invoice_id = invoice_response.get('id')

        # Test create employee
        employee_data = {
            "employeeCode": "TEST-001",
            "firstName": "Test",
            "lastName": "Employee",
            "email": "test.employee@test.com",
            "phone": "+34 600 000 000",
            "taxId": "12345678T",
            "position": "Test Position",
            "contractType": "temporal",
            "salary": "25000",
            "startDate": "2025-01-01T00:00:00.000Z"
        }
        
        success, employee_response = self.run_test(
            "Create Employee",
            "POST",
            "/api/erp/employees",
            201,
            data=employee_data
        )

        return True

    def test_sii_verifactu_endpoints(self):
        """Test SII and Verifactu electronic invoicing endpoints"""
        print("\n" + "="*50)
        print("📄 TESTING SII/VERIFACTU ENDPOINTS")
        print("="*50)

        # Get first available invoice for testing
        success, invoices = self.run_test(
            "Get Invoices for SII Testing",
            "GET",
            "/api/erp/invoices",
            200
        )

        if not success or not invoices or len(invoices) == 0:
            print("❌ No invoices available for SII/Verifactu testing")
            return False

        # Use first invoice
        test_invoice = invoices[0]
        invoice_id = test_invoice['id']
        print(f"📋 Using invoice ID {invoice_id} ({test_invoice.get('invoiceNumber', 'N/A')}) for testing")

        # Test SII XML download
        success, _ = self.run_test(
            "SII XML Download",
            "GET",
            f"/api/erp/invoices/{invoice_id}/sii-xml",
            200
        )

        # Test Verifactu XML download
        success, _ = self.run_test(
            "Verifactu XML Download",
            "GET",
            f"/api/erp/invoices/{invoice_id}/verifactu-xml",
            200
        )

        # Test Verifactu QR URL
        success, qr_response = self.run_test(
            "Verifactu QR URL",
            "GET",
            f"/api/erp/invoices/{invoice_id}/verifactu-qr",
            200
        )

        if success and qr_response:
            qr_url = qr_response.get('qrUrl')
            if qr_url:
                print(f"   QR URL: {qr_url}")
            else:
                print("   ⚠️ Warning: No qrUrl in response")

        # Test SII submission for non-draft invoices
        if test_invoice.get('status') != 'draft':
            success, sii_response = self.run_test(
                "SII Submit (Non-Draft)",
                "POST",
                f"/api/erp/invoices/{invoice_id}/sii-submit",
                200
            )
            if success and sii_response:
                print(f"   SII Status: {sii_response.get('siiStatus', 'N/A')}")
        else:
            print("   ℹ️ Skipping SII submit test - invoice is in draft status")

        # Test SII submission error for draft invoices (if we have any)
        draft_invoices = [inv for inv in invoices if inv.get('status') == 'draft']
        if draft_invoices:
            draft_id = draft_invoices[0]['id']
            success, error_response = self.run_test(
                "SII Submit Error (Draft)",
                "POST",
                f"/api/erp/invoices/{draft_id}/sii-submit",
                400  # Should return error for draft
            )
            if success:
                print("   ✅ Correctly rejected draft invoice for SII submission")

        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print("📊 TEST SUMMARY")
        print("="*50)
        print(f"Total tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
                print(f"  - {test['name']}: {error_msg}")
        
        return len(self.failed_tests) == 0

def main():
    tester = ErpApiTester()
    
    # Step 1: Authenticate
    if not tester.authenticate():
        print("❌ Authentication failed, stopping tests")
        return 1
    
    # Step 2: Seed data (optional, may already exist)
    print("\n🌱 Attempting to seed ERP data...")
    tester.seed_erp_data()  # Don't fail if this doesn't work
    
    # Step 3: Test ERP endpoints
    tester.test_erp_endpoints()
    
    # Step 4: Test create operations
    tester.test_create_operations()
    
    # Step 5: Test SII/Verifactu endpoints
    tester.test_sii_verifactu_endpoints()
    
    # Step 6: Print summary
    success = tester.print_summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())