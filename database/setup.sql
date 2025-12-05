-- Adaptive Learning Platform Database Setup
-- Execute this file in PostgreSQL to create all tables

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS improvement_tracking CASCADE;
DROP TABLE IF EXISTS learning_resources CASCADE;
DROP TABLE IF EXISTS exam_questions CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  mobile_number VARCHAR(15) NOT NULL,
  stream VARCHAR(50) NOT NULL CHECK (stream IN ('CSE', 'ECE', 'EEE', 'mech', 'civil')),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create subjects table
CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  stream VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create exams table
CREATE TABLE exams (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  mcq_score INTEGER DEFAULT 0,
  descriptive_score DECIMAL(5,2) DEFAULT 0,
  total_score DECIMAL(5,2) DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  tab_switch_count INTEGER DEFAULT 0,
  auto_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create exam_questions table
CREATE TABLE exam_questions (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
  question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('mcq', 'descriptive')),
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  student_answer TEXT,
  marks_obtained DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create learning_resources table
CREATE TABLE learning_resources (
  id SERIAL PRIMARY KEY,
  stream VARCHAR(50) NOT NULL,
  subject_name VARCHAR(255) NOT NULL,
  performance_category VARCHAR(50) NOT NULL CHECK (performance_category IN ('below_40', '40_to_80', 'above_80')),
  resource_type VARCHAR(50) NOT NULL,
  resource_title VARCHAR(500) NOT NULL,
  resource_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_progress table
CREATE TABLE user_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  resource_id INTEGER REFERENCES learning_resources(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  progress_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Create improvement_tracking table
CREATE TABLE improvement_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  initial_score DECIMAL(5,2),
  current_score DECIMAL(5,2),
  improvement_percentage DECIMAL(5,2),
  resources_completed INTEGER DEFAULT 0,
  total_resources_assigned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
-- Hash generated using: node generate-password-hash.js admin123
INSERT INTO users (full_name, email, mobile_number, stream, password, role) 
VALUES ('Admin User', 'adarshreddy532@gmail.com', '9182546785', 'CSE', 
        '$2b$12$6x8JKvqg.aszTJHTzcCkvu382w0pxpzvvbfMC5onsXo3p3mBOKA.K', 'admin');

-- Note: The above hash may need to be regenerated. 
-- After setup, you can update admin password by running:
-- UPDATE users SET password = '$2b$10$YOUR_GENERATED_HASH' WHERE email = 'admin@adaptivelearning.com';

-- Insert subjects for CSE
INSERT INTO subjects (name, stream) VALUES
('Programming Languages & Programming Fundamentals', 'CSE'),
('Data Structures and Algorithms', 'CSE'),
('Operating Systems', 'CSE'),
('Database Management Systems', 'CSE'),
('Computer Networks', 'CSE');

-- Insert subjects for EEE
INSERT INTO subjects (name, stream) VALUES
('Electrical Machines', 'EEE'),
('Power Systems', 'EEE'),
('Power Electronics', 'EEE'),
('Circuit Theory', 'EEE'),
('Control Systems', 'EEE');

-- Insert subjects for ECE
INSERT INTO subjects (name, stream) VALUES
('Digital Electronics', 'ECE'),
('Analog Electronics', 'ECE'),
('Signals & Systems', 'ECE'),
('Communication Systems', 'ECE'),
('Electromagnetic Theory', 'ECE');

-- Insert subjects for Mechanical
INSERT INTO subjects (name, stream) VALUES
('Thermodynamics', 'mech'),
('Fluid Mechanics', 'mech'),
('Machine Design', 'mech'),
('Manufacturing Technology', 'mech'),
('Strength of Materials', 'mech');

-- Insert subjects for Civil
INSERT INTO subjects (name, stream) VALUES
('Structural Engineering', 'civil'),
('Strength of Materials', 'civil'),
('Concrete Technology', 'civil'),
('Soil Mechanics', 'civil'),
('Surveying', 'civil');

-- Insert comprehensive learning resources for all subjects

-- CSE - Programming Languages & Programming Fundamentals
-- Comprehensive resources covering Python, Java, and C programming

-- BELOW 40% - Foundational Resources
-- Python Foundational Resources
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages & Programming Fundamentals', 'below_40', 'youtube', 'Python Tutorial for Beginners - Full Course in 12 Hours', 'https://www.youtube.com/watch?v=_uQrJ0TkZlc'),
('CSE', 'Programming Languages & Programming Fundamentals', 'below_40', 'youtube', 'Python Programming for Beginners - Complete Tutorial', 'https://www.youtube.com/watch?v=rfscVS0vtbw'),
('CSE', 'Programming Languages & Programming Fundamentals', 'below_40', 'certification', 'Python for Everybody Specialization - University of Michigan', 'https://www.coursera.org/specializations/python');

-- Java Foundational Resources
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages & Programming Fundamentals', 'below_40', 'youtube', 'Java Tutorial for Beginners - Full Course', 'https://www.youtube.com/watch?v=eIrMbAQSU34'),
('CSE', 'Programming Languages & Programming Fundamentals', 'below_40', 'youtube', 'Java Programming Masterclass - Complete Beginner to Advanced', 'https://www.youtube.com/watch?v=grEKMHGYyns'),
('CSE', 'Programming Languages & Programming Fundamentals', 'below_40', 'course', 'Java Programming and Software Engineering Fundamentals', 'https://www.coursera.org/specializations/java-programming');

-- C Programming Foundational Resources
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages & Programming Fundamentals', 'below_40', 'youtube', 'C Programming Tutorial for Beginners - Full Course', 'https://www.youtube.com/watch?v=KJgsSFOSQv0'),
('CSE', 'Programming Languages & Programming Fundamentals', 'below_40', 'youtube', 'C Programming Language - Complete Tutorial', 'https://www.youtube.com/watch?v=87SH2Cn0s9A'),
('CSE', 'Programming Languages & Programming Fundamentals', 'below_40', 'course', 'C Programming For Beginners - Master the C Language', 'https://www.udemy.com/course/c-programming-for-beginners/');

-- General Programming Fundamentals
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages & Programming Fundamentals', 'below_40', 'certification', 'Programming Fundamentals - Duke University', 'https://www.coursera.org/learn/programming-fundamentals');

-- 40-80% - Intermediate Resources
-- Python Intermediate Resources
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages & Programming Fundamentals', '40_to_80', 'youtube', 'Python OOP Tutorial - Object Oriented Programming', 'https://www.youtube.com/watch?v=Ej_02ICOIgs'),
('CSE', 'Programming Languages & Programming Fundamentals', '40_to_80', 'course', 'Complete Python Developer in 2024: Zero to Mastery', 'https://www.udemy.com/course/complete-python-developer-zero-to-mastery/'),
('CSE', 'Programming Languages & Programming Fundamentals', '40_to_80', 'project', 'Build 12 Python Projects - From Beginner to Advanced', 'https://github.com/tuvtran/project-based-learning#python');

-- Java Intermediate Resources
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages & Programming Fundamentals', '40_to_80', 'youtube', 'Java OOP Concepts and Data Structures', 'https://www.youtube.com/watch?v=xk4_1vDrzzo'),
('CSE', 'Programming Languages & Programming Fundamentals', '40_to_80', 'course', 'Java Programming Masterclass covering Java 11 & Java 17', 'https://www.udemy.com/course/java-the-complete-java-developer-course/'),
('CSE', 'Programming Languages & Programming Fundamentals', '40_to_80', 'project', 'Java Projects for Practice - Spring Boot Applications', 'https://github.com/topics/java-projects');

-- C Intermediate Resources
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', '40_to_80', 'course', 'Advanced C Programming - Pointers and Memory Management', 'https://www.udemy.com/course/advanced-c-programming-pointers/'),
('CSE', 'Programming Languages and Programming Fundamentals', '40_to_80', 'project', 'C Programming Projects - Data Structures Implementation', 'https://github.com/topics/c-programming');

-- Multi-Language Intermediate Projects
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', '40_to_80', 'project', 'Object-Oriented Design Patterns - Multi-Language Examples', 'https://github.com/topics/design-patterns'),
('CSE', 'Programming Languages and Programming Fundamentals', '40_to_80', 'project', 'Data Structures and Algorithms Implementation Guide', 'https://github.com/TheAlgorithms');

-- ABOVE 80% - Advanced Resources
-- Python Advanced Resources
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'certification', 'Python 3 Programming Specialization - University of Michigan', 'https://www.coursera.org/specializations/python-3-programming'),
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'project', 'Advanced Python Projects - Async, Concurrency & Performance', 'https://github.com/topics/advanced-python');

-- Java Advanced Resources
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'certification', 'Object Oriented Java Programming: Data Structures - Duke University', 'https://www.coursera.org/learn/object-oriented-java'),
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'project', 'Advanced Java Projects - Multithreading & Design Patterns', 'https://github.com/topics/java-concurrency');

