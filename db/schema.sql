CREATE TABLE IF NOT EXISTS `account` (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `firstname` VARCHAR(50) NOT NULL,
  `lastname` VARCHAR(50) NOT NULL,
  `email` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) DEFAULT NULL,
  `verified` BOOLEAN DEFAULT FALSE,
  `avatar` VARCHAR(255) NOT NULL,
  `suspended` BOOLEAN DEFAULT FALSE,
  `method` ENUM('google', 'apple', 'password') DEFAULT 'password',
  `role` ENUM('admin', 'customer', 'agent', 'super_admin') DEFAULT 'customer',
  INDEX `idx_email` (`email`)
);

CREATE TABLE IF NOT EXISTS `agents` (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `account_id` INT NOT NULL,
  `professional_type` ENUM('real_estate_agent', 'property_manager', 'developer') DEFAULT 'real_estate_agent',
  `experience_level` ENuM('beginner', 'intermediate', 'expert') DEFAULT 'beginner',
  `phone_number` VARCHAR(30) NOT NULL,
  FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE CASCADE,
  INDEX `idx_account_id` (`account_id`)
);

CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `account_id` INT NOT NULL,
  `phone_number` VARCHAR(30) NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE CASCADE,
  INDEX `idx_account_id` (`account_id`)
);

CREATE TABLE IF NOT EXISTS `codes`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `code` VARCHAR(6) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  `account_id` INT NOT NULL,
  `purpose` ENUM('verification', 'reset_password') DEFAULT 'verification',
  FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE CASCADE,
  INDEX `idx_code` (`code`)
);

CREATE TABLE IF NOT EXISTS `resources` (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `url` VARCHAR(255) NOT NULL,
  `type` ENUM('image', 'video', 'document') DEFAULT 'image',
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `coordinates`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `longitude` DOUBLE NOT NULL,
  `latitude` DOUBLE NOT NULL
);

CREATE TABLE IF NOT EXISTS `property`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,  
  `address` VARCHAR(255) NOT NULL,
  `total_price` DECIMAL(15, 2) NOT NULL,
  `price_per_year` DECIMAL(15, 2) DEFAULT 0,
  `agent_fee` DECIMAL(15, 2) NOT NULL,
  `inspection_fee` DECIMAL(15, 2) DEFAULT 0,
  `about` LONGTEXT DEFAULT NULL,
  `main_photo` VARCHAR(200) NOT NULL,
  `bedrooms` INT(5) DEFAULT NULL,
  `toilets` INT(5) DEFAULT NULL,
  `publicized` BOOLEAN DEFAULT FALSE,
  `duration_months` INT DEFAULT 12,
  `paid` BOOLEAN DEFAULT FALSE,
  `bathrooms` INT(5) DEFAULT NULL,
  `parking_space` INT(5) DEFAULT NULL,
  `land_size` DECIMAL(10,2) DEFAULT NULL,
  `coordinates_id` INT NOT NULL,
  `category` ENUM('sale', 'rent', 'shortlet') DEFAULT 'sale',
  `type` ENUM('house', 'apartment', 'land', 'hostel') DEFAULT 'house',
  `owner_id` INT NOT NULL,
  `draft` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`owner_id`) REFERENCES `account`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`coordinates_id`) REFERENCES `coordinates`(`id`) ON DELETE CASCADE,
  INDEX `idx_id` (`id`),
  INDEX `idx_owner_id` (`owner_id`),
  INDEX `idx_price_per_year` (`price_per_year`)
);

-- ALTER TABLE `transactions` 
-- ADD COLUMN `duration_months` INT DEFAULT 12 AFTER `type`;

CREATE TABLE IF NOT EXISTS `property_resources`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `property_id` INT NOT NULL,
  `resource_id` INT NOT NULL,
  FOREIGN KEY (`property_id`) REFERENCES `property`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS `amenities`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `avatar` VARCHAR(200) NULL
);

CREATE TABLE  IF NOT EXISTS `property_amenities`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `property_id` INT NOT NULL,
  `amenity_id` INT NOT NULL,
  FOREIGN KEY (`property_id`) REFERENCES `property`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`amenity_id`) REFERENCES `amenities`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `views`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `account_id` INT DEFAULT NULL,
  `property_id` INT NOT NULL,
  FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`property_id`) REFERENCES `property`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `save`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `account_id` INT NOT NULL,
  `property_id` INT NOT NULL,
  FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`property_id`) REFERENCES `property`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `benefit`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS `property_benefit`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `property_id` INT NOT NULL,
  `benefit_id` INT NOT NULL
);

CREATE TABLE IF NOT EXISTS `nearby_landmarks`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `property_id` INT NOT NULL,
  `landmark` VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `account_id` INT NOT NULL,
  `property_id` INT NOT NULL,
  `status` ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`property_id`) REFERENCES `property`(`id`) ON DELETE CASCADE,
  INDEX `idx_account_id` (`account_id`),
  INDEX `idx_property_id` (`property_id`)
);


CREATE TABLE IF NOT EXISTS `transactions`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `property_id` INT DEFAULT NULL,
  `account_id` INT NOT NULL,
  `reference` VARCHAR(15) NOT NULL UNIQUE,
  `commission` DECIMAL(15, 2) DEFAULT 0,
  `amount` DECIMAL(15, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL,
  `type` ENUM('rent', 'sale', 'shortlet', 'inspection_fee', 'withdrawal', 'refund') DEFAULT 'sale',
  `status` ENUM('pending', 'success', 'failed') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`property_id`) REFERENCES `property`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE CASCADE,
  INDEX `idx_property_id` (`property_id`),
  INDEX `idx_account_id` (`account_id`),
  INDEX `idx_reference` (`reference`)
);

CREATE TABLE IF NOT EXISTS `property_transactions` (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `amount` DECIMAL(15, 2) NOT NULL,
  `duration_months` INT DEFAULT 0,
  `duration_days` INT DEFAULT 0,
  `start_date` DATETIME DEFAULT NULL,
  `end_date` DATETIME DEFAULT NULL,
  `property_id` INT NOT NULL,
  `account_id` INT NOT NULL,
  `transaction_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  `expired` BOOLEAN DEFAULT FALSE,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`property_id`) REFERENCES `property`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE CASCADE,
  INDEX `idx_transaction_id` (`transaction_id`),
  INDEX `idx_account_id` (`account_id`),
  INDEX `idx_property_id` (`property_id`)
);

CREATE TABLE IF NOT EXISTS `categories`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` LONGTEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`)
);

CREATE TABLE IF NOT EXISTS `blogs`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `subtitle` VARCHAR(500) DEFAULT NULL,
  `content` LONGTEXT NOT NULL,
  `main_photo` VARCHAR(200) NOT NULL,
  `category_id` INT DEFAULT NULL,
  `author_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `draft` BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (`author_id`) REFERENCES `account`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE,
  INDEX `idx_author_id` (`author_id`),
  INDEX `idx_created_at` (`created_at`)
);

CREATE TABLE IF NOT EXISTS `blog_categories`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `blog_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
);
