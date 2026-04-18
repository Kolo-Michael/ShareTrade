# ShareTrade P2P — Stack Recommendation & Complete Database Schema

---

## 1. RECOMMENDED STACK: Django + PostgreSQL

### Why Django?

After reviewing your 37 pages, 15 data entities, 12 backend features and the financial/regulatory
nature of the platform (escrow, KYC, audit trails, cap tables), **Django is the best fit** for you.

| Requirement | How Django covers it |
|---|---|
| Security | Built-in CSRF, XSS, SQL injection protection, bcrypt passwords, HTTPS redirect |
| Authentication | django-allauth for social login, built-in session system, 2FA via django-otp |
| Role-based access | Django Groups + Permissions (Investor / Company / Admin) |
| Database ORM | Django ORM — write Python, never raw SQL (unless you want to) |
| File uploads | Django handles file uploads natively (KYC docs, company docs) |
| Admin panel | Django Admin — free, instant back-office for your admin role |
| REST API | Django REST Framework (DRF) — industry standard, free, very well documented |
| Real-time | Django Channels — WebSocket support for live notifications |
| PDF generation | WeasyPrint or ReportLab — generate share certificates as PDF |
| Email/SMS | django-anymail (Mailgun/Sendgrid) + Twilio for SMS |
| Task queues | Celery + Redis — async jobs (escrow SLA checks, certificate generation) |
| Entirely free | Yes — Django, PostgreSQL, Redis are all open source |

### Full Stack

```
Frontend  →  Your existing HTML/CSS/JS (keep it, just wire up API calls)
Backend   →  Django 5.x  (Python)
API       →  Django REST Framework  (DRF)
Database  →  PostgreSQL 16
Cache     →  Redis  (sessions, Celery broker, real-time pub/sub)
Files     →  Local filesystem (dev) → AWS S3 / Backblaze B2 (production)
Real-time →  Django Channels + Redis (live notifications)
Tasks     →  Celery (async: escrow SLA, email, PDF generation)
PDF       →  WeasyPrint
Email     →  SMTP (dev) → Mailgun/Sendgrid (production)
SMS       →  Twilio or Orange Money API
Deploy    →  Railway / Render / VPS (all free tiers available)
```

### Why NOT others?

- **Laravel (PHP)** — Good choice, but Python/Django is better for financial logic and has
  better libraries for compliance, crypto, and data science if you expand later.
- **Node.js / Express** — Too low-level. You'd spend months building what Django gives you for free.
- **FastAPI** — Modern and fast, but minimal. You'd have to build auth, admin, ORM from scratch.
- **Ruby on Rails** — Similar power to Django, but smaller ecosystem in Cameroon/Africa dev community.

---

## 2. ARCHITECTURE OVERVIEW

```
Browser (your HTML/CSS/JS)
     │
     │  HTTP/JSON (DRF API endpoints)
     │  WebSocket (Django Channels — notifications)
     ▼
┌─────────────────────────────────────────┐
│            Django Application           │
│                                         │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │  Django  │  │  Django REST         │ │
│  │  Admin   │  │  Framework (API)     │ │
│  └──────────┘  └──────────────────────┘ │
│                                         │
│  ┌─────────────┐  ┌───────────────────┐ │
│  │   Celery    │  │  Django Channels  │ │
│  │  (async     │  │  (WebSocket /     │ │
│  │   tasks)    │  │   real-time)      │ │
│  └─────────────┘  └───────────────────┘ │
└─────────────────────────────────────────┘
     │              │              │
     ▼              ▼              ▼
PostgreSQL        Redis          File Storage
(main data)    (cache/queue)   (KYC docs, PDFs)
```

---

## 3. INSTALLATION STEPS

### Step 1 — Set up Python environment
```bash
# Install Python 3.12+ and pip (if not installed)
python3 --version

# Create your project folder
mkdir sharetrade && cd sharetrade

# Create virtual environment
python3 -m venv venv
source venv/bin/activate          # Mac/Linux
# venv\Scripts\activate           # Windows

# Install Django and core packages
pip install django djangorestframework psycopg2-binary pillow \
            django-cors-headers djangorestframework-simplejwt \
            celery redis django-storages boto3 weasyprint \
            django-filter whitenoise python-decouple
```

### Step 2 — Create the project
```bash
django-admin startproject config .
python manage.py startapp users
python manage.py startapp companies
python manage.py startapp trades
python manage.py startapp kyc
python manage.py startapp wallet
python manage.py startapp notifications
python manage.py startapp documents
python manage.py startapp certificates
```

