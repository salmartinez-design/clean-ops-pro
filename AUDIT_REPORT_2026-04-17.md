# Qleno Migration Audit — 2026-04-17

## 1. Clients

- **Total**: 1272

- **Breakdown by status and type**:

| is_active | client_type | count |
| --- | --- | --- |
| true | residential | 226 |
| true | commercial | 30 |
| false | residential | 1001 |
| false | commercial | 15 |

- **Notes populated**: home_access_notes=0, notes=6, any=6

- **Commercial sample row**:

- **id**: 27
- **company_id**: 1
- **first_name**: Anthony
- **last_name**: Gill
- **email**: cogicp6696@gmail.com
- **phone**: 708-971-6695
- **address**: 1622 W. 61st Street
- **city**: Chicago
- **state**: IL
- **zip**: 60636
- **lat**: null
- **lng**: null
- **notes**: null
- **qbo_customer_id**: null
- **stripe_customer_id**: null
- **square_customer_id**: null
- **loyalty_points**: 0
- **created_at**: 2026-03-23 21:38:52.703372
- **portal_access**: false
- **portal_invite_token**: null
- **portal_invite_sent_at**: null
- **portal_last_login**: null
- **company_name**: null
- **is_active**: false
- **frequency**: weekly
- **service_type**: Commercial Cleaning
- **base_fee**: 145.00
- **allowed_hours**: null
- **home_access_notes**: null
- **alarm_code**: null
- **pets**: null
- **loyalty_tier**: standard
- **client_since**: 2022-12-07
- **scorecard_avg**: null
- **rate_increase_last_date**: null
- **rate_increase_last_pct**: null
- **property_group_id**: null
- **default_card_last_4**: null
- **default_card_brand**: null
- **client_type**: commercial
- **billing_contact_name**: null
- **billing_contact_email**: null
- **billing_contact_phone**: null
- **po_number_required**: false
- **default_po_number**: null
- **payment_terms**: due_on_receipt
- **auto_charge**: false
- **card_last_four**: null
- **card_brand**: null
- **card_expiry**: null
- **card_saved_at**: null
- **zone_id**: null
- **referral_source**: null
- **referral_by_customer_id**: null
- **account_id**: null
- **branch_id**: 1
- **stripe_payment_method_id**: null
- **payment_source**: null
- **survey_last_sent**: null

- **Residential sample row**:

- **id**: 1296
- **company_id**: 1
- **first_name**: Sal 
- **last_name**: Martinez 
- **email**: salmartinez8@gmail.com
- **phone**: 7738188400
- **address**: null
- **city**: null
- **state**: null
- **zip**: null
- **lat**: null
- **lng**: null
- **notes**: null
- **qbo_customer_id**: null
- **stripe_customer_id**: cus_UIKNPa5qZtwUOa
- **square_customer_id**: null
- **loyalty_points**: 0
- **created_at**: 2026-04-08 00:12:29.360052
- **portal_access**: false
- **portal_invite_token**: null
- **portal_invite_sent_at**: null
- **portal_last_login**: null
- **company_name**: null
- **is_active**: true
- **frequency**: null
- **service_type**: null
- **base_fee**: null
- **allowed_hours**: null
- **home_access_notes**: null
- **alarm_code**: null
- **pets**: null
- **loyalty_tier**: standard
- **client_since**: null
- **scorecard_avg**: null
- **rate_increase_last_date**: null
- **rate_increase_last_pct**: null
- **property_group_id**: null
- **default_card_last_4**: null
- **default_card_brand**: null
- **client_type**: residential
- **billing_contact_name**: null
- **billing_contact_email**: null
- **billing_contact_phone**: null
- **po_number_required**: false
- **default_po_number**: null
- **payment_terms**: due_on_receipt
- **auto_charge**: false
- **card_last_four**: 6613
- **card_brand**: visa
- **card_expiry**: 10/2028
- **card_saved_at**: 2026-04-08 00:12:29.360052
- **zone_id**: null
- **referral_source**: client_referral
- **referral_by_customer_id**: null
- **account_id**: null
- **branch_id**: 1
- **stripe_payment_method_id**: pm_1TJjjLA7LSB0LZwlwukjN8Wq
- **payment_source**: stripe
- **survey_last_sent**: null

- **Dummy candidates found**: 3