-- C Advanced Resources
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'course', 'C Programming: Advanced Data Types - Dartmouth College', 'https://www.coursera.org/learn/c-programming-advanced-data-types'),
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'project', 'System Programming in C - OS Concepts & Memory Management', 'https://github.com/topics/system-programming');

-- Advanced Cross-Language Resources
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'certification', 'Software Design and Architecture Specialization', 'https://www.coursera.org/specializations/software-design-architecture'),
('CSE', 'Programming Languages and Programming Fundamentals', 'above_80', 'project', 'Performance Optimization and Best Practices - Multi-Language', 'https://github.com/topics/performance-optimization');

-- CSE - Data Structures and Algorithms
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Data Structures and Algorithms', 'below_40', 'youtube', 'Data Structures and Algorithms Full Course', 'https://www.youtube.com/watch?v=8hly31xKli0'),
('CSE', 'Data Structures and Algorithms', 'below_40', 'certification', 'Algorithms Specialization', 'https://www.coursera.org/specializations/algorithms'),
('CSE', 'Data Structures and Algorithms', '40_to_80', 'youtube', 'Advanced DSA Concepts', 'https://www.youtube.com/watch?v=rm2-R1mSOdE'),
('CSE', 'Data Structures and Algorithms', '40_to_80', 'course', 'Mastering Data Structures', 'https://www.udemy.com/topic/data-structures/'),
('CSE', 'Data Structures and Algorithms', '40_to_80', 'project', 'LeetCode Practice Problems', 'https://leetcode.com/problemset/'),
('CSE', 'Data Structures and Algorithms', 'above_80', 'certification', 'Advanced Algorithms Certification', 'https://www.coursera.org/learn/advanced-algorithms'),
('CSE', 'Data Structures and Algorithms', 'above_80', 'project', 'Competitive Programming Projects', 'https://codeforces.com/');

