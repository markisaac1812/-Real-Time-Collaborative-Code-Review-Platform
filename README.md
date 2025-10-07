# 🚀 CodeReview Platform

> A production-ready, real-time collaborative code review platform built with modern backend technologies

A comprehensive platform where developers can submit code for review, receive detailed feedback, and collaborate in real-time. Think **GitHub Pull Requests** meets **Stack Overflow** with **Slack's real-time features**.

### 🎯 Built for Recruiters

This project demonstrates **senior-level backend development skills** including:
- ⚡ Real-time WebSocket communication
- 🔄 Background job processing
- 📊 Redis caching strategies
- 🧪 Comprehensive testing
- 📚 Production-ready architecture

---

## ✨ Key Features

### 🔐 Authentication & Authorization
- JWT access tokens + HTTP-only refresh tokens
- Role-based access control (User, Moderator, Admin)
- Secure password hashing with bcrypt
- Token refresh mechanism

### 📝 Code Review System
- **Submit code** in 15+ programming languages
- **Line-by-line comments** with severity levels (info, warning, error)
- **Multi-category ratings** (Code Quality, Performance, Security, Maintainability, Best Practices)
- **Review suggestions** with code examples
- **Reviewer assignment** (manual + auto-assign based on skills)

### 💬 Social & Collaboration
- **Nested comments** (Reddit-style threading)
- **Real-time notifications** via WebSocket
- **User following** system
- **Activity feeds** from followed users
- **Reputation system** with automatic level calculation
- **Leaderboards** (top contributors, reviewers, authors)

### ⚡ Real-time Features
- **Live commenting** - See comments as they're typed
- **Presence indicators** - Know who's online
- **Typing indicators** - See when others are typing
- **Live notifications** - Instant push notifications
- **Room-based collaboration** - Multi-user review sessions

### 🔍 Advanced Search & Analytics
- **Full-text search** across submissions
- **Advanced filtering** (language, tags, category, date range, rating)
- **User statistics** (submissions, reviews, reputation trends)
- **Platform analytics** (daily metrics, language popularity, top tags)

### 🚀 Performance & Scalability
- **Redis caching** - Multi-layer caching strategy
- **Database indexing** - 25+ strategic indexes
- **Background jobs** - Bull.js queue system
- **Rate limiting** - Redis-based rate limiting
- **Response compression** - Gzip compression
- **Query optimization** - Aggregation pipelines

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  (Web, Mobile, API Consumers)                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway (Express.js)                    │
│  • Authentication Middleware                                 │
│  • Rate Limiting                                             │
│  • Request Validation                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──────────┬──────────┬──────────┬─────────┐
             ▼          ▼          ▼          ▼         ▼
      ┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐
      │  Auth    │ │Submiss-│ │Reviews │ │Comments│ │Social│
      │Controller│ │  ions  │ │        │ │        │ │      │
      └──────────┘ └────────┘ └────────┘ └────────┘ └──────┘
             │          │          │          │         │
             └──────────┴──────────┴──────────┴─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐  ┌─────────┐  ┌──────────┐
              │ MongoDB  │  │  Redis  │  │Socket.IO │
              │(Database)│  │(Cache)  │  │(Real-time)│
              └──────────┘  └─────────┘  └──────────┘
                                  │
                                  ▼
                          ┌──────────────┐
                          │  Bull Queues │
                          │(Background)  │
                          └──────────────┘