| id | first_name | last_name | company_name | email | created_at |
| --- | --- | --- | --- | --- | --- |
| 1248 | test | test |  |  | 2026-03-23 21:38:56.146229 |
| 1134 | sal | test |  |  | 2026-03-23 21:38:55.90299 |
| 901 | Kevin | Brooks |  | kbrooks13@cox.net | 2026-03-23 21:38:55.36987 |

## 2. Recurring Schedules

- **Total**: 87

- **By frequency**:

| frequency | count |
| --- | --- |
| biweekly | 29 |
| monthly | 27 |
| custom | 18 |
| weekly | 13 |

- **Assigned**: 1 | **Unassigned**: 86

- **Multi-tech schedules**: 0

- **Sample row**:

- **id**: 7
- **company_id**: 1
- **customer_id**: 106
- **frequency**: monthly
- **day_of_week**: null
- **start_date**: 2026-03-23
- **end_date**: null
- **assigned_employee_id**: null
- **service_type**: Standard Clean
- **duration_minutes**: null
- **base_fee**: null
- **notes**: Service Set: Recurring Cleaning | Default Start: 9:00 AM
- **is_active**: true
- **last_generated_date**: 2026-03-28
- **created_at**: 2026-03-23 21:38:56.164925

- **Missing scope/time/address**:

_(no rows)_

## 3. Pricing Engine

- **Tables present**:

| table_name | column_count |
| --- | --- |
| pricing_addons | 21 |
| pricing_discounts | 12 |
| pricing_fee_rules | 8 |
| pricing_scopes | 13 |
| pricing_tiers | 7 |

- **Row counts**:

| table_name | rows | note |
| --- | --- | --- |
| pricing_scopes | 14 | company_id=1 |
| pricing_tiers | 140 | company_id=1 |
| pricing_addons | 17 | company_id=1 |
| pricing_fee_rules | 2 | company_id=1 |
| pricing_discounts | 41 | company_id=1 |
| pay_templates | ERR | unscoped (no company_id) |

- **pricing_scopes**:

| id | company_id | name | scope_group | hourly_rate | minimum_bill | is_active | sort_order | created_at | updated_at | pricing_method | displayed_for_office | show_online |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | Deep Clean | Residential | 70.00 | 210.00 | true | 0 | 2026-03-22 01:13:39.190371 | 2026-03-28 00:33:07.290745 | sqft | true | true |
| 2 | 1 | Standard Clean | Residential | 65.00 | 195.00 | true | 0 | 2026-03-22 01:18:35.466618 | 2026-03-22 01:18:35.466618 | sqft | true | true |
| 3 | 1 | One-Time Standard Clean | Residential | 65.00 | 195.00 | true | 1 | 2026-03-24 17:48:12.830752 | 2026-03-24 17:48:12.830752 | sqft | true | true |
| 4 | 1 | Recurring Cleaning - Weekly | Recurring Cleaning | 60.00 | 180.00 | true | 2 | 2026-03-24 17:48:12.833758 | 2026-03-24 17:48:12.833758 | sqft | true | true |
| 5 | 1 | Hourly Deep Clean | Hourly | 70.00 | 210.00 | true | 3 | 2026-03-24 17:48:12.836632 | 2026-03-24 17:48:12.836632 | hourly | true | false |
| 6 | 1 | Hourly Standard Cleaning | Hourly | 60.00 | 150.00 | true | 4 | 2026-03-24 17:48:12.839532 | 2026-03-24 17:48:12.839532 | hourly | true | false |
| 7 | 1 | Commercial Cleaning | Commercial | 65.00 | 200.00 | true | 5 | 2026-03-24 17:48:12.842616 | 2026-03-24 17:48:12.842616 | hourly | true | true |
| 8 | 1 | PPM Turnover | Commercial | 65.00 | 250.00 | true | 6 | 2026-03-24 17:48:12.845371 | 2026-03-24 17:48:12.845371 | sqft | true | true |
| 9 | 1 | Recurring Cleaning - Every 2 Weeks | Recurring Cleaning | 65.00 | 195.00 | true | 41 | 2026-03-27 15:38:40.097136 | 2026-03-27 15:38:40.097136 | sqft | true | true |
| 10 | 1 | Recurring Cleaning - Every 4 Weeks | Recurring Cleaning | 70.00 | 210.00 | true | 42 | 2026-03-27 15:38:44.082258 | 2026-03-27 15:38:44.082258 | sqft | true | true |
| 11 | 1 | Recurring Cleaning | Residential | 55.00 | 120.00 | false | 43 | 2026-03-27 15:48:00.813798 | 2026-03-27 15:48:00.813798 | sqft | true | true |
| 12 | 1 | Move In / Move Out | Residential | 70.00 | 210.00 | true | 0 | 2026-03-28 00:33:07.290745 | 2026-03-28 00:33:07.290745 | sqft | true | true |
| 13 | 1 | PPM Common Areas | Commercial | 45.00 | 135.00 | true | 20 | 2026-04-10 21:04:57.955599 | 2026-04-10 21:04:57.955599 | hourly | true | true |
| 14 | 1 | Multi-Unit Common Areas | Commercial | 50.00 | 150.00 | true | 21 | 2026-04-10 21:04:57.955599 | 2026-04-10 21:04:57.955599 | hourly | true | true |

