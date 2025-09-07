# Autonomous Family Network Activation Epic

This implementation provides an AI-powered system that proactively identifies at-risk students, maps their family support networks, and orchestrates culturally-aware interventions to provide support.

## 🏗️ Architecture Overview

### Tech Stack Adaptation
This implementation adapts the original AWS-based Epic to work with the existing SEA Bridge tech stack:

- **Database**: Supabase PostgreSQL with new tables `family_networks` and `interventions`
- **AI Processing**: Google Genkit with Gemini 2.5 Flash (instead of AWS Bedrock)
- **Event System**: Supabase Realtime (instead of AWS SQS)
- **Server Logic**: Next.js Server Actions (instead of AWS Lambda)
- **SMS Handling**: Webhook-based approach (instead of AWS SNS)

## 📊 Database Schema

### New Tables

#### `family_networks`
Stores extracted family network information from conversations:
```sql
- id: UUID (primary key)
- contact_link_id: UUID (references contacts.id)
- family_data: JSONB (family members with roles, phones, languages)
- cultural_context: JSONB (decision makers, communication styles)
- extracted_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `interventions`
Logs all autonomous interventions and their status:
```sql
- id: UUID (primary key)
- contact_link_id: UUID (references contacts.id)
- trigger_reason: TEXT (why intervention was triggered)
- risk_level: TEXT (low/medium/high)
- target_family_member: JSONB (selected family member details)
- message_content: TEXT (generated SMS message)
- delivery_method: TEXT (sms)
- delivery_status: TEXT (pending/sent/delivered/replied)
- response_content: TEXT (family reply)
- response_received_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

## 🤖 AI Flows

### 1. Risk Assessment (`assess-student-risk.ts`)
Analyzes attendance records and chat history to identify learning risks:

**Input:**
- Recent attendance records
- Chat history between teacher and parent
- Student name

**Output:**
- Risk level (none/low/medium/high)
- Trigger reason (detailed explanation)
- Recommended action

### 2. Family Network Extraction (`extract-family-network.ts`)
Maps family support network from conversations:

**Input:**
- Chat history
- Parent phone number
- Student name

**Output:**
- Family members (name, role, phone, language, influence level)
- Cultural context (decision maker, communication style, cultural notes)

### 3. Cultural SMS Generation (`generate-cultural-sms.ts`)
Creates culturally appropriate SMS messages in local languages:

**Input:**
- Student name and help needed
- Recipient details (name, role, language)
- Communication style and cultural context

**Output:**
- SMS text (under 160 characters)
- Translation (if not in English)

## ⚡ Autonomous Process Flow

### Phase 1: Risk Detection Triggers
The system monitors for risk indicators through multiple triggers:

1. **Scheduled Assessment** (`runScheduledRiskAssessments()`)
   - Daily scan of all active contacts
   - Analyzes recent attendance and communication patterns

2. **Event-Based Triggers**
   - `onAttendanceUpdate()`: Triggered when attendance is recorded
   - `onMessageSent()`: Triggered when concerning patterns detected

3. **Manual Triggers**
   - Teachers can manually trigger assessments from dashboard

### Phase 2: Risk Assessment Process
When triggered, the system:

1. Fetches recent attendance data (last 10 days)
2. Gathers recent messages (last 20 messages)
3. Calls AI risk assessment flow
4. If medium/high risk detected, proceeds to intervention

### Phase 3: Family Network Analysis
For at-risk students:

1. Checks if family network already mapped
2. If not, extracts family information from chat history
3. Stores family network data in database
4. Selects best family member based on:
   - High influence level
   - Available phone number
   - Role priority (grandparents > aunts/uncles > siblings)

### Phase 4: SMS Intervention
When suitable family member found:

1. Generates culturally appropriate SMS using AI
2. Creates intervention record in database
3. Sends SMS (placeholder - integration needed)
4. Monitors for replies via webhook

### Phase 5: Response Handling
When family responds:

1. SMS webhook processes reply
2. Updates intervention status
3. Notifies primary parent of family activation
4. Updates teacher dashboard in real-time

## 🎛️ User Interface

### Teacher Dashboard Integration
- **Interventions Panel**: Shows all active family interventions
- **Real-time Updates**: Live status updates via Supabase Realtime
- **Manual Triggers**: Teachers can trigger risk assessments

### Chat Interface Enhancement
- **Family Support Tab**: Shows interventions for specific student
- **Intervention History**: View past interventions and responses
- **Quick Actions**: Trigger new assessments directly from chat

## 📱 SMS Integration

### Webhook Endpoint
- **URL**: `/api/webhooks/sms`
- **Methods**: POST (receive replies), GET (verification)
- **Processing**: Automated response parsing and intervention updates

### SMS Provider Integration
The system is designed to work with various SMS providers:
- Twilio
- AWS SNS
- Local providers (Globe, Smart for Philippines)

## 🔧 Configuration

### Environment Variables
Standard SEA Bridge variables plus:
- SMS provider credentials (when integrated)
- Webhook verification tokens

### Cultural Language Support
Currently configured for:
- **Cebuano** (`ceb`): Filipino grandmother/grandfather communications
- **Tagalog** (`tgl`): Filipino formal communications  
- **Vietnamese** (`vie`): Vietnamese family communications
- **English** (`eng`): Default fallback

## 🧪 Testing & Demo

### Demo Script
Run the demonstration:
```bash
npx tsx src/lib/demo/autonomous-intervention-demo.ts
```

This will show:
1. Risk assessment of sample student data
2. Family network extraction from chat history
3. Cultural SMS generation in appropriate language
4. Simulated family response processing

### Sample Data
The demo uses realistic Southeast Asian family scenarios:
- Filipino family with "Lola Rosa" (grandmother) and "Tito John" (uncle)
- Attendance issues due to family circumstances
- Cebuano language SMS generation
- Positive family response patterns

## 🚀 Production Deployment

### Prerequisites
1. Database migration applied (new tables created)
2. SMS provider configured
3. Webhook endpoint accessible
4. AI model access (Google Gemini API key)

### Monitoring
- Intervention success rates
- Family response rates by language/culture
- Risk assessment accuracy
- SMS delivery rates

## 🔮 Future Enhancements

### Phase 5 Potential Additions
1. **WhatsApp Integration**: Support for popular messaging platform
2. **Voice Calls**: Automated voice interventions for urgent cases
3. **Community Leaders**: Integration with local community leaders
4. **Predictive Analytics**: ML models for risk prediction
5. **Multi-Language Chat**: Real-time translation in family group chats

### Advanced AI Features
1. **Sentiment Analysis**: Monitor family stress levels
2. **Cultural Adaptation**: Learn family-specific preferences
3. **Resource Matching**: Connect families with local resources
4. **Progress Tracking**: Long-term student outcome analysis

## 📈 Success Metrics

### Key Performance Indicators
- **Risk Detection Accuracy**: % of correctly identified at-risk students
- **Family Activation Rate**: % of families that respond positively
- **Student Improvement**: Attendance improvement after intervention
- **Cultural Appropriateness**: Family satisfaction with communication style
- **Response Time**: Speed from risk detection to family engagement

### Cultural Success Factors
- Language-appropriate messaging
- Respect for family hierarchy
- Timing considerations (cultural events, work schedules)
- Community integration and trust building

---

This implementation provides a foundation for autonomous family network activation that respects Southeast Asian cultural values while leveraging modern AI technology for educational support.