-- CSE - Operating Systems
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Operating Systems', 'below_40', 'youtube', 'Operating System Full Course', 'https://www.youtube.com/watch?v=vBURTt97EkA'),
('CSE', 'Operating Systems', 'below_40', 'certification', 'Introduction to Operating Systems', 'https://www.coursera.org/learn/os'),
('CSE', 'Operating Systems', '40_to_80', 'youtube', 'Advanced OS Concepts', 'https://www.youtube.com/watch?v=bkSWJJZNgf8'),
('CSE', 'Operating Systems', '40_to_80', 'course', 'Linux System Administration', 'https://www.udemy.com/course/linux-administration/'),
('CSE', 'Operating Systems', '40_to_80', 'project', 'Build a Simple OS', 'https://github.com/topics/operating-system'),
('CSE', 'Operating Systems', 'above_80', 'certification', 'Advanced OS Design', 'https://www.coursera.org/learn/advanced-os'),
('CSE', 'Operating Systems', 'above_80', 'project', 'Kernel Development Project', 'https://github.com/topics/kernel');

-- CSE - Database Management Systems
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Database Management Systems', 'below_40', 'youtube', 'SQL Full Course', 'https://www.youtube.com/watch?v=HXV3zeQKqGY'),
('CSE', 'Database Management Systems', 'below_40', 'certification', 'Database Management Essentials', 'https://www.coursera.org/learn/database-management'),
('CSE', 'Database Management Systems', '40_to_80', 'youtube', 'Advanced SQL Tutorials', 'https://www.youtube.com/watch?v=Mi2wIAFQ0Oc'),
('CSE', 'Database Management Systems', '40_to_80', 'course', 'PostgreSQL Masterclass', 'https://www.udemy.com/course/postgresql-masterclass/'),
('CSE', 'Database Management Systems', '40_to_80', 'project', 'E-commerce Database Project', 'https://github.com/topics/database'),
('CSE', 'Database Management Systems', 'above_80', 'certification', 'Advanced Database Systems', 'https://www.coursera.org/learn/advanced-db'),
('CSE', 'Database Management Systems', 'above_80', 'project', 'Distributed Database System', 'https://github.com/topics/distributed-database');

-- CSE - Computer Networks
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('CSE', 'Computer Networks', 'below_40', 'youtube', 'Computer Networks Full Course', 'https://www.youtube.com/watch?v=3QhU9jd03a0'),
('CSE', 'Computer Networks', 'below_40', 'certification', 'Computer Networks Basics', 'https://www.coursera.org/learn/computer-networks'),
('CSE', 'Computer Networks', '40_to_80', 'youtube', 'Network Protocols Explained', 'https://www.youtube.com/watch?v=qmONrGy7H9k'),
('CSE', 'Computer Networks', '40_to_80', 'course', 'Network Security Fundamentals', 'https://www.udemy.com/course/network-security/'),
('CSE', 'Computer Networks', '40_to_80', 'project', 'Network Monitoring Tool', 'https://github.com/topics/network-monitoring'),
('CSE', 'Computer Networks', 'above_80', 'certification', 'Advanced Networking', 'https://www.coursera.org/learn/advanced-networking'),
('CSE', 'Computer Networks', 'above_80', 'project', 'Custom Protocol Implementation', 'https://github.com/topics/network-protocol');