- **pricing_addons** (17 rows):

| id | scope_id | company_id | name | price | price_type | percent_of_base | time_add_minutes | unit | is_active | sort_order | addon_type | scope_ids | price_value | time_unit | is_itemized | is_taxed | show_office | show_online | show_portal | created_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8 | 1 | 1 | Oven Cleaning |  | flat |  | 45 | each | true | 10 | cleaning_extras | [1, 3, 4, 9, 10, 2, 12, 11] | 50.00 | each | true | false | true | true | true | 2026-03-24 17:48:12.852049 |
| 9 | 5 | 1 | Oven Cleaning (Hourly — Time Add) |  | time_only |  | 45 | each | true | 12 | cleaning_extras | [5,6] | 0.00 | each | false | false | true | false | true | 2026-03-24 17:48:12.854979 |
| 10 | 1 | 1 | Refrigerator Cleaning |  | flat |  | 45 | each | true | 22 | cleaning_extras | [1, 3, 4, 9, 10, 2, 12, 11] | 50.00 | each | true | false | true | true | true | 2026-03-24 17:48:12.857944 |
| 11 | 5 | 1 | Refrigerator Cleaning (Hourly — Time Add) |  | time_only |  | 45 | each | true | 24 | cleaning_extras | [5,6] | 0.00 | each | false | false | true | false | true | 2026-03-24 17:48:12.860732 |
| 12 | 1 | 1 | Kitchen Cabinets |  | flat |  | 45 | each | true | 34 | cleaning_extras | [1, 3, 4, 9, 10, 2, 12, 11] | 50.00 | each | true | false | true | true | true | 2026-03-24 17:48:12.863075 |
| 13 | 5 | 1 | Kitchen Cabinets — Hourly (Time Add) |  | time_only |  | 45 | each | true | 36 | cleaning_extras | [5,6] | 0.00 | each | false | false | true | false | true | 2026-03-24 17:48:12.865365 |
| 14 | 3 | 1 | Baseboards |  | flat |  | 45 | each | true | 46 | cleaning_extras | [3, 2] | 30.00 | each | true | false | true | false | true | 2026-03-24 17:48:12.867681 |
| 16 | 1 | 1 | Windows (inside window panes only) |  | percentage |  | 45 | each | true | 58 | cleaning_extras | [1, 3, 4, 9, 10, 2, 12, 11] | 15.00 | sqft | true | false | true | true | true | 2026-03-24 17:48:12.880713 |
| 18 | 5 | 1 | Windows (inside panes) — Hourly (Time Add) |  | time_only |  | 45 | each | true | 62 | cleaning_extras | [5,6] | 0.00 | each | false | false | true | false | true | 2026-03-24 17:48:12.885438 |
| 19 | 1 | 1 | Clean Basement — Deep / Standard |  | percentage |  | 45 | each | true | 71 | cleaning_extras | [1, 3, 4, 9, 10, 2, 12, 11] | 15.00 | sqft | true | false | true | true | true | 2026-03-24 17:48:12.887845 |
| 21 | 5 | 1 | Clean Basement — Hourly (Time Add) |  | time_only |  | 0 | each | true | 75 | cleaning_extras | [5,6] | 0.00 | each | false | false | true | false | true | 2026-03-24 17:48:12.892085 |
| 22 | 1 | 1 | Parking Fee |  | flat |  | 0 | each | true | 84 | cleaning_extras | [1, 3, 4, 5, 6, 7, 8, 2, 12, 11] | 20.00 | each | true | false | true | false | true | 2026-03-24 17:48:12.893881 |
| 23 | 1 | 1 | Manual Adjustment |  | manual_adj |  | 0 | each | true | 114 | cleaning_extras | [1, 3, 4, 2, 12, 11] | 0.00 | each | true | false | true | false | false | 2026-03-24 17:48:12.896054 |
| 30 | 6 | 1 | Second Appointment — +15% (markup) |  | percentage |  | 0 | each | true | 153 | other | [6] | 15.00 | each | true | false | true | false | true | 2026-03-24 17:48:12.910649 |
| 31 | 7 | 1 | Commercial Adjustment |  | percentage |  | 0 | each | true | 163 | other | [7] | -100.00 | each | true | false | true | false | true | 2026-03-24 17:48:12.913009 |
| 32 | 1 | 1 | __TEST_WIDGET_ADDON__ |  | flat |  | 0 | each | false | 0 | cleaning_extras | [1, 11, 12] | 25.00 | each | true | false | true | true | true | 2026-03-31 22:40:57.261967 |
| 33 | 1 | 1 | __V13_TEST__ |  | flat |  | 0 | each | false | 0 | cleaning_extras | [1, 11, 12] | 25.00 | each | true | false | true | true | true | 2026-03-31 22:45:39.46513 |

