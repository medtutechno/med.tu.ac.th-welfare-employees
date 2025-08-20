/*
SQLyog Community v13.1.9 (64 bit)
MySQL - 5.7.44 : Database - system_benefits
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`system_benefits` /*!40100 DEFAULT CHARACTER SET latin1 */;

USE `system_benefits`;

/*Table structure for table `employee_welfare_balances` */

DROP TABLE IF EXISTS `employee_welfare_balances`;

CREATE TABLE `employee_welfare_balances` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_code` varchar(20) DEFAULT NULL,
  `employee_code` varchar(255) NOT NULL,
  `fname` varchar(255) NOT NULL,
  `lname` varchar(255) NOT NULL,
  `employee_position_number` varchar(255) NOT NULL,
  `department` varchar(255) DEFAULT NULL,
  `welfare_type_id` int(11) NOT NULL,
  `balance_amount` decimal(65,0) NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(255) DEFAULT 'SYSTEM',
  `emp_type` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4;

/*Data for the table `employee_welfare_balances` */

insert  into `employee_welfare_balances`(`id`,`id_code`,`employee_code`,`fname`,`lname`,`employee_position_number`,`department`,`welfare_type_id`,`balance_amount`,`updated_at`,`updated_by`,`emp_type`,`created_at`) values 
(1,'1103000076902','BET0047','วรัตถ์','สุภาพร','60021','งานเทคโนโลยีทางการศึกษา',8,3002,'2025-08-19 13:47:05','SYSTEM','พนักงานมหาวิทยาลัย (คณะแพทยศาสตร์)','2025-08-19 13:47:05'),
(2,'1770600014632','BET0029','จุไรรัตน์','กัลยาณกิตติ','4785','งานเทคโนโลยีทางการศึกษา',8,5002,'2025-08-19 13:48:32','SYSTEM','พนักงานมหาวิทยาลัย','2025-08-19 13:48:32');

/*Table structure for table `staff_welfare_permission` */

DROP TABLE IF EXISTS `staff_welfare_permission`;

CREATE TABLE `staff_welfare_permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) NOT NULL,
  `welfare_type_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4;

/*Data for the table `staff_welfare_permission` */

insert  into `staff_welfare_permission`(`id`,`user_id`,`welfare_type_id`,`created_at`) values 
(3,'BET0047',8,'2025-08-20 10:19:49'),
(4,'BET0047',7,'2025-08-20 10:20:01');

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fname` varchar(255) NOT NULL,
  `lname` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` longtext,
  `role` enum('superadmin','staff','user') NOT NULL DEFAULT 'user',
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4;

/*Data for the table `users` */

insert  into `users`(`id`,`fname`,`lname`,`username`,`password`,`role`,`created_date`) values 
(6,'administrator','admin','admin','$2a$10$GTtsH4BT1VJsRgC7c32B4OdhZZRQFS1ieYJ/qqPrx4bjAPcnRW/Ci','superadmin','2025-05-01 09:02:24');

/*Table structure for table `welfare_transactions` */

DROP TABLE IF EXISTS `welfare_transactions`;

CREATE TABLE `welfare_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_code` varchar(20) DEFAULT NULL COMMENT 'รหัสบัตรประชาชน',
  `employee_code` varchar(255) NOT NULL COMMENT 'รหัสพนักงาน',
  `welfare_type_id` int(11) NOT NULL COMMENT 'id ประเภทสวัสดิการ',
  `claimfor` enum('ตนเอง','มารดา','บิดา','บุตร') DEFAULT NULL COMMENT 'เบิกให้ใคร',
  `transaction_amount` decimal(10,2) NOT NULL COMMENT 'ยอดเบิก',
  `transaction_date` datetime DEFAULT NULL COMMENT 'วันที่เบิก',
  `description` longtext COMMENT 'รายละเอียดการเบิก - ถ้ามี',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL DEFAULT 'system',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4;

/*Data for the table `welfare_transactions` */

insert  into `welfare_transactions`(`id`,`id_code`,`employee_code`,`welfare_type_id`,`claimfor`,`transaction_amount`,`transaction_date`,`description`,`created_at`,`created_by`) values 
(1,'1770600014632','BET0029',8,'ตนเอง',1500.00,'2025-08-19 13:59:32','รักษาพยาบาล','2025-08-19 13:59:32','admin'),
(2,'1770600014632','BET0029',8,'บุตร',500.00,'2025-08-19 13:59:40','ค่าเทอมลูก','2025-08-19 13:59:40','admin'),
(3,'1103000076902','BET0047',8,'ตนเอง',1000.00,'2025-08-19 13:59:54','ค่านาฬิกาสุขภาพ','2025-08-19 13:59:54','admin'),
(4,'1103000076902','BET0047',8,'ตนเอง',500.00,'2025-08-19 14:55:33','test','2025-08-19 14:55:33','admin');

/*Table structure for table `welfare_types` */

DROP TABLE IF EXISTS `welfare_types`;

CREATE TABLE `welfare_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` longtext,
  `created_by` varchar(255) NOT NULL DEFAULT 'superadmin',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4;

/*Data for the table `welfare_types` */

insert  into `welfare_types`(`id`,`name`,`description`,`created_by`,`created_at`) values 
(7,'สวัสดิการยืดหยุ่น','สวัสดิการยืดหยุ่นของพนักงานมหาวิทยาลัย','system','2025-07-22 03:46:25'),
(8,'สวัสดิการ 5000','สวัสดิการ 5000 บาท ของคณะแพทยศาสตร์','system','2025-07-22 03:47:01');

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