-- EEE - Electrical Machines
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('EEE', 'Electrical Machines', 'below_40', 'youtube', 'Electrical Machines Basics', 'https://www.youtube.com/watch?v=Tk90bCqEoqs'),
('EEE', 'Electrical Machines', 'below_40', 'certification', 'Introduction to Electrical Machines', 'https://www.coursera.org/learn/electrical-machines'),
('EEE', 'Electrical Machines', '40_to_80', 'youtube', 'DC and AC Motors Explained', 'https://www.youtube.com/watch?v=LtJoJBUSe14'),
('EEE', 'Electrical Machines', '40_to_80', 'course', 'Electric Motor Control', 'https://www.udemy.com/course/electric-motor-control/'),
('EEE', 'Electrical Machines', '40_to_80', 'project', 'Motor Control System Design', 'https://github.com/topics/motor-control'),
('EEE', 'Electrical Machines', 'above_80', 'certification', 'Advanced Electrical Machines', 'https://www.coursera.org/learn/advanced-machines'),
('EEE', 'Electrical Machines', 'above_80', 'project', 'Smart Motor Controller', 'https://github.com/topics/smart-controller');

-- EEE - Power Systems
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('EEE', 'Power Systems', 'below_40', 'youtube', 'Power System Fundamentals', 'https://www.youtube.com/watch?v=KVqgKU7v7hw'),
('EEE', 'Power Systems', 'below_40', 'certification', 'Power Systems Basics', 'https://www.coursera.org/learn/power-systems'),
('EEE', 'Power Systems', '40_to_80', 'youtube', 'Power Grid Analysis', 'https://www.youtube.com/watch?v=7uRmp6x8ftU'),
('EEE', 'Power Systems', '40_to_80', 'course', 'Power System Protection', 'https://www.udemy.com/course/power-system-protection/'),
('EEE', 'Power Systems', '40_to_80', 'project', 'Load Flow Analysis Tool', 'https://github.com/topics/power-systems'),
('EEE', 'Power Systems', 'above_80', 'certification', 'Advanced Power Systems', 'https://www.coursera.org/learn/advanced-power'),
('EEE', 'Power Systems', 'above_80', 'project', 'Smart Grid Simulation', 'https://github.com/topics/smart-grid');

-- EEE - Power Electronics
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('EEE', 'Power Electronics', 'below_40', 'youtube', 'Power Electronics Introduction', 'https://www.youtube.com/watch?v=0apOB5Ylx0c'),
('EEE', 'Power Electronics', 'below_40', 'certification', 'Power Electronics Basics', 'https://www.coursera.org/learn/power-electronics'),
('EEE', 'Power Electronics', '40_to_80', 'youtube', 'Converters and Inverters', 'https://www.youtube.com/watch?v=0apOB5Ylx0c'),
('EEE', 'Power Electronics', '40_to_80', 'course', 'Power Converter Design', 'https://www.udemy.com/course/power-converter/'),
('EEE', 'Power Electronics', '40_to_80', 'project', 'DC-DC Converter Design', 'https://github.com/topics/power-converter'),
('EEE', 'Power Electronics', 'above_80', 'certification', 'Advanced Power Electronics', 'https://www.coursera.org/learn/advanced-power-electronics'),
('EEE', 'Power Electronics', 'above_80', 'project', 'Solar Inverter System', 'https://github.com/topics/solar-inverter');

-- EEE - Circuit Theory
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('EEE', 'Circuit Theory', 'below_40', 'youtube', 'Circuit Analysis Basics', 'https://www.youtube.com/watch?v=2SsL2Y32UeA'),
('EEE', 'Circuit Theory', 'below_40', 'certification', 'Introduction to Circuits', 'https://www.coursera.org/learn/circuit-theory'),
('EEE', 'Circuit Theory', '40_to_80', 'youtube', 'AC Circuit Analysis', 'https://www.youtube.com/watch?v=KwU3_9jZEAw'),
('EEE', 'Circuit Theory', '40_to_80', 'course', 'Advanced Circuit Design', 'https://www.udemy.com/course/circuit-design/'),
('EEE', 'Circuit Theory', '40_to_80', 'project', 'Circuit Simulator Project', 'https://github.com/topics/circuit-simulator'),
('EEE', 'Circuit Theory', 'above_80', 'certification', 'Advanced Circuit Theory', 'https://www.coursera.org/learn/advanced-circuits'),
('EEE', 'Circuit Theory', 'above_80', 'project', 'Analog Circuit Design', 'https://github.com/topics/analog-circuits');