- **pricing_discounts** (41 rows):

| id | company_id | code | description | discount_type | discount_value | is_active | created_at | is_online | scope_ids | frequency | availability_office |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | MANAGER50 | Manager Discretion | percent | 50.00 | true | 2026-03-22 01:13:39.190371 | false | [] | one_time | true |
| 2 | 1 | MANAGER25 | Manager Discretion | percent | 25.00 | true | 2026-03-22 01:13:39.190371 | false | [] | one_time | true |
| 3 | 1 | COMPASS | Compass Realty | percent | 15.00 | true | 2026-03-22 01:13:39.190371 | false | [] | one_time | true |
| 4 | 1 | LAWENFORCEMENT | Law Enforcement Discount | percent | 12.00 | true | 2026-03-22 01:13:39.190371 | false | [] | one_time | true |
| 5 | 1 | SENIOR | Senior Discount | percent | 12.00 | true | 2026-03-22 01:13:39.190371 | false | [] | one_time | true |
| 6 | 1 | REALTOR | Realtor Discount | percent | 12.00 | true | 2026-03-22 01:13:39.190371 | false | [] | one_time | true |
| 7 | 1 | CHAMBER |  | percent | 15.00 | true | 2026-03-27 15:42:42.164224 | true | [] | one_time | true |
| 8 | 1 | COMPASS2026 |  | percent | 18.00 | true | 2026-03-27 15:42:46.047545 | true | [] | one_time | true |
| 9 | 1 | EDUCATIONDISCOUNT |  | percent | 12.00 | true | 2026-03-27 15:42:50.17453 | true | [] | one_time | true |
| 10 | 1 | FBDEEP15 |  | percent | 15.00 | true | 2026-03-27 15:42:54.042086 | true | [] | one_time | true |
| 11 | 1 | ROA |  | percent | 15.00 | true | 2026-03-27 15:42:57.833811 | true | [] | one_time | true |
| 12 | 1 | SENIORCITIZEN |  | percent | 12.00 | true | 2026-03-27 15:43:01.773159 | true | [] | one_time | true |
| 13 | 1 | SMARTCITY10 |  | percent | 10.00 | true | 2026-03-27 15:43:05.644631 | true | [] | one_time | true |
| 14 | 1 | 6MONTHPROMO |  | percent | 20.00 | true | 2026-03-27 15:43:09.531476 | false | [] | one_time | true |
| 15 | 1 | FB15 |  | percent | 15.00 | true | 2026-03-27 15:43:13.344817 | true | [] | one_time | true |
| 16 | 1 | PHES100OFF |  | percent | 10.00 | true | 2026-03-27 15:43:17.251328 | true | [] | one_time | true |
| 17 | 1 | EXISTINGCLIENT | Existing client discount | percent | 12.00 | true | 2026-04-10 21:04:57.955599 | true | [] | one_time | true |
| 18 | 1 | PHES10OFF | PHES 10% off | percent | 10.00 | true | 2026-04-10 21:04:57.955599 | true | [] | one_time | true |
| 19 | 1 | 10% One time discount | 10% One time discount | percent | 10.00 | true | 2026-04-17 00:19:05.719744 | true | [3] | one_time | true |
| 20 | 1 | Chamber | Chamber | percent | 15.00 | true | 2026-04-17 00:19:05.810686 | true | [3] | one_time | true |
| 21 | 1 | fb15 | fb15 | percent | 15.00 | true | 2026-04-17 00:19:05.904484 | true | [3] | one_time | true |
| 22 | 1 | 6-Month Promo | 6-Month Promo | percent | 20.00 | true | 2026-04-17 00:19:05.995272 | true | [1,12] | one_time | true |
| 23 | 1 | Chamber | Chamber | percent | 15.00 | true | 2026-04-17 00:19:06.086543 | true | [1,12] | one_time | true |
| 24 | 1 | Compass | Compass | percent | 15.00 | true | 2026-04-17 00:19:06.179707 | true | [1,12] | one_time | true |
| 25 | 1 | Compass2026 | Compass2026 | percent | 18.00 | true | 2026-04-17 00:19:06.270688 | true | [1,12] | one_time | true |
| 26 | 1 | Education Discount | Education Discount | percent | 12.00 | true | 2026-04-17 00:19:06.366641 | true | [1,12] | one_time | true |
| 27 | 1 | Existing client discount | Existing client discount | percent | 12.00 | true | 2026-04-17 00:19:06.455673 | true | [1,12] | one_time | true |
| 28 | 1 | fbdeep15 | fbdeep15 | percent | 15.00 | true | 2026-04-17 00:19:06.544204 | true | [1,12] | one_time | true |
| 29 | 1 | Law Enforcement & First Responders | Law Enforcement & First Responders | percent | 12.00 | true | 2026-04-17 00:19:06.634741 | true | [1,12] | one_time | true |
| 30 | 1 | Manager Discretion Discount 25 | Manager Discretion Discount 25 | flat | 25.00 | true | 2026-04-17 00:19:06.726503 | true | [1,12] | one_time | true |
| 31 | 1 | Manager Discretion Discount 50 | Manager Discretion Discount 50 | flat | 50.00 | true | 2026-04-17 00:19:06.818931 | true | [1,12] | one_time | true |
| 32 | 1 | Realtor Discount | Realtor Discount | percent | 12.00 | true | 2026-04-17 00:19:06.908423 | true | [1,12] | one_time | true |
| 33 | 1 | ROA | ROA | percent | 15.00 | true | 2026-04-17 00:19:06.99858 | true | [1,12] | one_time | true |
| 34 | 1 | Senior Citizen Discount | Senior Citizen Discount | percent | 12.00 | true | 2026-04-17 00:19:07.087856 | true | [1,12] | one_time | true |
| 35 | 1 | smartcity10 | smartcity10 | percent | 10.00 | true | 2026-04-17 00:19:07.176796 | false | [1,12] | one_time | true |
| 36 | 1 | Adjustment | Adjustment | percent | 100.00 | true | 2026-04-17 00:19:07.266661 | true | [7] | one_time | true |
| 37 | 1 | Chamber | Chamber | percent | 15.00 | true | 2026-04-17 00:19:07.3557 | true | [6] | one_time | true |
| 38 | 1 | Chamber | Chamber | percent | 15.00 | true | 2026-04-17 00:19:07.444852 | true | [5] | one_time | true |
| 39 | 1 | Compass Discount | Compass Discount | percent | 15.00 | true | 2026-04-17 00:19:07.534976 | true | [5] | one_time | true |
| 40 | 1 | Manager Discretion Discount 25 | Manager Discretion Discount 25 | flat | 25.00 | true | 2026-04-17 00:19:07.623719 | true | [5] | one_time | true |
| 41 | 1 | fb15 | fb15 | percent | 15.00 | true | 2026-04-17 00:19:07.712907 | true | [] | one_time | true |

