-- Drop all child tables first
DROP TABLE IF EXISTS `property_transactions`;
DROP TABLE IF EXISTS `transactions`;
DROP TABLE IF EXISTS `blog_categories`;
DROP TABLE IF EXISTS `property_resources`;
DROP TABLE IF EXISTS `property_amenities`;
DROP TABLE IF EXISTS `property_benefit`;
DROP TABLE IF EXISTS `views`;
DROP TABLE IF EXISTS `save`;
DROP TABLE IF EXISTS `nearby_landmarks`;
DROP TABLE IF EXISTS `bookings`;

-- Drop tables that reference other tables but are also referenced
DROP TABLE IF EXISTS `blogs`;
DROP TABLE IF EXISTS `property`;
DROP TABLE IF EXISTS `agents`;
DROP TABLE IF EXISTS `admins`;
DROP TABLE IF EXISTS `codes`;

-- Drop standalone tables
DROP TABLE IF EXISTS `amenities`;
DROP TABLE IF EXISTS `benefit`;
DROP TABLE IF EXISTS `resources`;
DROP TABLE IF EXISTS `coordinates`;
DROP TABLE IF EXISTS `categories`;

-- Finally drop the main account table
DROP TABLE IF EXISTS `account`;