-- EEE - Control Systems
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('EEE', 'Control Systems', 'below_40', 'youtube', 'Control Systems Basics', 'https://www.youtube.com/watch?v=Pi7l8mMjYVE'),
('EEE', 'Control Systems', 'below_40', 'certification', 'Control Systems Introduction', 'https://www.coursera.org/learn/control-systems'),
('EEE', 'Control Systems', '40_to_80', 'youtube', 'PID Controller Explained', 'https://www.youtube.com/watch?v=UR0hOmjaHp0'),
('EEE', 'Control Systems', '40_to_80', 'course', 'Modern Control Systems', 'https://www.udemy.com/course/modern-control/'),
('EEE', 'Control Systems', '40_to_80', 'project', 'PID Controller Implementation', 'https://github.com/topics/pid-controller'),
('EEE', 'Control Systems', 'above_80', 'certification', 'Advanced Control Systems', 'https://www.coursera.org/learn/advanced-control'),
('EEE', 'Control Systems', 'above_80', 'project', 'Robotic Control System', 'https://github.com/topics/robotic-control');

-- ECE - Digital Electronics
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('ECE', 'Digital Electronics', 'below_40', 'youtube', 'Digital Electronics Basics', 'https://www.youtube.com/watch?v=VwEyxtRe2eI'),
('ECE', 'Digital Electronics', 'below_40', 'certification', 'Digital Circuits Introduction', 'https://www.coursera.org/learn/digital-electronics'),
('ECE', 'Digital Electronics', '40_to_80', 'youtube', 'Combinational and Sequential Circuits', 'https://www.youtube.com/watch?v=If0uNm6XEc4'),
('ECE', 'Digital Electronics', '40_to_80', 'course', 'FPGA Programming', 'https://www.udemy.com/course/fpga-programming/'),
('ECE', 'Digital Electronics', '40_to_80', 'project', 'Digital Clock Project', 'https://github.com/topics/digital-electronics'),
('ECE', 'Digital Electronics', 'above_80', 'certification', 'Advanced Digital Design', 'https://www.coursera.org/learn/advanced-digital'),
('ECE', 'Digital Electronics', 'above_80', 'project', 'VHDL/Verilog Projects', 'https://github.com/topics/vhdl');

-- ECE - Analog Electronics
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('ECE', 'Analog Electronics', 'below_40', 'youtube', 'Analog Electronics Fundamentals', 'https://www.youtube.com/watch?v=KyO1zXQ1t7k'),
('ECE', 'Analog Electronics', 'below_40', 'certification', 'Analog Circuits Basics', 'https://www.coursera.org/learn/analog-electronics'),
('ECE', 'Analog Electronics', '40_to_80', 'youtube', 'Op-Amp Circuits', 'https://www.youtube.com/watch?v=7FYHt5XviKc'),
('ECE', 'Analog Electronics', '40_to_80', 'course', 'Analog Circuit Design', 'https://www.udemy.com/course/analog-design/'),
('ECE', 'Analog Electronics', '40_to_80', 'project', 'Audio Amplifier Design', 'https://github.com/topics/analog-circuits'),
('ECE', 'Analog Electronics', 'above_80', 'certification', 'Advanced Analog Design', 'https://www.coursera.org/learn/advanced-analog'),
('ECE', 'Analog Electronics', 'above_80', 'project', 'RF Circuit Design', 'https://github.com/topics/rf-design');

-- ECE - Signals & Systems
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('ECE', 'Signals & Systems', 'below_40', 'youtube', 'Signals and Systems Basics', 'https://www.youtube.com/watch?v=O2l2tkcX2Es'),
('ECE', 'Signals & Systems', 'below_40', 'certification', 'Introduction to Signals', 'https://www.coursera.org/learn/signals-systems'),
('ECE', 'Signals & Systems', '40_to_80', 'youtube', 'Fourier Transform Explained', 'https://www.youtube.com/watch?v=spUNpyF58BY'),
('ECE', 'Signals & Systems', '40_to_80', 'course', 'Digital Signal Processing', 'https://www.udemy.com/course/dsp/'),
('ECE', 'Signals & Systems', '40_to_80', 'project', 'Signal Processing Tool', 'https://github.com/topics/signal-processing'),
('ECE', 'Signals & Systems', 'above_80', 'certification', 'Advanced DSP', 'https://www.coursera.org/learn/advanced-dsp'),
('ECE', 'Signals & Systems', 'above_80', 'project', 'Image Processing Application', 'https://github.com/topics/image-processing');