- **pricing_fee_rules** (2 rows):

| id | company_id | rule_type | label | charge_percent | tech_split_percent | window_hours | is_active |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | skip_fee | Skip Fee | 100.00 | 40.00 | 24 | true |
| 2 | 1 | lockout_fee | Lockout Fee | 100.00 | 40.00 | 24 | true |

## 4. Job History

- **Total**: 34 | **Revenue**: 18059.30
- **Date range**: 2024-05-15 to 2026-04-02

- **By year**:

| year | jobs | revenue |
| --- | --- | --- |
| 2024 | 7 | 2294.20 |
| 2025 | 22 | 12867.00 |
| 2026 | 5 | 2898.10 |

- **By month Jan 2025+**:

| month | jobs | revenue |
| --- | --- | --- |
| 2025-01 | 2 | 1285.60 |
| 2025-02 | 2 | 885.60 |
| 2025-03 | 2 | 1221.60 |
| 2025-04 | 1 | 825.00 |
| 2025-05 | 2 | 1385.60 |
| 2025-06 | 2 | 1185.60 |
| 2025-07 | 1 | 900.00 |
| 2025-08 | 2 | 935.60 |
| 2025-09 | 2 | 1160.60 |
| 2025-10 | 2 | 1085.60 |
| 2025-11 | 2 | 885.60 |
| 2025-12 | 2 | 1110.60 |
| 2026-01 | 1 | 962.50 |
| 2026-02 | 1 | 687.50 |
| 2026-03 | 2 | 1028.10 |
| 2026-04 | 1 | 220.00 |