```

---

## 🛠️ Tech Stack

### Core Technologies
| Technology | Purpose | Why? |
|------------|---------|------|
| **Node.js** | Runtime | Non-blocking I/O for real-time features |
| **Express.js** | Web Framework | Industry standard, middleware ecosystem |
| **MongoDB** | Database | Flexible schema for evolving features |
| **Redis** | Cache/Sessions | Sub-millisecond response times |
| **Socket.io** | WebSockets | Real-time bidirectional communication |
| **Bull.js** | Job Queue | Reliable background job processing |
| **Jest** | Testing | Comprehensive test coverage |
| **Swagger** | Documentation | Industry-standard API docs |

### Key Libraries
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT authentication
- **joi** - Input validation
- **mongoose** - MongoDB ODM
- **ioredis** - Redis client
- **nodemailer** - Email notifications
- **compression** - Response compression

---

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- MongoDB 7.0+
- Redis 7.0+
- npm or yarn



## 📖 API Documentation

**Complete API Documentation:** [https://documenter.getpostman.com/view/46123474/2sB3QGvBtd](https://documenter.getpostman.com/view/46123474/2sB3QGvBtd)

### Quick API Overview

```bash
# Authentication
POST   /api/auth/signup          # Register new user
POST   /api/auth/login           # Login user
POST   /api/auth/refresh         # Refresh access token
POST   /api/auth/logout          # Logout user

# Code Submissions
GET    /api/submissions          # List all submissions
POST   /api/submissions          # Create submission
GET    /api/submissions/:id      # Get submission details
PATCH  /api/submissions/:id      # Update submission
DELETE /api/submissions/:id      # Delete submission
GET    /api/submissions/search   # Search submissions

# Reviews
POST   /api/reviews/submission/:id        # Create review
GET    /api/reviews/submission/:id        # Get submission reviews
PATCH  /api/reviews/:id                   # Update review
POST   /api/reviews/:id/helpful           # Mark review helpful

# Comments
POST   /api/comments/review/:id           # Add comment
GET    /api/comments/review/:id           # Get comments (nested)
POST   /api/comments/:id/react            # React to comment

# Social
POST   /api/social/follow/:userId         # Follow user
GET    /api/social/feed/activity          # Get activity feed
GET    /api/social/:userId/stats          # Get user stats

# Real-time
WS     /                                   # WebSocket connection
Event  join:submission                     # Join submission room
Event  comment:create                      # Real-time comment
Event  typing:start                        # Typing indicator
```

### Example Request

```bash
# Create a code submission
curl -X POST http://localhost:5000/api/submissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "React Custom Hook",
    "description": "Need feedback on my useAPI hook",
    "code": "const useAPI = (url) => { ... }",
    "language": "javascript",
    "tags": ["react", "hooks"]
  }'
```

---

## 🎯 What Makes This Special?

### For Backend Engineers
- ✅ **Scalable Architecture** - Designed for horizontal scaling
- ✅ **Production Patterns** - Caching, queues, real-time
- ✅ **Clean Code** - MVC pattern, separation of concerns
- ✅ **Testing** - Unit, integration, E2E tests
- ✅ **Documentation** - Code comments, API docs, README

### For System Design
- 🏗️ **Microservice-Ready** - Modular architecture
- 🔄 **Event-Driven** - Background jobs, webhooks
- 📊 **Monitoring** - Performance metrics, health checks
- 🔒 **Security-First** - Authentication, authorization, rate limiting

### For Product Thinking
- 🎨 **UX Focused** - Real-time features, instant feedback
- 📱 **API-First** - Mobile/web clients supported
- 🌐 **Scalable** - Handles growth without rewrites
- 🔧 **Maintainable** - Easy to extend and modify

---

## 🐛 Known Issues & Limitations

- WebSocket scaling requires Redis adapter (ready to implement)
- Email service requires SMTP configuration
- File uploads limited to 10MB (configurable)
- Search limited to MongoDB text search (Elasticsearch ready)
---

## 👤 Author

**Mark Isaac**
- GitHub: [@markisaac1812](https://github.com/markisaac1812)
---

## 🙏 Acknowledgments

Built as a comprehensive demonstration of modern backend development practices, showcasing:
- Real-time collaboration features
- Scalable architecture patterns
- Production-ready code quality
- Comprehensive testing strategies

---

## 📞 Contact & Questions

Have questions about the architecture or implementation? 

**Email:** markisaac695@gmail.com

---

<div align="center">

### ⭐ Star this repo if you find it helpful!

**Made with ❤️ and lots of ☕**

</div>
