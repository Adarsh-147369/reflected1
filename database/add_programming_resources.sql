-- Migration Script: Add Programming Languages & Programming Fundamentals Resources
-- This script adds comprehensive learning resources for Python, Java, and C programming
-- Execute this script to add resources without recreating the entire database

-- ============================================================================
-- BELOW 40% PERFORMANCE CATEGORY - FOUNDATIONAL RESOURCES
-- ============================================================================

-- Python Foundational Resources (2 YouTube, 1 Certification)
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', 'below_40', 'youtube', 'Python Tutorial for Beginners - Full Course in 12 Hours', 'https://www.youtube.com/watch?v=_uQrJ0TkZlc'),
('CSE', 'Programming Languages and Programming Fundamentals', 'below_40', 'youtube', 'Python Programming for Beginners - Complete Tutorial', 'https://www.youtube.com/watch?v=rfscVS0vtbw'),
('CSE', 'Programming Languages and Programming Fundamentals', 'below_40', 'certification', 'Python for Everybody Specialization - University of Michigan', 'https://www.coursera.org/specializations/python');

-- Java Foundational Resources (2 YouTube, 1 Course)
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', 'below_40', 'youtube', 'Java Tutorial for Beginners - Full Course', 'https://www.youtube.com/watch?v=eIrMbAQSU34'),
('CSE', 'Programming Languages and Programming Fundamentals', 'below_40', 'youtube', 'Java Programming Masterclass - Complete Beginner to Advanced', 'https://www.youtube.com/watch?v=grEKMHGYyns'),
('CSE', 'Programming Languages and Programming Fundamentals', 'below_40', 'course', 'Java Programming and Software Engineering Fundamentals', 'https://www.coursera.org/specializations/java-programming');

-- C Programming Foundational Resources (2 YouTube, 1 Course)
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', 'below_40', 'youtube', 'C Programming Tutorial for Beginners - Full Course', 'https://www.youtube.com/watch?v=KJgsSFOSQv0'),
('CSE', 'Programming Languages and Programming Fundamentals', 'below_40', 'youtube', 'C Programming Language - Complete Tutorial', 'https://www.youtube.com/watch?v=87SH2Cn0s9A'),
('CSE', 'Programming Languages and Programming Fundamentals', 'below_40', 'course', 'C Programming For Beginners - Master the C Language', 'https://www.udemy.com/course/c-programming-for-beginners/');

-- General Programming Fundamentals
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', 'below_40', 'certification', 'Programming Fundamentals - Duke University', 'https://www.coursera.org/learn/programming-fundamentals');


-- ============================================================================
-- 40-80% PERFORMANCE CATEGORY - INTERMEDIATE RESOURCES
-- ============================================================================

-- Python Intermediate Resources (1 YouTube, 1 Course, 1 Project)
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', '40_to_80', 'youtube', 'Python OOP Tutorial - Object Oriented Programming', 'https://www.youtube.com/watch?v=Ej_02ICOIgs'),
('CSE', 'Programming Languages and Programming Fundamentals', '40_to_80', 'course', 'Complete Python Developer in 2024: Zero to Mastery', 'https://www.udemy.com/course/complete-python-developer-zero-to-mastery/'),
('CSE', 'Programming Languages and Programming Fundamentals', '40_to_80', 'project', 'Build 12 Python Projects - From Beginner to Advanced', 'https://github.com/tuvtran/project-based-learning#python');

-- Java Intermediate Resources (1 YouTube, 1 Course, 1 Project)
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', '40_to_80', 'youtube', 'Java OOP Concepts and Data Structures', 'https://www.youtube.com/watch?v=xk4_1vDrzzo'),
('CSE', 'Programming Languages and Programming Fundamentals', '40_to_80', 'course', 'Java Programming Masterclass covering Java 11 & Java 17', 'https://www.udemy.com/course/java-the-complete-java-developer-course/'),
('CSE', 'Programming Languages and Programming Fundamentals', '40_to_80', 'project', 'Java Projects for Practice - Spring Boot Applications', 'https://github.com/topics/java-projects');

-- C Intermediate Resources (1 Course, 1 Project)
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', '40_to_80', 'course', 'Advanced C Programming - Pointers and Memory Management', 'https://www.udemy.com/course/advanced-c-programming-pointers/'),
('CSE', 'Programming Languages and Programming Fundamentals', '40_to_80', 'project', 'C Programming Projects - Data Structures Implementation', 'https://github.com/topics/c-programming');

-- Multi-Language Intermediate Projects
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', '40_to_80', 'project', 'Object-Oriented Design Patterns - Multi-Language Examples', 'https://github.com/topics/design-patterns'),
('CSE', 'Programming Languages and Programming Fundamentals', '40_to_80', 'project', 'Data Structures and Algorithms Implementation Guide', 'https://github.com/TheAlgorithms');


-- ============================================================================
-- ABOVE 80% PERFORMANCE CATEGORY - ADVANCED RESOURCES
-- ============================================================================

-- Python Advanced Resources (1 Certification, 1 Project)
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'certification', 'Python 3 Programming Specialization - University of Michigan', 'https://www.coursera.org/specializations/python-3-programming'),
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'project', 'Advanced Python Projects - Async, Concurrency & Performance', 'https://github.com/topics/advanced-python');

-- Java Advanced Resources (1 Certification, 1 Project)
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'certification', 'Object Oriented Java Programming: Data Structures - Duke University', 'https://www.coursera.org/learn/object-oriented-java'),
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'project', 'Advanced Java Projects - Multithreading & Design Patterns', 'https://github.com/topics/java-concurrency');

-- C Advanced Resources (1 Course, 1 Project)
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'course', 'C Programming: Advanced Data Types - Dartmouth College', 'https://www.coursera.org/learn/c-programming-advanced-data-types'),
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'project', 'System Programming in C - OS Concepts & Memory Management', 'https://github.com/topics/system-programming');

-- Advanced Cross-Language Resources
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'certification', 'Software Design and Architecture Specialization', 'https://www.coursera.org/specializations/software-design-architecture'),
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'project', 'Performance Optimization and Best Practices - Multi-Language', 'https://github.com/topics/performance-optimization');

-- End of migration script