### Step 3 — PostgreSQL setup
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE sharetrade_db;
CREATE USER sharetrade_user WITH PASSWORD 'your_strong_password';
ALTER ROLE sharetrade_user SET client_encoding TO 'utf8';
GRANT ALL PRIVILEGES ON DATABASE sharetrade_db TO sharetrade_user;
\q
```

### Step 4 — settings.py (key config)
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'sharetrade_db',
        'USER': 'sharetrade_user',
        'PASSWORD': 'your_strong_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'rest_framework',
    'corsheaders',
    'users', 'companies', 'trades',
    'kyc', 'wallet', 'notifications',
    'documents', 'certificates',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

---

## 4. COMPLETE DATABASE SCHEMA

### Design Principles
- Every table has `created_at` and `updated_at`
- All money stored in **XAF as INTEGER** (no decimals — avoids floating point errors)
- UUIDs as primary keys for security (no guessable sequential IDs)
- Soft deletes (`is_deleted`, `deleted_at`) — financial data must never be hard-deleted
- Full audit trail on every sensitive table

---

### TABLE 1 — users
The main investor account table. Extends Django's built-in auth_user.

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Links to Django's built-in auth_user for login/password
    auth_user_id    INTEGER UNIQUE NOT NULL REFERENCES auth_user(id),

    -- Personal info
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    date_of_birth   DATE,
    nationality     VARCHAR(100) DEFAULT 'Cameroonian',
    city            VARCHAR(100),
    region          VARCHAR(100),

    -- KYC
    kyc_status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (kyc_status IN ('pending','in_review','approved','rejected','incomplete')),
    kyc_approved_at TIMESTAMP WITH TIME ZONE,
    kyc_approved_by UUID,   -- references admin_users.id

    -- Wallet
    wallet_balance  BIGINT NOT NULL DEFAULT 0,  -- XAF in centimes (or whole XAF)
    escrow_balance  BIGINT NOT NULL DEFAULT 0,  -- funds currently locked in escrow

    -- Status
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_suspended    BOOLEAN NOT NULL DEFAULT FALSE,
    suspension_reason TEXT,
    suspended_at    TIMESTAMP WITH TIME ZONE,
    suspended_by    UUID,

    -- Metadata
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMP WITH TIME ZONE,
    last_login_ip   INET
);

CREATE INDEX idx_users_kyc_status ON users(kyc_status);
CREATE INDEX idx_users_is_suspended ON users(is_suspended);
```

---

### TABLE 2 — companies
Company accounts on the platform.

```sql
CREATE TABLE companies (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id        INTEGER UNIQUE NOT NULL REFERENCES auth_user(id),

    -- Company identity
    name                VARCHAR(255) NOT NULL,
    legal_form          VARCHAR(20) NOT NULL
                        CHECK (legal_form IN ('SA','SARL','SAS','SNC','GIE','SE','Etablissement')),
    rccm_number         VARCHAR(100) UNIQUE NOT NULL,
    niu_number          VARCHAR(100) UNIQUE NOT NULL,   -- NIU from DGI
    sector              VARCHAR(100) NOT NULL,

    -- Financial
    share_capital       BIGINT NOT NULL,               -- XAF
    total_shares        INTEGER NOT NULL,              -- authorised shares
    issued_shares       INTEGER NOT NULL DEFAULT 0,    -- shares currently issued
    share_price         BIGINT NOT NULL DEFAULT 0,     -- current price per share XAF
    treasury_shares     INTEGER NOT NULL DEFAULT 0,    -- shares held by company (buybacks)

    -- Address
    registered_address  TEXT NOT NULL,
    city                VARCHAR(100) NOT NULL,
    region              VARCHAR(100) NOT NULL,
    po_box              VARCHAR(50),
    phone               VARCHAR(20),
    email               VARCHAR(255),
    website             VARCHAR(255),

    -- Incorporation
    incorporated_at     DATE NOT NULL,
    description         TEXT,

    -- Legal rep
    rep_name            VARCHAR(200) NOT NULL,
    rep_title           VARCHAR(100),
    rep_email           VARCHAR(255),
    rep_phone           VARCHAR(20),

    -- KYC/status
    kyc_status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (kyc_status IN ('pending','in_review','approved','rejected','incomplete')),
    kyc_approved_at     TIMESTAMP WITH TIME ZONE,
    kyc_approved_by     UUID,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_suspended        BOOLEAN NOT NULL DEFAULT FALSE,
    suspension_reason   TEXT,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_kyc_status ON companies(kyc_status);
CREATE INDEX idx_companies_sector     ON companies(sector);
CREATE UNIQUE INDEX idx_companies_rccm ON companies(rccm_number);
```

