# RealHome - Hệ thống Quản lý Bất động sản Cho thuê & Vận hành

## 📁 Cấu trúc thư mục dự án (Project Architecture)

```text
DATN_REALHOME/
├── app/                                 # Routes & Server Pages (Next.js App Router)
│   ├── admin/                           # Phân hệ Quản trị Admin
│   │   ├── page.tsx                     # Admin Master Dashboard (Dynamic Hub Switcher)
│   │   └── layout.tsx                   # Multi-role Provider & Navigation Layout
│   ├── landlord/                        # Phân hệ Cổng Chủ nhà
│   └── customer/                        # Phân hệ Cổng Khách thuê & Public Search
│
├── components/admin/hubs/               # KHU VỰC HUBS ĐA PHÂN HỆ (Pluggable Hub Architecture)
│   ├── SupplyOperationsHub.tsx          # Hub Phân hệ 1: Nguồn Hàng & Vận Hành BĐS
│   ├── SalesDealFlowHub.tsx             # Hub Phân hệ 2: Bán Hàng & Phễu CRM Giao Dịch
│   ├── FinancialCommissionHub.tsx       # Hub Phân hệ 3: Tài Chính & Chi Trả Hoa Hồng
│   └── OrganizationSystemHub.tsx        # Hub Phân hệ 4: Quản Trị Đội Ngũ & Audit Logs
│
├── src/features/                        # KHU VỰC MODULE TÍNH NĂNG ĐỘC LẬP (Feature Modules)
│   ├── admin/context/                   # Context Quản lý Trạng thái Phân hệ (useAdminModule)
│   ├── sales/                           # Module Kinh doanh & Dẫn khách (Leads, Appointments)
│   ├── rooms/                           # Module Căn hộ / Phòng (Matrix, Status, Specs)
│   ├── properties/                      # Module Tòa nhà (Buildings, Service Prices)
│   ├── finance/                         # Module Tài chính & Hóa đơn
│   ├── services/                        # Module Chốt Điện/Nước & Dịch vụ
│   ├── settings/                        # Module Tùy chỉnh Feature Toggles (Bật/tắt module)
│   ├── import/                          # Module AI Sync Google Sheet
│   └── staff/                           # Module Nhân sự & KPI
│
└── src/lib/hooks/                       # GLOBAL HOOKS & UTILITIES
    ├── useFeatureToggles.ts             # Hook Tùy chỉnh Bật/Tắt tính năng động
    └── room-status.ts                   # Utility Tính toán trạng thái Phòng [Sắp trống]
```

## Công nghệ cốt lõi
- **Framework**: Next.js (App Router), React, TypeScript
- **Database & Auth**: Supabase (PostgreSQL, RLS, Edge Auth)
- **CDN Storage**: Cloudflare R2 (Ảnh tòa nhà, phòng, ảnh check-in TimeMark phân thư mục)
- **Bản đồ**: Leaflet Map & OpenStreetMap
