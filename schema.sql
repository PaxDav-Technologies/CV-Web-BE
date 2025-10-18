CREATE TABLE IF NOT EXISTS `user` (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `email` VARCHAR(30) NOT NULL,
  `password` VARCHAR(255) DEFAULT NULL,
  `verified` BOOLEAN DEFAULT FALSE,
  `avatar` VARCHAR(255) NOT NULL,
  `method` ENUM('google', 'apple', 'password') DEFAULT 'password',
  `role` ENUM('admin', 'customer', 'agent') DEFAULT 'customer',
  INDEX `idx_email` (`email`)
);

CREATE TABLE IF NOT EXISTS `codes`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `code` VARCHAR(6) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  `user_id` INT NOT NULL,
  `purpose` ENUM('verification', 'reset_password') DEFAULT 'verification',
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
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
  FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`),
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
  `resource_id` INT NOT NULL
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
  `amenity_id` INT NOT NULL
);

CREATE TABLE IF NOT EXISTS `views`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `user_id` INT NOT NULL,
  `apartment_id` INT NOT NULL
);

CREATE TABLE IF NOT EXISTS `save`(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `user_id` INT NOT NULL,
  `apartment_id` INT NOT NULL
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
  `user_id` INT NOT NULL,
  `reference` VARCHAR(15) NOT NULL UNIQUE,
  `amount` DECIMAL(15, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL,
  `status` ENUM('pending', 'success', 'failed') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`apartment_id`) REFERENCES `apartment`(`id`),
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
  INDEX `idx_apartment_id` (`apartment_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_reference` (`reference`)
);

CREATE TABLE IF NOT EXISTS `catergories`(
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
  FOREIGN KEY (`author_id`) REFERENCES `user`(`id`),
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`),
  INDEX `idx_author_id` (`author_id`),
  INDEX `idx_created_at` (`created_at`)
);