---

### TABLE 3 — admin_users
Platform administrators (separate from investors/companies).

```sql
CREATE TABLE admin_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id    INTEGER UNIQUE NOT NULL REFERENCES auth_user(id),
    display_name    VARCHAR(200) NOT NULL,
    role            VARCHAR(30) NOT NULL DEFAULT 'admin'
                    CHECK (role IN ('super_admin','admin','support','compliance')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMP WITH TIME ZONE
);
```

---

### TABLE 4 — kyc_documents
Every identity document uploaded by an investor or company.

```sql
CREATE TABLE kyc_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner — exactly one of these will be set
    user_id         UUID REFERENCES users(id) ON DELETE RESTRICT,
    company_id      UUID REFERENCES companies(id) ON DELETE RESTRICT,

    -- Document info
    doc_type        VARCHAR(60) NOT NULL CHECK (doc_type IN (
                        -- Investor docs
                        'passport','cni_front','cni_back',
                        'proof_of_address','selfie_with_id',
                        -- Company docs
                        'rccm_certificate','statuts','pv_assemblee',
                        'niu_attestation','patente','attestation_localisation',
                        'plan_localisation','rep_id','acte_ohada'
                    )),
    file_path       VARCHAR(500) NOT NULL,  -- S3 key or local path
    file_name       VARCHAR(255) NOT NULL,
    file_size       INTEGER NOT NULL,       -- bytes
    mime_type       VARCHAR(100) NOT NULL,

    -- Review
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','expired','renewal_needed')),
    reviewed_by     UUID REFERENCES admin_users(id),
    reviewed_at     TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    expiry_date     DATE,                   -- for docs that expire (Patente, NIU, etc.)
    notes           TEXT,

    -- Soft delete
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP WITH TIME ZONE,

    uploaded_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Ensure doc belongs to only one owner
    CONSTRAINT chk_single_owner CHECK (
        (user_id IS NOT NULL AND company_id IS NULL) OR
        (user_id IS NULL AND company_id IS NOT NULL)
    )
);

CREATE INDEX idx_kyc_docs_user_id    ON kyc_documents(user_id);
CREATE INDEX idx_kyc_docs_company_id ON kyc_documents(company_id);
CREATE INDEX idx_kyc_docs_status     ON kyc_documents(status);
CREATE INDEX idx_kyc_docs_expiry     ON kyc_documents(expiry_date);
```

---

### TABLE 5 — share_listings
Marketplace listings created by companies.

```sql
CREATE TABLE share_listings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,

    shares_offered  INTEGER NOT NULL CHECK (shares_offered > 0),
    shares_sold     INTEGER NOT NULL DEFAULT 0,
    price_per_share BIGINT NOT NULL CHECK (price_per_share > 0),  -- XAF
    min_investment  BIGINT NOT NULL,   -- XAF

    eligibility     VARCHAR(30) NOT NULL DEFAULT 'all_kyc'
                    CHECK (eligibility IN ('all_kyc','institutional_only','invite_only')),
    description     TEXT,

    starts_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Admin approval
    status          VARCHAR(20) NOT NULL DEFAULT 'pending_review'
                    CHECK (status IN ('pending_review','active','expired','closed','rejected')),
    approved_by     UUID REFERENCES admin_users(id),
    approved_at     TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Derived: shares_available = shares_offered - shares_sold
    CONSTRAINT chk_shares_sold CHECK (shares_sold <= shares_offered)
);

CREATE INDEX idx_listings_company_id ON share_listings(company_id);
CREATE INDEX idx_listings_status     ON share_listings(status);
CREATE INDEX idx_listings_expires    ON share_listings(expires_at);
```

---

### TABLE 6 — trades
Every buy/sell order on the platform. The heart of the system.

