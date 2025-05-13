# API Endpoints

## Core Endpoints

### Health Check
```http
GET /api/health
```
Returns service health status information.

### API Information
```http
GET /api
```
Returns general API information and available endpoints.

## Session Management
```http
POST /api/sessions (unit_id)
GET /api/sessions
GET /api/sessions/:unitId
GET /api/sessions/:unitId/qr
DELETE /api/sessions/:unitId
```
Handles WhatsApp session operations (see `sessionRoutes.js` for detailed endpoints)

## Message Operations
```http
POST /api/messages/send (unit_id,recipients,message,media,document,debug_mode)
GET /api/messages/queue
GET /api/messages/queue/:unitId
DELETE /api/messages/queue/:unitId

```