- **Sample row (most recent)**:

- **id**: 34
- **company_id**: 1
- **customer_id**: 23
- **job_date**: 2026-04-02
- **revenue**: 220.00
- **service_type**: Standard Clean
- **technician**: Norma Puga
- **notes**: mc_import
- **created_at**: 2026-04-16 12:54:42.780119

## 5. Employees

_(Using `users` table — `employees` table doesn't exist)_

- **Roles**:

| role | count |
| --- | --- |
| technician | 10 |
| office | 2 |
| owner | 1 |

- **Full list** (13 rows):

| id | first_name | last_name | role | is_active |
| --- | --- | --- | --- | --- |
| 35 | Maribel | Castillo | office | true |
| 41 | Alejandra | Cuervo | technician | true |
| 37 | Francisco | Estevez | office | true |
| 36 | Rosa | Gallegos | technician | true |
| 42 | Juliana | Loredo | technician | true |
| 1 | Sal | Martinez | owner | true |
| 40 | Guadalupe | Mejia | technician | true |
| 33 | Tatiana | Merchan | technician | true |
| 32 | Norma | Puga | technician | true |
| 43 | Juan | Salazar | technician | true |
| 39 | Alma | Salinas | technician | true |
| 34 | Ana | Valdez | technician | true |
| 38 | Diana | Vasquez | technician | true |

## 6. Dashboard KPI Check

- **New jobs last 30d**: 865
- **Active clients**: 256

## Errors encountered

- **2.4**: Failed query: SELECT schedule_id, COUNT(*) AS tech_count FROM recurring_schedule_technicians GROUP BY schedule_id HAVING COUNT(*) > 1 ORDER BY tech_count DESC LIMIT 20
params: 
- **2.6**: Failed query: SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE scope IS NULL OR TRIM(scope) = '') AS missing_scope, COUNT(*) FILTER (WHERE scheduled_time IS NULL) AS missing_time, COUNT(*) FILTER (WHERE service_address IS NULL OR TRIM(service_address) = '') AS missing_address FROM recurring_schedules WHERE company_id = 1
params: 
- **3.2.pay_templates**: Failed query: SELECT COUNT(*) AS rows FROM pay_templates WHERE company_id = 1
params: 
- **3.2.pay_templates_unscoped**: Failed query: SELECT COUNT(*) AS rows FROM pay_templates
params: 
- **5.1**: Failed query: SELECT role, COUNT(*) AS count FROM employees WHERE company_id = 1 GROUP BY role ORDER BY count DESC
params: 

## Summary delta vs expectations from handoff

| expected | actual | match |
| --- | --- | --- |
| 1,231 clients | 1272 | ✗ |
| 210 active clients | 256 | ✗ |
| 86 recurring schedules | 87 | ✗ |
| 9 unassigned schedules | 86 | ✗ |
| 3,953 job_history rows | 34 | ✗ |
| $875k job_history revenue | 18059.30 | see actual |
| 12 employees | 13 | ✗ |
| 15 dummy clients | 3 | ✗ |
| Sep 10 – Dec 31 2025 gap | Partial: found 2025-09, 2025-10, 2025-11, 2025-12 | ✗ |
| Dashboard new jobs = 66 inflated | 865 | see actual |
