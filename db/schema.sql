CREATE TABLE IF NOT EXISTS `account` (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `firstname` VARCHAR(50) NOT NULL,
  `lastname` VARCHAR(50) NOT NULL,
  `email` VARCHAR(30) NOT NULL,
  `password` VARCHAR(255) DEFAULT NULL,
  `verified` BOOLEAN DEFAULT FALSE,
  `avatar` VARCHAR(255) NOT NULL,
  `method` ENUM('google', 'apple', 'password') DEFAULT 'password',
  `role` ENUM('admin', 'customer', 'agent') DEFAULT 'customer',
  INDEX `idx_email` (`email`)
);

CREATE TABLE IF NOT EXISTS `agents` (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `account_id` INT NOT NULL,
  `professional_type` ENUM('real_estate_agent', 'property_manager', 'developer') DEFAULT 'real_estate_agent',
  `experience_level` ENuM('beginner', 'intermediate', 'expert') DEFAULT 'beginner',
  `phone_number` VARCHAR(20) NOT NULL,
  FOREIGN KEY (`account_id`) REFERENCES `account`(`id`),
  INDEX `idx_account_id` (`account_id`)
);

CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `account_id` INT NOT NULL,
  `phone_number` VARCHAR(20) NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  FOREIGN KEY (`account_id`) REFERENCES `account`(`id`),
  INDEX `idx_account_id` (`account_id`)
);

CREATE TABLE IF NOT EXISTS `codes`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `code` VARCHAR(6) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  `account_id` INT NOT NULL,
  `purpose` ENUM('verification', 'reset_password') DEFAULT 'verification',
  FOREIGN KEY (`account_id`) REFERENCES `account`(`id`),
  INDEX `idx_code` (`code`)
);

CREATE TABLE IF NOT EXISTS `apartment`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `total_price` DECIMAL(15, 2) NOT NULL,
  `price_per_year` DECIMAL(15, 2) NOT NULL,
  `agent_fee` DECIMAL(15, 2) NOT NULL,
  `service_charge` DECIMAL(15, 2) NOT NULL,
  `main_photo` VARCHAR(200) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `bedrooms` INT(5) DEFAULT NULL,
  `toilets` INT(5) DEFAULT NULL,
  `bathrooms` INT(5) DEFAULT NULL,
  `parking_space` INT(5) DEFAULT NULL,
  `location` VARCHAR(200) DEFAULT NULL,
  `owner_id` INT NOT NULL,
  `details` LONGTEXT DEFAULT NULL,
  `draft` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`owner_id`) REFERENCES `account`(`id`),
  INDEX `idx_id` (`id`),
  INDEX `idx_owner_id` (`owner_id`),
  INDEX `idx_price_per_year` (`price_per_year`)
);

CREATE TABLE IF NOT EXISTS `resources`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `url` VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS `apartment_resources`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `apartment_id` INT NOT NULL,
  `resource_id` INT NOT NULL,
  FOREIGN KEY (`apartment_id`) REFERENCES `apartment`(`id`),
  FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`)
);

CREATE TABLE IF NOT EXISTS `coordinates`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `longitude` DOUBLE NOT NULL,
  `latitude` DOUBLE NOT NULL
);

CREATE TABLE IF NOT EXISTS `amenities`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `avatar` VARCHAR(200) NOT NULL
);

CREATE TABLE  IF NOT EXISTS `apartment_amenities`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `apartment_id` INT NOT NULL,
  `amenity_id` INT NOT NULL,
  FOREIGN KEY (`apartment_id`) REFERENCES `apartment`(`id`),
  FOREIGN KEY (`amenity_id`) REFERENCES `amenities`(`id`)
);

CREATE TABLE IF NOT EXISTS `views`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `account_id` INT NOT NULL,
  `apartment_id` INT NOT NULL,
  FOREIGN KEY (`account_id`) REFERENCES `account`(`id`),
  FOREIGN KEY (`apartment_id`) REFERENCES `apartment`(`id`)
);

CREATE TABLE IF NOT EXISTS `save`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `account_id` INT NOT NULL,
  `apartment_id` INT NOT NULL,
  FOREIGN KEY (`account_id`) REFERENCES `account`(`id`),
  FOREIGN KEY (`apartment_id`) REFERENCES `apartment`(`id`)
);

CREATE TABLE IF NOT EXISTS `benefit`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS `apartment_benefit`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `apartment_id` INT NOT NULL,
  `benefit_id` INT NOT NULL
);

CREATE TABLE IF NOT EXISTS `nearby_landmarks`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `apartment_id` INT NOT NULL,
  `landmark` VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS `transactions`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `apartment_id` INT NOT NULL,
  `account_id` INT NOT NULL,
  `reference` VARCHAR(15) NOT NULL UNIQUE,
  `amount` DECIMAL(15, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL,
  `status` ENUM('pending', 'success', 'failed') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`apartment_id`) REFERENCES `apartment`(`id`),
  FOREIGN KEY (`account_id`) REFERENCES `account`(`id`),
  INDEX `idx_apartment_id` (`apartment_id`),
  INDEX `idx_account_id` (`account_id`),
  INDEX `idx_reference` (`reference`)
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
  `content` LONGTEXT NOT NULL,
  `main_photo` VARCHAR(200) NOT NULL,
  `category_id` INT DEFAULT NULL,
  `author_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`author_id`) REFERENCES `account`(`id`),
  INDEX `idx_author_id` (`author_id`),
  INDEX `idx_created_at` (`created_at`)
);

CREATE TABLE IF NOT EXISTS `blog_categories`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `blog_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`),
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
);