-- ECE - Communication Systems
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('ECE', 'Communication Systems', 'below_40', 'youtube', 'Communication Systems Basics', 'https://www.youtube.com/watch?v=HVnGmMHOglc'),
('ECE', 'Communication Systems', 'below_40', 'certification', 'Communication Systems Introduction', 'https://www.coursera.org/learn/communication-systems'),
('ECE', 'Communication Systems', '40_to_80', 'youtube', 'Modulation Techniques', 'https://www.youtube.com/watch?v=HVnGmMHOglc'),
('ECE', 'Communication Systems', '40_to_80', 'course', 'Wireless Communications', 'https://www.udemy.com/course/wireless-comm/'),
('ECE', 'Communication Systems', '40_to_80', 'project', 'SDR Project', 'https://github.com/topics/software-defined-radio'),
('ECE', 'Communication Systems', 'above_80', 'certification', 'Advanced Communications', 'https://www.coursera.org/learn/advanced-comm'),
('ECE', 'Communication Systems', 'above_80', 'project', '5G Simulation Project', 'https://github.com/topics/5g');

-- ECE - Electromagnetic Theory
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('ECE', 'Electromagnetic Theory', 'below_40', 'youtube', 'EM Theory Basics', 'https://www.youtube.com/watch?v=m4t7gTmBK3g'),
('ECE', 'Electromagnetic Theory', 'below_40', 'certification', 'EM Fields Introduction', 'https://www.coursera.org/learn/em-theory'),
('ECE', 'Electromagnetic Theory', '40_to_80', 'youtube', 'Maxwell Equations', 'https://www.youtube.com/watch?v=wf0rxMa97Fw'),
('ECE', 'Electromagnetic Theory', '40_to_80', 'course', 'Antenna Theory', 'https://www.udemy.com/course/antenna-theory/'),
('ECE', 'Electromagnetic Theory', '40_to_80', 'project', 'Antenna Design Simulation', 'https://github.com/topics/antenna'),
('ECE', 'Electromagnetic Theory', 'above_80', 'certification', 'Advanced EM Theory', 'https://www.coursera.org/learn/advanced-em'),
('ECE', 'Electromagnetic Theory', 'above_80', 'project', 'RF Antenna Array Design', 'https://github.com/topics/antenna-array');

-- Mech - Thermodynamics
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('mech', 'Thermodynamics', 'below_40', 'youtube', 'Thermodynamics Basics', 'https://www.youtube.com/watch?v=8N1BxHgsoOw'),
('mech', 'Thermodynamics', 'below_40', 'certification', 'Thermodynamics Introduction', 'https://www.coursera.org/learn/thermodynamics'),
('mech', 'Thermodynamics', '40_to_80', 'youtube', 'Heat Engines and Cycles', 'https://www.youtube.com/watch?v=8N1BxHgsoOw'),
('mech', 'Thermodynamics', '40_to_80', 'course', 'Applied Thermodynamics', 'https://www.udemy.com/course/thermodynamics/'),
('mech', 'Thermodynamics', '40_to_80', 'project', 'Heat Engine Simulation', 'https://github.com/topics/thermodynamics'),
('mech', 'Thermodynamics', 'above_80', 'certification', 'Advanced Thermodynamics', 'https://www.coursera.org/learn/advanced-thermo'),
('mech', 'Thermodynamics', 'above_80', 'project', 'Power Plant Analysis', 'https://github.com/topics/power-plant');

-- Mech - Fluid Mechanics
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('mech', 'Fluid Mechanics', 'below_40', 'youtube', 'Fluid Mechanics Basics', 'https://www.youtube.com/watch?v=0cUKa2G4ZyQ'),
('mech', 'Fluid Mechanics', 'below_40', 'certification', 'Fluid Mechanics Introduction', 'https://www.coursera.org/learn/fluid-mechanics'),
('mech', 'Fluid Mechanics', '40_to_80', 'youtube', 'Bernoulli Principle', 'https://www.youtube.com/watch?v=TcMgkU3pFBY'),
('mech', 'Fluid Mechanics', '40_to_80', 'course', 'CFD Basics', 'https://www.udemy.com/course/cfd/'),
('mech', 'Fluid Mechanics', '40_to_80', 'project', 'Flow Simulation Project', 'https://github.com/topics/cfd'),
('mech', 'Fluid Mechanics', 'above_80', 'certification', 'Advanced Fluid Dynamics', 'https://www.coursera.org/learn/advanced-fluid'),
('mech', 'Fluid Mechanics', 'above_80', 'project', 'Turbulent Flow Analysis', 'https://github.com/topics/fluid-dynamics');