```sql
CREATE TABLE trades (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_ref       VARCHAR(20) UNIQUE NOT NULL,  -- e.g. T-00241

    -- Parties
    investor_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    listing_id      UUID REFERENCES share_listings(id),

    -- Trade details
    trade_type      VARCHAR(4) NOT NULL CHECK (trade_type IN ('BUY','SELL')),
    shares          INTEGER NOT NULL CHECK (shares > 0),
    price_per_share BIGINT NOT NULL CHECK (price_per_share > 0),
    total_amount    BIGINT NOT NULL,          -- shares × price_per_share
    platform_fee    BIGINT NOT NULL DEFAULT 0, -- 1% of total_amount
    net_amount      BIGINT NOT NULL,          -- total_amount - platform_fee

    -- Workflow status
    status          VARCHAR(30) NOT NULL DEFAULT 'submitted'
                    CHECK (status IN (
                        'submitted',           -- investor placed order
                        'escrow_locked',       -- funds moved to escrow
                        'awaiting_approval',   -- waiting for company
                        'company_approved',    -- company confirmed
                        'registry_updating',   -- cap table being updated
                        'completed',           -- all done, cert issued
                        'rejected_by_company', -- company said no
                        'cancelled',           -- investor cancelled
                        'expired',             -- timed out
                        'disputed'             -- under dispute
                    )),

    -- Timestamps for each step
    submitted_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    escrow_locked_at    TIMESTAMP WITH TIME ZONE,
    approved_at         TIMESTAMP WITH TIME ZONE,
    completed_at        TIMESTAMP WITH TIME ZONE,
    rejected_at         TIMESTAMP WITH TIME ZONE,
    cancelled_at        TIMESTAMP WITH TIME ZONE,

    -- Company action
    company_action_by   UUID,              -- company user who approved/rejected
    rejection_reason    TEXT,

    -- Admin override
    admin_override_by   UUID REFERENCES admin_users(id),
    admin_notes         TEXT,

    -- Soft delete
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_total_amount CHECK (total_amount = shares * price_per_share)
);

CREATE INDEX idx_trades_investor_id ON trades(investor_id);
CREATE INDEX idx_trades_company_id  ON trades(company_id);
CREATE INDEX idx_trades_status      ON trades(status);
CREATE INDEX idx_trades_trade_type  ON trades(trade_type);
CREATE INDEX idx_trades_submitted   ON trades(submitted_at DESC);
CREATE UNIQUE INDEX idx_trades_ref  ON trades(trade_ref);
```

---

### TABLE 7 — escrow_holds
Tracks every fund lock associated with a trade.

```sql
CREATE TABLE escrow_holds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_ref      VARCHAR(20) UNIQUE NOT NULL,  -- e.g. ESC-000241

    trade_id        UUID NOT NULL REFERENCES trades(id) ON DELETE RESTRICT,
    investor_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    amount          BIGINT NOT NULL CHECK (amount > 0),  -- XAF locked

    status          VARCHAR(20) NOT NULL DEFAULT 'locked'
                    CHECK (status IN (
                        'locked',      -- funds held
                        'released',    -- disbursed to company on completion
                        'refunded',    -- returned to investor on rejection/cancel
                        'frozen'       -- frozen due to dispute
                    )),

    locked_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    released_at     TIMESTAMP WITH TIME ZONE,
    sla_deadline    TIMESTAMP WITH TIME ZONE NOT NULL,  -- locked_at + 7 days
    release_reason  TEXT,

    -- Who actioned the release
    released_by_admin UUID REFERENCES admin_users(id),

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escrow_trade_id   ON escrow_holds(trade_id);
CREATE INDEX idx_escrow_investor   ON escrow_holds(investor_id);
CREATE INDEX idx_escrow_status     ON escrow_holds(status);
CREATE INDEX idx_escrow_sla        ON escrow_holds(sla_deadline);
```

---

### TABLE 8 — wallet_transactions
Every credit and debit on every investor wallet.

```sql
CREATE TABLE wallet_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    txn_ref         VARCHAR(20) UNIQUE NOT NULL,  -- e.g. DEP-001242

    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    txn_type        VARCHAR(20) NOT NULL CHECK (txn_type IN (
                        'deposit',
                        'withdrawal',
                        'escrow_lock',
                        'escrow_release',
                        'trade_proceeds',   -- funds received from SELL
                        'trade_payment',    -- funds sent for BUY
                        'fee_charge',
                        'refund',
                        'adjustment'        -- admin manual correction
                    )),

    amount          BIGINT NOT NULL,       -- positive = credit, negative = debit
    balance_before  BIGINT NOT NULL,       -- wallet balance before this txn
    balance_after   BIGINT NOT NULL,       -- wallet balance after this txn

    -- Reference to related objects
    trade_id        UUID REFERENCES trades(id),
    escrow_id       UUID REFERENCES escrow_holds(id),

    -- Payment method (for deposits/withdrawals)
    payment_method  VARCHAR(30) CHECK (payment_method IN (
                        'mtn_mobile_money','orange_money',
                        'bank_transfer','express_union',
                        'western_union','platform_internal'
                    )),
    payment_ref     VARCHAR(200),   -- external payment provider reference
    payment_phone   VARCHAR(20),

    status          VARCHAR(20) NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('pending','completed','failed','reversed')),

    description     TEXT NOT NULL,
    admin_note      TEXT,
    processed_by    UUID REFERENCES admin_users(id),  -- for manual adjustments

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_balance_after CHECK (balance_after = balance_before + amount)
);

CREATE INDEX idx_wallet_txn_user_id    ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_txn_trade_id   ON wallet_transactions(trade_id);
CREATE INDEX idx_wallet_txn_type       ON wallet_transactions(txn_type);
CREATE INDEX idx_wallet_txn_created    ON wallet_transactions(created_at DESC);
```

