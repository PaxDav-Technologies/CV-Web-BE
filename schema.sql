CREATE TABLE `user` IF NOT EXISTS (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `email` VARCHAR(30) NOT NULL,
  `password` VARCHAR(255) DEFAULT NULL,
  `avatar` VARCHAR(200) NOT NULL,
  `method` ENUM(`google`, `apple`, `password`) NOT NULL,
  `role` ENUM(`admin`, `customer`, `agent`)
);

CREATE TABLE `codes` IF NOT EXISTS (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `code` VARCHAR(6) NOT NULL,
  `created_at` DATETIME DEFAULT NOW,
  `expires_at` DATETIME NOT NULL,
  `user_id` INT NOT NULL,
  `purpose` ENUM(`verification`, `reset_password`) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
  INDEX `idx_email` (`email`),
  INDEX `idx_code` (`code`)
)

CREATE TABLE `apartment` IF NOT EXISTS(
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
  `created_at` DATETIME DEFAULT NOW,
  FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`)
  INDEX `idx_id` (`id`),
  INDEX `idx_owner_id` (`owner_id`),
  INDEX `idx_price_per_year` (`price_per_year`),
);

CREATE TABLE `resources` IF NOT EXISTS (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `url` VARCHAR(200) NOT NULL,
);

CREATE TABLE `apartment_resources` IF NOT EXISTS (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `apartment_id` INT NOT NULL,
  `resource_id` INT NOT NULL,
);

CREATE TABLE `coordinates` IF NOT EXISTS(
  `id` INT AUTOINCREMENT NOT NULL PRIMARY KEY,
  `longitude` DOUBLE NOT NULL,
  `latitude` DOUBLE NOT NULL,
);

CREATE TABLE `amenities` IF NOT EXISTS(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `avatar` VARCHAR(200) NOT NULL
);

CREATE TABLE `apartment_amenities`  IF NOT EXISTS(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `apartment_id` INT NOT NULL,
  `amenity_id` INT NOT NULL
);

CREATE TABLE `views` IF NOT EXISTS(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `user_id` INT NOT NULL,
  `apartment_id` INT NOT NULL,
);

CREATE TABLE `save` IF NOT EXISTS(
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `user_id` INT NOT NULL,
  `apartment_id` INT NOT NULL,
);

CREATE TABLE `benefit` IF NOT EXISTS (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL
);

CREATE TABLE `apartment_benefit` IF NOT EXISTS (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `apartment_id` INT NOT NULL,
  `benefit_id` INT NOT NULL
);

CREATE TABLE `nearby_landmarks` IF NOT EXISTS (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `apartment_id` INT NOT NULL,
  `landmark` VARCHAR(255) NOT NULL
);

CREATE TABLE `transactions` IF NOT EXISTS (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `apartment_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `reference` VARCHAR(15) NOT NULL UNIQUE,
  `amount` DECIMAL(15, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL,
  `status` ENUM(`pending`, `success`, `failed`) DEFAULT `pending`,
  `created_at` DATETIME DEFAULT NOW,
  FOREIGN KEY (`apartment_id`) REFERENCES `apartment`(`id`),
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
  INDEX `idx_apartment_id` (`apartment_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_reference` (`reference`),
);

CREATE TABLE `catergories` IF NOT EXISTS (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` LONGTEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT NOW,
  INDEX `idx_name` (`name`)
);

CREATE TABLE `blogs` IF NOT EXISTS (
  `id` INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `main_photo` VARCHAR(200) NOT NULL,
  `category_id` INT DEFAULT NULL,
  `author_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT NOW,
  FOREIGN KEY (`author_id`) REFERENCES `user`(`id`),
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`),
  INDEX `idx_author_id` (`author_id`),
  INDEX `idx_created_at` (`created_at`)
);