-- Mech - Machine Design
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('mech', 'Machine Design', 'below_40', 'youtube', 'Machine Design Basics', 'https://www.youtube.com/watch?v=O3vVyv7rqK0'),
('mech', 'Machine Design', 'below_40', 'certification', 'Introduction to Machine Design', 'https://www.coursera.org/learn/machine-design'),
('mech', 'Machine Design', '40_to_80', 'youtube', 'Design of Machine Elements', 'https://www.youtube.com/watch?v=O3vVyv7rqK0'),
('mech', 'Machine Design', '40_to_80', 'course', 'CAD and Design', 'https://www.udemy.com/course/cad-design/'),
('mech', 'Machine Design', '40_to_80', 'project', 'Gear Design Project', 'https://github.com/topics/machine-design'),
('mech', 'Machine Design', 'above_80', 'certification', 'Advanced Machine Design', 'https://www.coursera.org/learn/advanced-design'),
('mech', 'Machine Design', 'above_80', 'project', 'FEA Analysis Project', 'https://github.com/topics/fea');

-- Mech - Manufacturing Technology
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('mech', 'Manufacturing Technology', 'below_40', 'youtube', 'Manufacturing Processes Basics', 'https://www.youtube.com/watch?v=xy_oTfqF7Lo'),
('mech', 'Manufacturing Technology', 'below_40', 'certification', 'Manufacturing Introduction', 'https://www.coursera.org/learn/manufacturing'),
('mech', 'Manufacturing Technology', '40_to_80', 'youtube', 'CNC Machining', 'https://www.youtube.com/watch?v=xy_oTfqF7Lo'),
('mech', 'Manufacturing Technology', '40_to_80', 'course', 'Additive Manufacturing', 'https://www.udemy.com/course/3d-printing/'),
('mech', 'Manufacturing Technology', '40_to_80', 'project', '3D Printing Project', 'https://github.com/topics/3d-printing'),
('mech', 'Manufacturing Technology', 'above_80', 'certification', 'Advanced Manufacturing', 'https://www.coursera.org/learn/advanced-manufacturing'),
('mech', 'Manufacturing Technology', 'above_80', 'project', 'Smart Manufacturing System', 'https://github.com/topics/smart-manufacturing');

-- Mech - Strength of Materials
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('mech', 'Strength of Materials', 'below_40', 'youtube', 'Strength of Materials Basics', 'https://www.youtube.com/watch?v=oaywUWO4q0Y'),
('mech', 'Strength of Materials', 'below_40', 'certification', 'Materials Science Basics', 'https://www.coursera.org/learn/strength-materials'),
('mech', 'Strength of Materials', '40_to_80', 'youtube', 'Stress and Strain Analysis', 'https://www.youtube.com/watch?v=oaywUWO4q0Y'),
('mech', 'Strength of Materials', '40_to_80', 'course', 'Material Testing', 'https://www.udemy.com/course/material-testing/'),
('mech', 'Strength of Materials', '40_to_80', 'project', 'Stress Analysis Tool', 'https://github.com/topics/stress-analysis'),
('mech', 'Strength of Materials', 'above_80', 'certification', 'Advanced Materials', 'https://www.coursera.org/learn/advanced-materials'),
('mech', 'Strength of Materials', 'above_80', 'project', 'Composite Materials Analysis', 'https://github.com/topics/composites');

-- Civil - Structural Engineering
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('civil', 'Structural Engineering', 'below_40', 'youtube', 'Structural Engineering Basics', 'https://www.youtube.com/watch?v=44tJtmljBo0'),
('civil', 'Structural Engineering', 'below_40', 'certification', 'Introduction to Structures', 'https://www.coursera.org/learn/structural-engineering'),
('civil', 'Structural Engineering', '40_to_80', 'youtube', 'Beam Analysis and Design', 'https://www.youtube.com/watch?v=44tJtmljBo0'),
('civil', 'Structural Engineering', '40_to_80', 'course', 'Structural Analysis', 'https://www.udemy.com/course/structural-analysis/'),
('civil', 'Structural Engineering', '40_to_80', 'project', 'Bridge Design Project', 'https://github.com/topics/structural-design'),
('civil', 'Structural Engineering', 'above_80', 'certification', 'Advanced Structural Design', 'https://www.coursera.org/learn/advanced-structures'),
('civil', 'Structural Engineering', 'above_80', 'project', 'Seismic Analysis Project', 'https://github.com/topics/seismic');

