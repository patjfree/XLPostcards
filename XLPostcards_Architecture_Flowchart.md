# XLPostcards App Architecture & API Flow

## Main User Flow

```mermaid
flowchart TD
    Start([User Opens App]) --> SelectPhoto[Select Photo from Gallery]
    SelectPhoto --> WriteMessage[Write Custom Message]
    WriteMessage --> AddAddress[Add Recipient Address]
    AddAddress --> Preview[Preview Postcard]
    Preview --> Payment[Initiate Payment]
    Payment --> Generate[Generate Postcard Images]
    Generate --> SendStannp[Send to Stannp API]
    SendStannp --> Success[Show Success Modal]
    Success --> End([Postcard Mailed])
```

## Detailed API & Webhook Architecture

```mermaid
flowchart TB
    %% User Interface
    App[📱 XLPostcards App<br/>React Native + Expo] 
    
    %% Payment Flow
    App --> |1. Purchase Request| IAP[🍎 iOS In-App Purchase<br/>React Native IAP]
    IAP --> |2. Purchase Receipt| Stripe[💳 Stripe Payment Processing<br/>stripe-react-native]
    Stripe --> |3. Payment Intent| StripeWebhook[🔗 Stripe Webhook<br/>→ N8N Payment Processor]
    
    %% Image Generation Flow  
    App --> |4. Generate Request| N8NBack[🎨 N8N Postcard Back Generator<br/>Webhook: generate-postcard-back-unified]
    N8NBack --> |5. Python PIL Rendering| BackImage[🖼️ Postcard Back Image<br/>JPEG with Text & Address]
    BackImage --> |6. Upload| Cloudinary[☁️ Cloudinary CDN<br/>Image Storage & Optimization]
    
    %% Front Image Processing
    App --> |7. Scale & Process| FrontGen[🔧 Client-side Front Generation<br/>Expo ImageManipulator]
    FrontGen --> |8. Scaled Image| LocalFront[📁 Local Front Image<br/>JPEG with Bleed]
    
    %% Stannp Integration
    Cloudinary --> |9. Direct URL| StannpAPI[📮 Stannp Print API<br/>api-us1.stannp.com/v1/postcards/create]
    LocalFront --> |10. File Upload| StannpAPI
    App --> |11. FormData Request| StannpAPI
    
    %% Final Processing
    StannpAPI --> |12. Print Job Created| PrintSuccess[✅ Postcard Queued for Print]
    PrintSuccess --> |13. Status Response| App
    
    %% Error Handling
    StannpAPI --> |❌ API Error| ErrorHandler[⚠️ Error Handler<br/>Transaction Cleanup]
    ErrorHandler --> App
    
    %% External Services
    OpenAI[🤖 OpenAI API<br/>AI Message Generation] --> |Optional| WriteMessage
    
    %% State Management
    ZustandStore[🗃️ Zustand Stores<br/>• postcardStore<br/>• imageStore<br/>• addressStore<br/>• paymentStore] <--> App
    
    %% Local Storage
    AsyncStorage[💾 AsyncStorage<br/>• Transaction States<br/>• Address Book<br/>• User Preferences] <--> App

    %% Styling
    classDef apiService fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef webhook fill:#f3e5f5,stroke:#4a148c,stroke-width:2px  
    classDef storage fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef userInterface fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef processing fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    
    class IAP,Stripe,StannpAPI,OpenAI apiService
    class StripeWebhook,N8NBack webhook
    class Cloudinary,AsyncStorage,ZustandStore storage
    class App userInterface  
    class FrontGen,BackImage,LocalFront processing
```

## API Integration Details

### 1. **Payment Processing APIs**
```mermaid
sequenceDiagram
    participant App
    participant IAP as iOS In-App Purchase
    participant Stripe as Stripe SDK
    participant N8N as N8N Webhook
    participant Backend as Payment Backend
    
    App->>IAP: requestPurchase()
    IAP->>App: purchase receipt
    App->>Stripe: createPaymentIntent()
    Stripe->>N8N: webhook trigger
    N8N->>Backend: process payment
    Backend->>App: payment confirmed
    App->>App: proceed to postcard creation
```