---

### TABLE 9 — cap_table
The share registry. Every shareholder's current position.

```sql
CREATE TABLE cap_table (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    shares_held     INTEGER NOT NULL DEFAULT 0 CHECK (shares_held >= 0),
    avg_buy_price   BIGINT NOT NULL DEFAULT 0,   -- weighted average XAF

    first_acquired  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_updated    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Each company/investor pair must be unique
    UNIQUE (company_id, user_id)
);

CREATE INDEX idx_cap_table_company ON cap_table(company_id);
CREATE INDEX idx_cap_table_user    ON cap_table(user_id);
```

---

### TABLE 10 — cap_table_history
Immutable record of every change to the cap table (for audit/disputes).

```sql
CREATE TABLE cap_table_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    trade_id        UUID NOT NULL REFERENCES trades(id),

    change_type     VARCHAR(10) NOT NULL CHECK (change_type IN ('BUY','SELL','TRANSFER','ADJUSTMENT')),
    shares_delta    INTEGER NOT NULL,   -- positive = gained, negative = lost
    shares_before   INTEGER NOT NULL,
    shares_after    INTEGER NOT NULL,
    price_per_share BIGINT NOT NULL,

    recorded_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cap_hist_company ON cap_table_history(company_id);
CREATE INDEX idx_cap_hist_trade   ON cap_table_history(trade_id);
```

---

### TABLE 11 — share_certificates
Official ownership certificate for each completed trade.

```sql
CREATE TABLE share_certificates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cert_ref        VARCHAR(20) UNIQUE NOT NULL,  -- e.g. CERT-001820

    trade_id        UUID NOT NULL UNIQUE REFERENCES trades(id) ON DELETE RESTRICT,
    investor_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,

    shares          INTEGER NOT NULL CHECK (shares > 0),
    price_per_share BIGINT NOT NULL,
    total_value     BIGINT NOT NULL,

    -- Generated PDF
    pdf_path        VARCHAR(500),       -- S3 key or local path
    pdf_generated   BOOLEAN NOT NULL DEFAULT FALSE,
    pdf_generated_at TIMESTAMP WITH TIME ZONE,

    -- Validity
    status          VARCHAR(20) NOT NULL DEFAULT 'valid'
                    CHECK (status IN ('valid','revoked','superseded')),
    revoked_at      TIMESTAMP WITH TIME ZONE,
    revoked_reason  TEXT,

    issued_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_certs_investor ON share_certificates(investor_id);
CREATE INDEX idx_certs_company  ON share_certificates(company_id);
CREATE INDEX idx_certs_status   ON share_certificates(status);
```

---

### TABLE 12 — company_documents
Official company registration documents (RCCM, NIU, Patente, etc).

```sql
CREATE TABLE company_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,

    doc_type        VARCHAR(40) NOT NULL CHECK (doc_type IN (
                        'rccm_certificate','statuts','pv_assemblee',
                        'niu_attestation','patente','attestation_localisation',
                        'plan_localisation','rep_id','acte_ohada'
                    )),
    file_path       VARCHAR(500) NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    file_size       INTEGER NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,

    -- Verification
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','verified','rejected','expired','renewal_needed')),
    verified_by     UUID REFERENCES admin_users(id),
    verified_at     TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Expiry tracking
    issue_date      DATE,
    expiry_date     DATE,
    is_permanent    BOOLEAN NOT NULL DEFAULT FALSE,  -- e.g. RCCM never expires

    notes           TEXT,
    uploaded_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Only one active doc per type per company
    is_current      BOOLEAN NOT NULL DEFAULT TRUE,

    UNIQUE (company_id, doc_type, is_current) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_co_docs_company   ON company_documents(company_id);
CREATE INDEX idx_co_docs_type      ON company_documents(doc_type);
CREATE INDEX idx_co_docs_status    ON company_documents(status);
CREATE INDEX idx_co_docs_expiry    ON company_documents(expiry_date);
```

---

### TABLE 13 — buyback_programs
Company share repurchase programs.

