
-- Table: users
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `email` (`email`) USING BTREE,
  UNIQUE KEY `username` (`username`) USING BTREE,
  UNIQUE KEY `username_2` (`username`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Table: academic_years
CREATE TABLE `academic_years` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Table: teachers
CREATE TABLE `teachers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `nip` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `position` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `photo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gender` enum('L','P') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `user_id` (`user_id`) USING BTREE,
  CONSTRAINT `teachers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Table: classes
CREATE TABLE `classes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grade_id` int NOT NULL,
  `department_id` int DEFAULT NULL,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `homeroom_teacher_id` int DEFAULT NULL,
  `capacity` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `grade_id` (`grade_id`) USING BTREE,
  KEY `department_id` (`department_id`) USING BTREE,
  KEY `homeroom_teacher_id` (`homeroom_teacher_id`) USING BTREE,
  CONSTRAINT `classes_ibfk_1` FOREIGN KEY (`grade_id`) REFERENCES `grades` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `classes_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `classes_ibfk_3` FOREIGN KEY (`homeroom_teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Table: subjects
CREATE TABLE `subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` int DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `code` (`code`) USING BTREE,
  UNIQUE KEY `subjects_code` (`code`) USING BTREE,
  KEY `created_by` (`created_by`) USING BTREE,
  KEY `updated_by` (`updated_by`) USING BTREE,
  KEY `subjects_name` (`name`) USING BTREE,
  KEY `subjects_subject_type` (`subject_type`) USING BTREE,
  KEY `subjects_department_id` (`department_id`) USING BTREE,
  KEY `subjects_is_active` (`is_active`) USING BTREE,
  CONSTRAINT `subjects_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `subjects_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `subjects_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table: cbt_exams
CREATE TABLE `cbt_exams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `semester` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `exam_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'QUIZ, DAILY, STS, SAS, TRYOUT, OTHER',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `instructions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `duration_minutes` int NOT NULL,
  `passing_score` decimal(5,2) DEFAULT NULL,
  `shuffle_questions` tinyint(1) NOT NULL DEFAULT '1',
  `shuffle_options` tinyint(1) NOT NULL DEFAULT '1',
  `max_attempts` int NOT NULL DEFAULT '1',
  `result_visibility` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'HIDDEN' COMMENT 'HIDDEN, SCORE_ONLY, SCORE_AND_ANSWERS, FULL_REVIEW',
  `result_published_at` datetime DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT, READY, PUBLISHED, FINISHED, CANCELLED',
  `published_at` datetime DEFAULT NULL,
  `created_by` int NOT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uq_cbt_exams_code` (`code`) USING BTREE,
  KEY `idx_cbt_exams_subject_academic` (`subject_id`,`academic_year_id`,`semester`) USING BTREE,
  KEY `idx_cbt_exams_status` (`status`) USING BTREE,
  KEY `idx_cbt_exams_created_by` (`created_by`) USING BTREE,
  KEY `idx_cbt_exams_updated_by` (`updated_by`) USING BTREE,
  KEY `fk_cbt_exams_academic_year` (`academic_year_id`),
  CONSTRAINT `fk_cbt_exams_academic_year` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_exams_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_exams_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_exams_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_cbt_exams_duration` CHECK ((`duration_minutes` > 0)),
  CONSTRAINT `chk_cbt_exams_max_attempts` CHECK ((`max_attempts` > 0)),
  CONSTRAINT `chk_cbt_exams_passing_score` CHECK (((`passing_score` is null) or ((`passing_score` >= 0) and (`passing_score` <= 100))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;


-- Table: cbt_teacher_assignments
CREATE TABLE `cbt_teacher_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `class_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `semester` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ODD, EVEN, or school convention',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uq_cbt_teacher_assignment` (`teacher_id`,`subject_id`,`class_id`,`academic_year_id`,`semester`) USING BTREE,
  KEY `idx_cbt_ta_subject_class` (`subject_id`,`class_id`) USING BTREE,
  KEY `idx_cbt_ta_academic_year` (`academic_year_id`,`semester`,`is_active`) USING BTREE,
  KEY `idx_cbt_ta_created_by` (`created_by`) USING BTREE,
  KEY `fk_cbt_ta_class` (`class_id`),
  CONSTRAINT `fk_cbt_ta_academic_year` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_ta_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_ta_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_ta_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_ta_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;


-- Table: cbt_question_banks
CREATE TABLE `cbt_question_banks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject_id` int NOT NULL,
  `grade_id` int DEFAULT NULL,
  `academic_year_id` int DEFAULT NULL,
  `semester` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, ARCHIVED',
  `created_by` int NOT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_cbt_qb_subject` (`subject_id`) USING BTREE,
  KEY `idx_cbt_qb_grade` (`grade_id`) USING BTREE,
  KEY `idx_cbt_qb_academic` (`academic_year_id`,`semester`) USING BTREE,
  KEY `idx_cbt_qb_owner_status` (`created_by`,`status`) USING BTREE,
  KEY `idx_cbt_qb_updated_by` (`updated_by`) USING BTREE,
  CONSTRAINT `fk_cbt_qb_academic_year` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_qb_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_qb_grade` FOREIGN KEY (`grade_id`) REFERENCES `grades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_qb_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_qb_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;


-- Table: cbt_questions
CREATE TABLE `cbt_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `question_bank_id` int NOT NULL,
  `question_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, ESSAY',
  `question_text` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `difficulty` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEDIUM' COMMENT 'EASY, MEDIUM, HARD',
  `default_score` decimal(8,2) NOT NULL DEFAULT '1.00',
  `answer_key` json DEFAULT NULL COMMENT 'Answer key/settings for TRUE_FALSE and SHORT_ANSWER',
  `explanation` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT, ACTIVE, ARCHIVED',
  `created_by` int NOT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_cbt_questions_bank_status` (`question_bank_id`,`status`) USING BTREE,
  KEY `idx_cbt_questions_type` (`question_type`) USING BTREE,
  KEY `idx_cbt_questions_difficulty` (`difficulty`) USING BTREE,
  KEY `idx_cbt_questions_created_by` (`created_by`) USING BTREE,
  KEY `idx_cbt_questions_updated_by` (`updated_by`) USING BTREE,
  CONSTRAINT `fk_cbt_questions_bank` FOREIGN KEY (`question_bank_id`) REFERENCES `cbt_question_banks` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_questions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_questions_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_cbt_questions_default_score` CHECK ((`default_score` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;


-- Table: cbt_question_options
CREATE TABLE `cbt_question_options` (
  `id` int NOT NULL AUTO_INCREMENT,
  `question_id` int NOT NULL,
  `option_key` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_text` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_correct` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uq_cbt_question_option_key` (`question_id`,`option_key`) USING BTREE,
  KEY `idx_cbt_question_options_order` (`question_id`,`sort_order`) USING BTREE,
  CONSTRAINT `fk_cbt_question_options_question` FOREIGN KEY (`question_id`) REFERENCES `cbt_questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;


-- Table: cbt_exam_questions
CREATE TABLE `cbt_exam_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `exam_id` int NOT NULL,
  `source_question_id` int DEFAULT NULL,
  `question_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_text` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `answer_key` json DEFAULT NULL,
  `explanation` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `score` decimal(8,2) NOT NULL DEFAULT '1.00',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uq_cbt_exam_source_question` (`exam_id`,`source_question_id`) USING BTREE,
  KEY `idx_cbt_exam_questions_order` (`exam_id`,`sort_order`) USING BTREE,
  KEY `idx_cbt_exam_questions_source` (`source_question_id`) USING BTREE,
  CONSTRAINT `fk_cbt_exam_questions_exam` FOREIGN KEY (`exam_id`) REFERENCES `cbt_exams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_exam_questions_source` FOREIGN KEY (`source_question_id`) REFERENCES `cbt_questions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_cbt_exam_questions_score` CHECK ((`score` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;


-- Table: cbt_exam_question_options
CREATE TABLE `cbt_exam_question_options` (
  `id` int NOT NULL AUTO_INCREMENT,
  `exam_question_id` int NOT NULL,
  `source_option_id` int DEFAULT NULL,
  `option_key` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_text` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_correct` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uq_cbt_exam_question_option_key` (`exam_question_id`,`option_key`) USING BTREE,
  KEY `idx_cbt_eqo_order` (`exam_question_id`,`sort_order`) USING BTREE,
  KEY `idx_cbt_eqo_source_option` (`source_option_id`) USING BTREE,
  CONSTRAINT `fk_cbt_eqo_exam_question` FOREIGN KEY (`exam_question_id`) REFERENCES `cbt_exam_questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_eqo_source_option` FOREIGN KEY (`source_option_id`) REFERENCES `cbt_question_options` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;


-- Table: cbt_exam_schedules
CREATE TABLE `cbt_exam_schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `exam_id` int NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Reguler',
  `start_at` datetime NOT NULL,
  `end_at` datetime NOT NULL COMMENT 'Latest time to start/access the exam',
  `duration_minutes` int DEFAULT NULL COMMENT 'NULL means use cbt_exams.duration_minutes',
  `token_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `late_tolerance_minutes` int NOT NULL DEFAULT '0',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SCHEDULED' COMMENT 'SCHEDULED, OPEN, CLOSED, CANCELLED',
  `created_by` int NOT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_cbt_schedules_exam` (`exam_id`) USING BTREE,
  KEY `idx_cbt_schedules_window` (`status`,`start_at`,`end_at`) USING BTREE,
  KEY `idx_cbt_schedules_created_by` (`created_by`) USING BTREE,
  KEY `idx_cbt_schedules_updated_by` (`updated_by`) USING BTREE,
  CONSTRAINT `fk_cbt_schedules_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_schedules_exam` FOREIGN KEY (`exam_id`) REFERENCES `cbt_exams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_schedules_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_cbt_schedules_duration` CHECK (((`duration_minutes` is null) or (`duration_minutes` > 0))),
  CONSTRAINT `chk_cbt_schedules_late_tolerance` CHECK ((`late_tolerance_minutes` >= 0)),
  CONSTRAINT `chk_cbt_schedules_window` CHECK ((`end_at` > `start_at`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;


-- Table: cbt_exam_classes
CREATE TABLE `cbt_exam_classes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `schedule_id` int NOT NULL,
  `class_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uq_cbt_exam_class` (`schedule_id`,`class_id`) USING BTREE,
  KEY `idx_cbt_exam_classes_class` (`class_id`) USING BTREE,
  CONSTRAINT `fk_cbt_exam_classes_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_exam_classes_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `cbt_exam_schedules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;


-- Table: cbt_exam_participants
CREATE TABLE `cbt_exam_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `schedule_id` int NOT NULL,
  `student_id` int NOT NULL,
  `class_id` int NOT NULL COMMENT 'Snapshot of the student class at registration time',
  `attendance_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'REGISTERED' COMMENT 'REGISTERED, PRESENT, ABSENT, EXCUSED, MAKEUP',
  `participant_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NOT_STARTED' COMMENT 'NOT_STARTED, READY, IN_PROGRESS, FINISHED, BLOCKED',
  `extra_time_minutes` int NOT NULL DEFAULT '0',
  `is_eligible` tinyint(1) NOT NULL DEFAULT '1',
  `notes` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uq_cbt_exam_participant` (`schedule_id`,`student_id`) USING BTREE,
  KEY `idx_cbt_participants_student` (`student_id`,`participant_status`) USING BTREE,
  KEY `idx_cbt_participants_monitor` (`schedule_id`,`participant_status`) USING BTREE,
  KEY `idx_cbt_participants_class` (`class_id`) USING BTREE,
  CONSTRAINT `fk_cbt_participants_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_participants_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `cbt_exam_schedules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_participants_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_cbt_participants_extra_time` CHECK ((`extra_time_minutes` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;


-- Table: cbt_attempts
CREATE TABLE `cbt_attempts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `participant_id` int NOT NULL,
  `attempt_number` int NOT NULL DEFAULT '1',
  `randomization_seed` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_token_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `started_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `last_activity_at` datetime DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'IN_PROGRESS' COMMENT 'IN_PROGRESS, SUBMITTED, TIME_EXPIRED, CANCELLED, RESET',
  `objective_points` decimal(10,2) NOT NULL DEFAULT '0.00',
  `essay_points` decimal(10,2) NOT NULL DEFAULT '0.00',
  `earned_points` decimal(10,2) NOT NULL DEFAULT '0.00',
  `maximum_points` decimal(10,2) NOT NULL DEFAULT '0.00',
  `final_score` decimal(5,2) DEFAULT NULL COMMENT 'Normalized score from 0 to 100',
  `correct_count` int NOT NULL DEFAULT '0',
  `wrong_count` int NOT NULL DEFAULT '0',
  `unanswered_count` int NOT NULL DEFAULT '0',
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `version` int NOT NULL DEFAULT '0' COMMENT 'Optimistic locking for concurrent autosave',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uq_cbt_attempt_number` (`participant_id`,`attempt_number`) USING BTREE,
  UNIQUE KEY `uq_cbt_attempt_session_token` (`session_token_hash`) USING BTREE,
  KEY `idx_cbt_attempts_status_activity` (`status`,`last_activity_at`) USING BTREE,
  KEY `idx_cbt_attempts_expires` (`status`,`expires_at`) USING BTREE,
  CONSTRAINT `fk_cbt_attempts_participant` FOREIGN KEY (`participant_id`) REFERENCES `cbt_exam_participants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_cbt_attempts_number` CHECK ((`attempt_number` > 0)),
  CONSTRAINT `chk_cbt_attempts_score` CHECK (((`final_score` is null) or ((`final_score` >= 0) and (`final_score` <= 100)))),
  CONSTRAINT `chk_cbt_attempts_time` CHECK ((`expires_at` > `started_at`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;


-- Table: cbt_answers
CREATE TABLE `cbt_answers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `attempt_id` bigint NOT NULL,
  `exam_question_id` int NOT NULL,
  `answer_text` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_flagged` tinyint(1) NOT NULL DEFAULT '0',
  `is_correct` tinyint(1) DEFAULT NULL,
  `score_awarded` decimal(8,2) DEFAULT NULL,
  `grading_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, AUTO_GRADED, MANUALLY_GRADED',
  `teacher_feedback` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `answered_at` datetime DEFAULT NULL,
  `version` int NOT NULL DEFAULT '0' COMMENT 'Optimistic locking for autosave',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uq_cbt_answer_per_question` (`attempt_id`,`exam_question_id`) USING BTREE,
  KEY `idx_cbt_answers_question` (`exam_question_id`) USING BTREE,
  KEY `idx_cbt_answers_grading` (`grading_status`,`reviewed_by`) USING BTREE,
  KEY `fk_cbt_answers_reviewed_by` (`reviewed_by`),
  CONSTRAINT `fk_cbt_answers_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `cbt_attempts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_answers_exam_question` FOREIGN KEY (`exam_question_id`) REFERENCES `cbt_exam_questions` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_answers_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_cbt_answers_score` CHECK (((`score_awarded` is null) or (`score_awarded` >= 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;


-- Table: cbt_answer_choices
CREATE TABLE `cbt_answer_choices` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `answer_id` bigint NOT NULL,
  `exam_question_option_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uq_cbt_answer_choice` (`answer_id`,`exam_question_option_id`) USING BTREE,
  KEY `idx_cbt_answer_choices_option` (`exam_question_option_id`) USING BTREE,
  CONSTRAINT `fk_cbt_answer_choices_answer` FOREIGN KEY (`answer_id`) REFERENCES `cbt_answers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_answer_choices_option` FOREIGN KEY (`exam_question_option_id`) REFERENCES `cbt_exam_question_options` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;


-- Table: cbt_activity_logs
CREATE TABLE `cbt_activity_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `attempt_id` bigint NOT NULL,
  `user_id` int DEFAULT NULL,
  `event_type` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'EXAM_STARTED, TAB_HIDDEN, CONNECTION_LOST, SUBMITTED, etc.',
  `description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_cbt_logs_attempt_time` (`attempt_id`,`created_at`) USING BTREE,
  KEY `idx_cbt_logs_event_time` (`event_type`,`created_at`) USING BTREE,
  KEY `idx_cbt_logs_user` (`user_id`) USING BTREE,
  CONSTRAINT `fk_cbt_logs_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `cbt_attempts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cbt_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

