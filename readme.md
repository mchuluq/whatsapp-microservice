# WhatsApp Bulk Sender Microservice
A Node.js microservice for sending bulk WhatsApp messages with support for text, media, and documents.

### Features
- 🚀 Bulk message sending
- 📱 Multi-session support
- 📨 Message types:
    -    Text messages
    -    Media (images, videos, audio)
    - Documents
- 🔄 Queue system with retry mechanism
- 📊 Queue monitoring
- 🔒 Session management
- 📝 Logging system

#### Requirements
- Node.js v16 or higher
- Redis server

### Installation

```
# Clone repository
git clone https://github.com/mchuluq/whatsapp-micro-service.git

# Install dependencies
cd whatsapp-micro-service
npm install
```


### Configuration
Create `.env` by copying `.env.example`


### Development

```
# Run in development mode
npm run dev

# Run tests
npm test

# Run in production
npm start
```