```sql
CREATE TABLE buyback_programs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_ref     VARCHAR(20) UNIQUE NOT NULL,  -- e.g. BBK-003

    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,

    buyback_price   BIGINT NOT NULL CHECK (buyback_price > 0),
    target_shares   INTEGER NOT NULL CHECK (target_shares > 0),
    acquired_shares INTEGER NOT NULL DEFAULT 0,
    total_budget    BIGINT NOT NULL,   -- target_shares × buyback_price
    budget_spent    BIGINT NOT NULL DEFAULT 0,

    eligibility     VARCHAR(30) NOT NULL DEFAULT 'all'
                    CHECK (eligibility IN ('all','retail_only','institutional_only')),

    starts_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at         TIMESTAMP WITH TIME ZONE NOT NULL,

    status          VARCHAR(20) NOT NULL DEFAULT 'pending_approval'
                    CHECK (status IN ('pending_approval','running','paused','completed','terminated')),

    approved_by     UUID REFERENCES admin_users(id),
    approved_at     TIMESTAMP WITH TIME ZONE,

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_acquired CHECK (acquired_shares <= target_shares),
    CONSTRAINT chk_budget_spent CHECK (budget_spent <= total_budget)
);

CREATE INDEX idx_buyback_company ON buyback_programs(company_id);
CREATE INDEX idx_buyback_status  ON buyback_programs(status);
```

---

### TABLE 14 — disputes
Trade conflicts requiring admin mediation.

```sql
CREATE TABLE disputes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_ref     VARCHAR(20) UNIQUE NOT NULL,  -- e.g. D-00018

    trade_id        UUID NOT NULL UNIQUE REFERENCES trades(id) ON DELETE RESTRICT,
    escrow_id       UUID REFERENCES escrow_holds(id),
    filed_by        UUID NOT NULL REFERENCES users(id),
    filed_against   UUID NOT NULL REFERENCES companies(id),

    priority        VARCHAR(10) NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('high','medium','low')),
    description     TEXT NOT NULL,

    status          VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','mediating','resolved','escalated','closed')),

    -- Resolution
    ruling          VARCHAR(20) CHECK (ruling IN ('investor','company','mutual','void')),
    resolution_note TEXT,
    resolved_by     UUID REFERENCES admin_users(id),
    resolved_at     TIMESTAMP WITH TIME ZONE,

    -- SLA: 14 business days
    sla_deadline    TIMESTAMP WITH TIME ZONE NOT NULL,

    filed_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_trade_id ON disputes(trade_id);
CREATE INDEX idx_disputes_status   ON disputes(status);
CREATE INDEX idx_disputes_filed    ON disputes(filed_at DESC);
```

---

### TABLE 15 — dispute_evidence
Files and notes submitted as evidence in a dispute.

```sql
CREATE TABLE dispute_evidence (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id      UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,

    submitted_by    UUID NOT NULL REFERENCES users(id),
    evidence_type   VARCHAR(20) NOT NULL CHECK (evidence_type IN ('file','note','screenshot','email')),
    description     TEXT NOT NULL,
    file_path       VARCHAR(500),
    file_name       VARCHAR(255),

    submitted_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_dispute ON dispute_evidence(dispute_id);
```

---

### TABLE 16 — notifications
Every in-app notification sent to any user.

```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Recipient — one of these will be set
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,

    notif_type      VARCHAR(40) NOT NULL CHECK (notif_type IN (
                        'trade_submitted','trade_approved','trade_rejected',
                        'trade_completed','escrow_locked','escrow_released',
                        'kyc_approved','kyc_rejected','kyc_reminder',
                        'deposit_confirmed','withdrawal_completed',
                        'certificate_issued','dispute_opened','dispute_resolved',
                        'listing_approved','listing_expired',
                        'buyback_activated','document_expiry',
                        'system_announcement','admin_message'
                    )),

    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    action_url      VARCHAR(500),   -- relative URL to jump to

    -- Related objects
    trade_id        UUID REFERENCES trades(id),
    dispute_id      UUID REFERENCES disputes(id),

    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMP WITH TIME ZONE,

    -- Delivery
    email_sent      BOOLEAN NOT NULL DEFAULT FALSE,
    sms_sent        BOOLEAN NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_notif_recipient CHECK (
        (user_id IS NOT NULL AND company_id IS NULL) OR
        (user_id IS NULL AND company_id IS NOT NULL)
    )
);

CREATE INDEX idx_notif_user_id    ON notifications(user_id);
CREATE INDEX idx_notif_company_id ON notifications(company_id);
CREATE INDEX idx_notif_is_read    ON notifications(is_read);
CREATE INDEX idx_notif_created    ON notifications(created_at DESC);
```

