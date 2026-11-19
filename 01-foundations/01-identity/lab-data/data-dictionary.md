# Lab data dictionary

All data is fictional. It describes XYZ Pty Ltd.

XYZ is a small company. The files are complete: 11 employees, 4 contractors, all 25 Entra ID accounts, and all 7 users of the PayFlow payroll application.

## workday_employees.csv

Authoritative source for employees.

| Field | Meaning |
| --- | --- |
| `employee_id` | Unique employee number (E….) |
| `given_name`, `family_name` | Legal name |
| `department`, `job_title` | Current position |
| `manager_id` | `employee_id` of the person's manager |
| `employment_status` | Active, On leave or Terminated |
| `start_date`, `end_date` | Employment dates; `end_date` is blank while employed |

## contractor_system.csv

Authoritative source for contractors.

| Field | Meaning |
| --- | --- |
| `contractor_id` | Unique contractor number (C….) |
| `given_name`, `family_name` | Name |
| `agency` | Supplying agency |
| `department` | XYZ department they work in |
| `sponsor_employee_id` | XYZ employee responsible for the engagement |
| `engagement_status` | Active or Ended |
| `start_date`, `end_date` | Engagement dates |

## entra_id_accounts.csv

The identity store being assessed. Not authoritative for anything except its own account settings.

| Field | Meaning |
| --- | --- |
| `user_principal_name` | Sign-in name. Use this as the account identifier in your evidence |
| `display_name` | Name shown in the directory |
| `account_type` | Member (internal) or Guest (external) |
| `employee_id` | Link to the authoritative record: an E… number for employees, a C… number for contractors. Blank for accounts with no person behind them |
| `department`, `job_title`, `manager_upn` | Copies of HR data, expected to match the authoritative source |
| `owner_or_sponsor_upn` | Person accountable for an account that isn't a standard personal account (admin, service, guest, emergency) |
| `date_of_birth` | Personal attribute held in the directory |
| `account_enabled` | TRUE = can sign in |
| `created_date` | When the account was created |
| `auth_methods` | How the account proves it is who it claims to be (its credential or authenticator) |
| `last_sign_in` | Most recent successful sign-in, interactive or non-interactive (like Entra ID's `lastSuccessfulSignInDateTime`). Blank = no sign-in recorded |
| `description` | Free-text note entered by an administrator |

## payflow_users.csv

User list from PayFlow, XYZ's payroll application. PayFlow consumes identity information: most users sign in through Entra ID, but it can also hold its own local accounts.

| Field | Meaning |
| --- | --- |
| `app_user_id` | PayFlow's own internal ID for the user |
| `username` | What the user signs in with. For single sign-on users this is their Entra ID name |
| `display_name` | Name shown in PayFlow |
| `sign_in_method` | Entra ID single sign-on, a PayFlow password, or an API client secret |
| `app_role` | The user's role in PayFlow |
| `status` | Active or Disabled |
| `last_login` | Most recent login to PayFlow |
