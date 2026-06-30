# Parity: Rotating Credit Association Manager

---

## About the project

Digital platform for managing informal savings groups (mukando/round) with member verification, contribution tracking, mobile money integration, and automated loan calculations.

---

### Project Goal

To empower community-based savings groups by providing a transparent, "trust-less" digital environment. The goal is to move mukando groups away from fragmented WhatsApp threads and paper notebooks into a structured app that ensures accountability, prevents fraud, and provides members with a digital financial history that could eventually be used for credit scoring.

---

### Project Scope

- **Member Management:** Secure onboarding with KYC (Know Your Customer) or member verification.
- **Automated Ledger:** Real-time tracking of contributions, late fees, and payouts.
- **Mobile Money Integration:** Seamless connection with platforms like EcoCash, OneMoney, or InnBucks for automated payment verification.
- **Loan Lifecycle:** Management of internal group loans, including interest calculations and repayment schedules.
- **Notification Engine:** Automated reminders for upcoming contributions via SMS or Push notifications.
- **Reporting:** Visual dashboards showing group liquidity and individual member standing.

---

### Architecture

- **Frontend:** Built with SwiftUI (iOS) for a smooth, mobile-first user experience.
  
- **Backend:** A Node.js/Express server handling the business logic of "rounds" and interest. It uses jwt tokens for authentication and bcrypt for password hashing
  
- **Database:** Sqlite for relational data (users, clubs, members, transactions).

![Architecture Diagram](/Assets/Architecture.png)

---

### How to run

Install packages: 
- run `npm install`

Run program:
- run `node app.js`

---

### How it works

1. **Group Creation:** A coordinator creates a "Parity Circle," setting the contribution amount (e.g., $50/month) and the rotation schedule.

2. **Verification:** Members join via an invite code and verify their identity.

3. **The Round:** Each period, members contribute to the "pot" via integrated mobile money. The app automatically flags who has paid and who is pending.

4. **The Payout:** Based on a pre-set or randomized schedule, the total pot is disbursed to the "winner" of that round.

5. **Emergency Loans:** If the group allows, members can request small loans from the accumulated "Social Fund," with interest automatically calculated and added back to the group's total value.

6. **Transparency:** Every member can see the group’s total balance and payment history at any time, eliminating disputes.

---

### Endpoints

The Parity API is a RESTful service that returns JSON.

1. **Authentication**
   
   - `POST /auth/register` Registers a new member.

        // Request Body

       ```
       {
       "username": "Jane",
       "email": "jane@gmail.com",
       "password": "admin123!"
       }
       ```

    - `POST /auth/login` Verifies that a user exists then logs them in.

       // Request Body

       ```
       {
       "username": "Jane",
       "password": "admin123!"
       }
       ```


2. **Club Management**  
    Requires token from authentication be passed in under the header `Authentication`
   
   - `GET /clubs` Fetches all clubs that the user is either an admin or a part of.
  

    - `POST /clubs` Creates a new club and the user is assigned as the admin.

       // Request Body

       ```
       {
       "title": "Forbs Group"
       }
       ```

    - `PATCH /clubs/:id` Renames an existing club.

       // Request Body

       ```
       {
       "title": "Dorm group"
       }
       ```

    - `DELETE /clubs/:id` Deletes an existing club.
  

3. **Memeber Management**  
    Requires token from authentication be passed in under the header `Authentication`
    Requires club ID member is in be passed in under the header `ClubId`
   
   - `GET /members` Fetches all members that are in a group.
  

    - `POST /members` Adds a new member to a group, the member has to be an existing member.

       // Request Body

       ```
       {
       "username": "Bob"
       }
       ```

    - `PATCH /members/:id` Makes a transaction for a member.

       // Request Body

       ```
       {
        "investAmount": 1,
        "interestAmount": 0,
        "payLoanAmount": 0,
        "loanAmount": 0
        }
       ```

    - `DELETE /clubs/:id` Removes a member from a group.

---