---

### TABLE 17 — audit_logs
Immutable record of every action. Never updated, never deleted.

```sql
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who did it
    actor_type      VARCHAR(20) NOT NULL CHECK (actor_type IN ('investor','company','admin','system')),
    actor_id        UUID,               -- user/company/admin UUID
    actor_ip        INET,
    actor_user_agent TEXT,

    -- What they did
    action          VARCHAR(100) NOT NULL,   -- e.g. 'trade.submitted', 'kyc.approved'
    entity_type     VARCHAR(50),             -- e.g. 'trade', 'user', 'company'
    entity_id       UUID,                    -- ID of affected object

    -- Details
    description     TEXT NOT NULL,
    old_values      JSONB,                   -- before state (for updates)
    new_values      JSONB,                   -- after state
    metadata        JSONB,                   -- any extra context

    -- Result
    result          VARCHAR(20) NOT NULL DEFAULT 'success'
                    CHECK (result IN ('success','failure','partial')),
    error_message   TEXT,

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()

    -- NOTE: NO updated_at — this table is append-only
);

CREATE INDEX idx_audit_actor_id   ON audit_logs(actor_id);
CREATE INDEX idx_audit_action     ON audit_logs(action);
CREATE INDEX idx_audit_entity     ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created    ON audit_logs(created_at DESC);
```

---

### TABLE 18 — platform_settings
Key-value store for admin-configurable platform settings.

```sql
CREATE TABLE platform_settings (
    key             VARCHAR(100) PRIMARY KEY,
    value           TEXT NOT NULL,
    value_type      VARCHAR(20) NOT NULL DEFAULT 'string'
                    CHECK (value_type IN ('string','integer','decimal','boolean','json')),
    description     TEXT,
    updated_by      UUID REFERENCES admin_users(id),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Seed default values
INSERT INTO platform_settings (key, value, value_type, description) VALUES
('platform_fee_pct',          '1.0',    'decimal', 'Platform fee percentage on all trades'),
('escrow_sla_days',           '7',      'integer', 'Days before escrow times out'),
('dispute_sla_days',          '14',     'integer', 'Business days to resolve dispute'),
('max_trade_unverified_xaf',  '500000', 'integer', 'Max single trade for unverified users'),
('monthly_limit_unverified',  '2000000','integer', 'Monthly volume limit for unverified users'),
('min_investment_xaf',        '50000',  'integer', 'Minimum investment amount'),
('allow_new_registrations',   'true',   'boolean', 'Toggle new user sign-ups'),
('trading_enabled',           'true',   'boolean', 'Enable/disable all trading'),
('maintenance_mode',          'false',  'boolean', 'Show maintenance page to all users');
```

---

## 5. DJANGO MODELS (Python)

Here is how you write these tables as Django models. Django creates the SQL for you.

```python
# users/models.py
import uuid
from django.db import models
from django.contrib.auth.models import User

class InvestorProfile(models.Model):
    KYC_STATUS = [
        ('pending','Pending'),('in_review','In Review'),
        ('approved','Approved'),('rejected','Rejected'),('incomplete','Incomplete'),
    ]
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    auth_user   = models.OneToOneField(User, on_delete=models.PROTECT, related_name='investor')
    first_name  = models.CharField(max_length=100)
    last_name   = models.CharField(max_length=100)
    phone       = models.CharField(max_length=20, blank=True)
    kyc_status  = models.CharField(max_length=20, choices=KYC_STATUS, default='pending')
    wallet_balance = models.BigIntegerField(default=0)
    escrow_balance = models.BigIntegerField(default=0)
    is_suspended   = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


# trades/models.py
class Trade(models.Model):
    TRADE_STATUS = [
        ('submitted','Submitted'),
        ('escrow_locked','Escrow Locked'),
        ('awaiting_approval','Awaiting Approval'),
        ('company_approved','Company Approved'),
        ('completed','Completed'),
        ('rejected_by_company','Rejected'),
        ('cancelled','Cancelled'),
        ('disputed','Disputed'),
    ]
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trade_ref     = models.CharField(max_length=20, unique=True)
    investor      = models.ForeignKey('users.InvestorProfile', on_delete=models.PROTECT)
    company       = models.ForeignKey('companies.Company', on_delete=models.PROTECT)
    trade_type    = models.CharField(max_length=4, choices=[('BUY','Buy'),('SELL','Sell')])
    shares        = models.IntegerField()
    price_per_share = models.BigIntegerField()
    total_amount  = models.BigIntegerField()
    platform_fee  = models.BigIntegerField(default=0)
    status        = models.CharField(max_length=30, choices=TRADE_STATUS, default='submitted')
    submitted_at  = models.DateTimeField(auto_now_add=True)
    completed_at  = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'trades'
        ordering = ['-submitted_at']

    def save(self, *args, **kwargs):
        # Auto-calculate total
        self.total_amount = self.shares * self.price_per_share
        self.platform_fee = int(self.total_amount * 0.01)
        super().save(*args, **kwargs)
```

