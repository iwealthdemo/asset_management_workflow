# Internet Deployment Guide for Vector Store API

This guide shows you how to deploy your Python Vector Store API service to the Internet so it can be accessed from Google Colab, Jupyter notebooks, or any other application worldwide.

## 🚀 Deployment Options

### Option 1: Replit Deployments (Easiest)

**Steps:**
1. **In your Replit project**: Click the "Deploy" button in the top toolbar
2. **Choose deployment type**: Select "Autoscale" for automatic scaling
3. **Configure environment**: Add your `OPENAI_API_KEY` in the secrets
4. **Deploy**: Your service will be live at `https://your-project-name.replit.app`

**URL Format:** `https://[your-replit-username]-[project-name].replit.app`

**Example:**
- If your username is `johndoe` and project is `vector-store-api`
- Your API will be at: `https://johndoe-vector-store-api.replit.app`

### Option 2: Docker Deployment

**Files provided:**
- `Dockerfile` - Container definition
- `docker-compose.yml` - Service orchestration  
- `.dockerignore` - Exclude unnecessary files

**Local testing:**
```bash
# Build and run locally
docker-compose up --build

# Test the service
curl http://localhost:5001/health
```

**Deploy to cloud:**
- **AWS ECS/Fargate**: Use AWS console or CDK
- **Google Cloud Run**: `gcloud run deploy`
- **Azure Container Instances**: Use Azure portal
- **DigitalOcean**: Use their container service

### Option 3: Direct Cloud Deployment

**Heroku:**
```bash
# Add Procfile
echo "web: cd python_services && python vector_store_service.py" > Procfile
git add . && git commit -m "Add Heroku config"
heroku create your-app-name
heroku config:set OPENAI_API_KEY=your_key
git push heroku main
```

**Railway:**
```bash
# Railway automatically detects Python apps
railway login
railway new
railway add
railway deploy
```

## 🔧 Configuration for Internet Access

### Environment Variables (Required)
```bash
OPENAI_API_KEY=your_openai_api_key
DEFAULT_VECTOR_STORE_ID=your_vector_store_id  # Optional
PYTHON_API_PORT=5001
```

### Port Configuration
- **Development**: `localhost:5001`
- **Production**: Port 80 or 443 (handled by deployment platform)

## 📱 Testing from Google Colab

Once deployed, test your API from Google Colab:

```python
import requests

# Replace with your actual deployment URL
API_URL = "https://your-service.replit.app"

# Test health
response = requests.get(f"{API_URL}/health")
print(response.json())

# Upload a file
result = requests.post(f"{API_URL}/upload_and_attach", json={
    "file_path": "/content/your-document.pdf",
    "attributes": {
        "source": "google_colab",
        "experiment": "research_project_alpha"
    }
})
print(result.json())
```

## 🌍 Usage from Any Application

### JavaScript (Web Browser)
```javascript
fetch('https://your-service.replit.app/upload_and_attach', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        file_path: '/path/to/document.pdf',
        attributes: {source: 'web_app', user: 'john@example.com'}
    })
})
.then(response => response.json())
.then(data => console.log(data));
```

### Python (Any Python Environment)
```python
import requests
response = requests.post('https://your-service.replit.app/upload_and_attach', 
    json={'file_path': '/path/to/file.pdf', 'attributes': {'source': 'python_script'}})
print(response.json())
```

### R
```r
library(httr)
library(jsonlite)

response <- POST(
    "https://your-service.replit.app/upload_and_attach",
    body = toJSON(list(
        file_path = "/path/to/document.pdf",
        attributes = list(source = "r_analysis")
    ), auto_unbox = TRUE),
    add_headers("Content-Type" = "application/json")
)

result <- content(response, "parsed")
print(result)
```

## 🔒 Security for Production

### Basic Security Setup
```python
# Add to your vector_store_service.py

from functools import wraps
import os

# Simple API key authentication
def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        if api_key != os.getenv('API_SECRET_KEY'):
            return jsonify({'error': 'Invalid API key'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Apply to endpoints
@app.route('/upload_and_attach', methods=['POST'])
@require_api_key
def upload_and_attach():
    # ... existing code
```

### Usage with API Key
```python
headers = {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-secret-api-key'
}
response = requests.post(API_URL + '/upload_and_attach', 
                        json=payload, headers=headers)
```

## 📊 Monitoring and Logging

Add monitoring to track usage:
```python
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.before_request
def log_request():
    logger.info(f"{datetime.now()} - {request.method} {request.path} from {request.remote_addr}")
```

## 🎯 Next Steps

1. **Choose deployment option** (Replit recommended for simplicity)
2. **Deploy your service** with environment variables
3. **Test from Colab** using the provided notebook
4. **Add security** if needed for production use
5. **Monitor usage** and scale as needed

Your Python API will now be accessible from anywhere on the Internet, making it a truly universal vector store service for all your applications!

## Example URLs After Deployment

- **Health Check**: `https://your-service.replit.app/health`
- **Service Info**: `https://your-service.replit.app/info`  
- **Upload API**: `https://your-service.replit.app/upload_and_attach`

Replace `your-service.replit.app` with your actual deployment URL.