-- Civil - Strength of Materials
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('civil', 'Strength of Materials', 'below_40', 'youtube', 'Strength of Materials for Civil', 'https://www.youtube.com/watch?v=oaywUWO4q0Y'),
('civil', 'Strength of Materials', 'below_40', 'certification', 'Materials for Construction', 'https://www.coursera.org/learn/materials-construction'),
('civil', 'Strength of Materials', '40_to_80', 'youtube', 'Stress Analysis in Construction', 'https://www.youtube.com/watch?v=oaywUWO4q0Y'),
('civil', 'Strength of Materials', '40_to_80', 'course', 'Material Properties', 'https://www.udemy.com/course/construction-materials/'),
('civil', 'Strength of Materials', '40_to_80', 'project', 'Material Testing Project', 'https://github.com/topics/material-testing'),
('civil', 'Strength of Materials', 'above_80', 'certification', 'Advanced Materials Science', 'https://www.coursera.org/learn/advanced-materials-science'),
('civil', 'Strength of Materials', 'above_80', 'project', 'Smart Materials Application', 'https://github.com/topics/smart-materials');

-- Civil - Concrete Technology
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('civil', 'Concrete Technology', 'below_40', 'youtube', 'Concrete Basics', 'https://www.youtube.com/watch?v=Gt-iEodjHpw'),
('civil', 'Concrete Technology', 'below_40', 'certification', 'Introduction to Concrete', 'https://www.coursera.org/learn/concrete'),
('civil', 'Concrete Technology', '40_to_80', 'youtube', 'Mix Design and Testing', 'https://www.youtube.com/watch?v=Gt-iEodjHpw'),
('civil', 'Concrete Technology', '40_to_80', 'course', 'Concrete Design', 'https://www.udemy.com/course/concrete-design/'),
('civil', 'Concrete Technology', '40_to_80', 'project', 'Mix Design Calculator', 'https://github.com/topics/concrete'),
('civil', 'Concrete Technology', 'above_80', 'certification', 'Advanced Concrete Technology', 'https://www.coursera.org/learn/advanced-concrete'),
('civil', 'Concrete Technology', 'above_80', 'project', 'Sustainable Concrete Research', 'https://github.com/topics/sustainable-concrete');

-- Civil - Soil Mechanics
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('civil', 'Soil Mechanics', 'below_40', 'youtube', 'Soil Mechanics Basics', 'https://www.youtube.com/watch?v=Gt-iEodjHpw'),
('civil', 'Soil Mechanics', 'below_40', 'certification', 'Introduction to Geotechnical', 'https://www.coursera.org/learn/soil-mechanics'),
('civil', 'Soil Mechanics', '40_to_80', 'youtube', 'Soil Properties and Testing', 'https://www.youtube.com/watch?v=Gt-iEodjHpw'),
('civil', 'Soil Mechanics', '40_to_80', 'course', 'Foundation Engineering', 'https://www.udemy.com/course/foundation-engineering/'),
('civil', 'Soil Mechanics', '40_to_80', 'project', 'Soil Analysis Tool', 'https://github.com/topics/soil-mechanics'),
('civil', 'Soil Mechanics', 'above_80', 'certification', 'Advanced Geotechnical', 'https://www.coursera.org/learn/advanced-geotechnical'),
('civil', 'Soil Mechanics', 'above_80', 'project', 'Slope Stability Analysis', 'https://github.com/topics/slope-stability');

-- Civil - Surveying
INSERT INTO learning_resources (stream, subject_name, performance_category, resource_type, resource_title, resource_url) VALUES
('civil', 'Surveying', 'below_40', 'youtube', 'Surveying Basics', 'https://www.youtube.com/watch?v=6uP8YQFZJqQ'),
('civil', 'Surveying', 'below_40', 'certification', 'Introduction to Surveying', 'https://www.coursera.org/learn/surveying'),
('civil', 'Surveying', '40_to_80', 'youtube', 'GPS and Modern Surveying', 'https://www.youtube.com/watch?v=6uP8YQFZJqQ'),
('civil', 'Surveying', '40_to_80', 'course', 'GIS Applications', 'https://www.udemy.com/course/gis/'),
('civil', 'Surveying', '40_to_80', 'project', 'Survey Data Processing', 'https://github.com/topics/surveying'),
('civil', 'Surveying', 'above_80', 'certification', 'Advanced Surveying', 'https://www.coursera.org/learn/advanced-surveying'),
('civil', 'Surveying', 'above_80', 'project', 'Drone Surveying System', 'https://github.com/topics/drone-surveying');

-- Create indexes for better performance
CREATE INDEX idx_exams_user_id ON exams(user_id);
CREATE INDEX idx_exams_subject_id ON exams(subject_id);
CREATE INDEX idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_improvement_tracking_user_id ON improvement_tracking(user_id);

COMMIT;

-- Display success message
SELECT 'Database setup completed successfully!' as message;