### 2. **Postcard Generation APIs**
```mermaid
sequenceDiagram
    participant App
    participant N8N as N8N Postcard Generator
    participant Python as Python PIL Engine
    participant Cloudinary as Cloudinary CDN
    participant Stannp as Stannp Print API
    
    App->>N8N: POST /generate-postcard-back-unified
    Note over App,N8N: {message, recipientInfo, postcardSize}
    
    N8N->>Python: execute postcard rendering
    Python->>Python: create canvas, add text/address
    Python->>N8N: return JPEG base64
    
    N8N->>Cloudinary: upload image
    Cloudinary->>N8N: return secure_url
    N8N->>App: {success: true, postcard_back_url}
    
    App->>App: scale front image locally
    App->>Stannp: POST /postcards/create
    Note over App,Stannp: FormData: front (file), back (URL)
    
    Stannp->>Cloudinary: fetch back image
    Stannp->>App: {success: true, id: 176508872}
```

### 3. **Data Flow Architecture**
```mermaid
flowchart LR
    %% Input Data
    UserPhoto[📷 User Photo] --> ImageStore[🗃️ Image Store]
    UserMessage[✍️ Custom Message] --> MessageStore[🗃️ Message Store] 
    RecipientInfo[📮 Recipient Address] --> AddressStore[🗃️ Address Store]
    
    %% Processing Layer
    ImageStore --> ServerGen[🎨 Server Generation<br/>N8N + Python PIL]
    MessageStore --> ServerGen
    AddressStore --> ServerGen
    
    ImageStore --> ClientGen[🔧 Client Generation<br/>Expo ImageManipulator]
    
    %% Output Layer
    ServerGen --> CloudinaryURL[☁️ Cloudinary URL<br/>postcard-back.jpg]
    ClientGen --> LocalFile[📁 Local File<br/>front-scaled.jpg]
    
    %% API Integration
    CloudinaryURL --> StannpFormData[📮 Stannp FormData]
    LocalFile --> StannpFormData
    StannpFormData --> PrintJob[🖨️ Print Job Created]
    
    %% State Management
    PaymentStore[💳 Payment Store] --> TransactionID[🆔 Transaction ID]
    TransactionID --> ServerGen
    TransactionID --> PostcardService[📋 Postcard Service<br/>Transaction Tracking]
```

## Environment & Configuration

### **API Keys & Webhooks**
| Service | Environment Variable | Usage |
|---------|---------------------|-------|
| Stannp API | `STANNP_API_KEY` | Print postcards |
| Stripe | `STRIPE_PUBLISHABLE_KEY_TEST/LIVE` | Payment processing |
| OpenAI | `OPENAI_API_KEY` | AI message generation |
| N8N Webhook | `n8nPostcardBackWebhookUrl` | Server-side image generation |
| Cloudinary | Built into N8N workflow | Image storage/CDN |

### **Build Variants**
- **Development**: Test mode enabled, simulator builds
- **Preview**: Preview builds for testing  
- **Production**: Live API keys, production builds

## Key Performance Optimizations

### **Before Optimization**
```mermaid
flowchart LR
    N8N[N8N Generator] --> Cloudinary[Cloudinary Storage]
    Cloudinary --> Download[📥 Download to Local]
    Download --> Scale[🔄 Scale Image Again]  
    Scale --> Upload[📤 Upload to Stannp]
    Upload --> Timeout[⏰ Timeout Issues]
```

### **After Optimization** ✅
```mermaid
flowchart LR
    N8N[N8N Generator<br/>JPEG Output] --> Cloudinary[Cloudinary Storage]
    Cloudinary --> Direct[🔗 Direct URL to Stannp]
    Direct --> Success[✅ Fast Processing]
```

## Error Handling & Recovery

```mermaid
flowchart TD
    Start[API Request] --> Success{Success?}
    Success -->|Yes| Complete[✅ Complete Flow]
    Success -->|No| ErrorType{Error Type}
    
    ErrorType -->|Network| Retry[🔄 Retry Request]
    ErrorType -->|Timeout| Cleanup[🧹 Clean Transaction]  
    ErrorType -->|API Error| Log[📝 Log Error]
    
    Retry --> MaxRetries{Max Retries?}
    MaxRetries -->|No| Start
    MaxRetries -->|Yes| Fallback[🔀 Fallback Method]
    
    Cleanup --> UserNotify[📱 Notify User]
    Log --> UserNotify
    Fallback --> UserNotify
    
    UserNotify --> End[❌ Show Error Modal]
```

This architecture ensures reliable postcard creation with multiple fallback mechanisms and comprehensive error handling across all API integrations.