---

## 6. KEY API ENDPOINTS (DRF)

```
POST   /api/auth/register/            Register investor or company
POST   /api/auth/login/               Get JWT token pair
POST   /api/auth/token/refresh/       Refresh JWT
POST   /api/auth/logout/

GET    /api/investor/profile/         Get my profile
PATCH  /api/investor/profile/         Update my profile
GET    /api/investor/wallet/          Wallet balance + recent txns
POST   /api/investor/wallet/deposit/  Request deposit
POST   /api/investor/wallet/withdraw/ Request withdrawal

GET    /api/trades/                   My trades (investor) or pending trades (company)
POST   /api/trades/                   Submit new trade
GET    /api/trades/{id}/              Trade detail
PATCH  /api/trades/{id}/approve/      Company approves trade
PATCH  /api/trades/{id}/reject/       Company rejects trade
POST   /api/trades/{id}/dispute/      Open dispute

GET    /api/marketplace/              All active listings
GET    /api/marketplace/{company}/    Single company listing
POST   /api/marketplace/{id}/interest/ Express interest

GET    /api/kyc/status/               My KYC status + documents
POST   /api/kyc/upload/               Upload KYC document

GET    /api/certificates/             My share certificates
GET    /api/certificates/{id}/pdf/    Download certificate PDF

GET    /api/company/cap-table/        Company shareholder registry
GET    /api/company/analytics/        Performance metrics
GET    /api/company/documents/        Company document vault
POST   /api/company/documents/upload/ Upload company document
POST   /api/company/listings/         Create share listing

GET    /api/admin/dashboard/          Platform overview stats
GET    /api/admin/kyc/queue/          KYC review queue
PATCH  /api/admin/kyc/{id}/approve/   Approve KYC
PATCH  /api/admin/kyc/{id}/reject/    Reject KYC with reason
GET    /api/admin/trades/             All platform trades
GET    /api/admin/escrow/             Active escrow holds
GET    /api/admin/disputes/           Open disputes
PATCH  /api/admin/disputes/{id}/rule/ Issue ruling
GET    /api/admin/audit-logs/         Audit trail
GET    /api/admin/analytics/          Platform metrics
PATCH  /api/admin/settings/           Update platform settings
```

---

## 7. CONNECTING YOUR EXISTING FRONTEND

Your existing HTML pages stay exactly as they are. You just replace hardcoded data with
`fetch()` calls. Example:

```javascript
// In investor/wallet.html — replace hardcoded balance with real API call
async function loadWallet() {
  const token = localStorage.getItem('access_token');
  const response = await fetch('http://localhost:8000/api/investor/wallet/', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();

  document.querySelector('.wallet-balance').textContent =
    `XAF ${data.balance.toLocaleString()}`;
  document.querySelector('.escrow-balance').textContent =
    `XAF ${data.escrow.toLocaleString()}`;
}

// Login — get token and store it
async function login(email, password) {
  const res = await fetch('/api/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const { access, refresh, role } = await res.json();
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);

  // Redirect based on role (exactly like your login.html already does)
  if (role === 'admin')        window.location = '/admin/dashboard.html';
  else if (role === 'company') window.location = '/company/dashboard.html';
  else                         window.location = '/investor/dashboard.html';
}
```

---

## 8. NEXT STEPS (in order)

1. **Install** Python + PostgreSQL on your machine
2. **Run** `django-admin startproject config .`  — creates project skeleton
3. **Create** the database and configure `settings.py`
4. **Write** models (copy the Python models above, expand them)
5. **Run** `python manage.py makemigrations && python manage.py migrate`  — creates all tables
6. **Create** a superuser: `python manage.py createsuperuser`
7. **Open** `http://localhost:8000/admin/` — your admin back-office is already there
8. **Write** DRF serializers + views for each API endpoint
9. **Wire** your HTML pages to the API using `fetch()`
10. **Add** Celery + Redis for escrow SLA checks, email, PDF generation
11. **Deploy** to Railway or Render (both have free tiers, both support PostgreSQL)
