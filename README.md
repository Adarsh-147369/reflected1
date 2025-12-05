# Adaptive Learning Platform

An AI-powered educational platform that provides personalized learning experiences for engineering students across multiple streams (CSE, ECE, EEE, Mechanical, Civil). The platform generates AI-powered exams, evaluates student performance using SBERT semantic similarity, and recommends tailored learning resources based on performance metrics.

## Features

- **AI-Powered Question Generation**: Uses OpenRouter API (DeepSeek model) to generate unique exam questions
- **Intelligent Answer Evaluation**: SBERT-based semantic similarity for descriptive answers
- **Full-Screen Exam Mode**: Anti-cheat system with tab switch detection
- **Performance-Based Recommendations**: Personalized learning resources based on exam scores
- **Progress Tracking**: Track resource completion and improvement over time
- **Improvement Visualization**: Charts and analytics showing student progress
- **Admin Dashboard**: Monitor overall platform performance and student statistics

## Technology Stack

### Backend
- Node.js with Express.js
- PostgreSQL database
- OpenRouter API (DeepSeek model)
- JWT authentication with bcrypt
- Python Flask microservice for SBERT evaluation

### Frontend
- React 18.2
- React Router for navigation
- Axios for API communication
- Recharts for data visualization
- Fullscreen API for exam mode

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
- **Python** (v3.8 or higher) - [Download](https://www.python.org/downloads/)
- **pip** (Python package manager)
- **Git** - [Download](https://git-scm.com/)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd adaptive-learning-platform
```

### 2. Database Setup

1. Create a PostgreSQL database:
```bash
psql -U postgres
CREATE DATABASE adaptive_learning_db;
\q
```

2. Run the database setup script:
```bash
psql -U postgres -d adaptive_learning_db -f database/setup.sql
```

This will create all tables, insert subjects, and populate learning resources.

### 3. Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=adaptive_learning_db
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# OpenRouter API Configuration
OPENAI_API_KEY=your_openrouter_api_key_here
OPENAI_MODEL=deepseek/deepseek-chat-v3.1:free

# Python SBERT Service
SBERT_SERVICE_URL=http://localhost:5001

# CORS Origin
CORS_ORIGIN=http://localhost:3000
```

5. Get your OpenRouter API key:
   - Visit [https://openrouter.ai/keys](https://openrouter.ai/keys)
   - Sign up and create an API key
   - Add it to your `.env` file

### 4. Frontend Setup

1. Navigate to the frontend directory:
```bash
cd ../frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Update the `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 5. Python SBERT Service Setup

1. Navigate to the root directory:
```bash
cd ..
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

Or using pip3:
```bash
pip3 install -r requirements.txt
```

## Running the Application

You need to start three services in separate terminal windows:

### Terminal 1: Start the Backend Server

```bash
cd backend
npm start
```

The backend will run on `http://localhost:5000`

### Terminal 2: Start the SBERT Service

```bash
python sbert_service.py
```

Or:
```bash
python3 sbert_service.py
```

The SBERT service will run on `http://localhost:5001`

### Terminal 3: Start the Frontend

```bash
cd frontend
npm start
```

The frontend will run on `http://localhost:3000`

## Default Admin Credentials

After running the database setup, you can log in as admin with:

- **Email**: adarshreddy532@gmail.com
- **Password**: admin123

**Important**: Change the admin password after first login!

## Usage Guide

### For Students

1. **Register**: Create an account by selecting your engineering stream
2. **Take Exam**: Select a subject and start an exam
   - Exam will enter fullscreen mode
   - 30-minute timer will start
   - Tab switching will auto-submit the exam
3. **View Results**: See your score and performance category
4. **Access Resources**: Get personalized learning materials based on your score:
   - Score ≤ 40%: YouTube videos + Basic certifications
   - Score 40-80%: YouTube videos + Advanced courses + Basic projects
   - Score ≥ 80%: Advanced certifications + Advanced projects
5. **Track Progress**: Mark resources as completed and track your improvement
6. **Retake Exams**: Retake exams after completing resources to see improvement

### For Admins

1. **Login**: Use admin credentials
2. **View Dashboard**: See overall platform statistics
3. **Monitor Performance**: View student performance and improvement metrics
4. **Manage Resources**: Add new learning resources for students

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new student
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get user profile

### Exams
- `POST /api/exams/start` - Start new exam
- `POST /api/exams/submit` - Submit exam answers
- `GET /api/exams/history` - Get exam history
- `GET /api/exams/evaluation/:examId` - Get detailed evaluation

### Resources
- `GET /api/resources/subject/:subjectId` - Get resources for subject
- `PUT /api/resources/progress/:resourceId` - Update resource progress

### Progress
- `GET /api/progress/improvement` - Get improvement data
- `GET /api/progress/user` - Get user progress

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/improvement` - Get overall improvement
- `GET /api/admin/statistics` - Get subject statistics
- `POST /api/admin/resources` - Add new resource

## Project Structure

```
adaptive-learning-platform/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── examController.js
│   │   ├── resourceController.js
│   │   ├── progressController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── examRoutes.js
│   │   ├── resourceRoutes.js
│   │   ├── progressRoutes.js
│   │   └── adminRoutes.js
│   ├── services/
│   │   ├── openRouterService.js
│   │   ├── aiQuestionGenerator.js
│   │   └── sbertEvaluator.js
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Admin/
│   │   │   ├── Auth/
│   │   │   ├── Common/
│   │   │   └── Student/
│   │   ├── context/
│   │   ├── styles/
│   │   ├── utils/
│   │   ├── App.js
│   │   └── index.js
│   ├── .env
│   ├── .env.example
│   └── package.json
├── database/
│   └── setup.sql
├── sbert_service.py
├── requirements.txt
└── README.md
```

## Troubleshooting

### Database Connection Issues

If you get database connection errors:
1. Verify PostgreSQL is running
2. Check database credentials in `backend/.env`
3. Ensure the database exists: `psql -U postgres -l`

### OpenRouter API Issues

If question generation fails:
1. Verify your API key is correct in `backend/.env`
2. Check your OpenRouter account has credits
3. Test the API key at [https://openrouter.ai/](https://openrouter.ai/)

### SBERT Service Issues

If descriptive answer evaluation fails:
1. Ensure Python dependencies are installed: `pip install -r requirements.txt`
2. Check if the service is running on port 5001
3. Verify the SBERT_SERVICE_URL in `backend/.env`

### Port Already in Use

If you get "port already in use" errors:
- Backend (5000): `lsof -ti:5000 | xargs kill -9` (Mac/Linux) or `netstat -ano | findstr :5000` (Windows)
- Frontend (3000): `lsof -ti:3000 | xargs kill -9` (Mac/Linux) or `netstat -ano | findstr :3000` (Windows)
- SBERT (5001): `lsof -ti:5001 | xargs kill -9` (Mac/Linux) or `netstat -ano | findstr :5001` (Windows)

## Development

### Running in Development Mode

Backend with auto-reload:
```bash
cd backend
npm run dev
```

Frontend with hot reload:
```bash
cd frontend
npm start
```

### Testing

Run backend tests:
```bash
cd backend
npm test
```

Run frontend tests:
```bash
cd frontend
npm test
```

## Performance Optimization

- Question generation: < 10 seconds
- Answer evaluation: < 5 seconds
- Dashboard load: < 2 seconds
- Chart rendering: < 1 second

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT tokens with 24-hour expiration
- Role-based access control (RBAC)
- SQL injection prevention
- CORS configuration
- Fullscreen enforcement for exams
- Tab switch monitoring

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Create an issue on GitHub
- Email: support@adaptivelearning.com

## Acknowledgments

- OpenRouter for AI question generation
- Sentence-BERT for semantic similarity evaluation
- React and Express.js communities
