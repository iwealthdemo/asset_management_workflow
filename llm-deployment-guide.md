# LLM API Service Deployment Guide

## 🚀 **Deploy Your LLM Service**

### **Step 1: In Your LLM Service Replit Project**

1. **Ensure all files are copied** (you mentioned this is done ✅)
   - `main.py`
   - `requirements.txt` 
   - `services/document_service.py`
   - `services/chat_service.py`
   - `services/analysis_service.py`
   - `services/concurrency_manager.py`
   - `utils/auth.py`
   - `utils/metadata_extractor.py`

2. **Verify environment secrets are set** (you mentioned this is done ✅)
   - `OPENAI_API_KEY`
   - `SERVICE_API_KEY` 
   - `DEFAULT_VECTOR_STORE_ID`

3. **Click the "Deploy" button** in your LLM service project
   - This creates a public URL like: `https://your-project-name.replit.app`

### **Step 2: Test Local Service First**

Before deploying, let's test if your service runs locally:

```bash
# In your LLM service project terminal:
python main.py
```

You should see:
```
* Running on http://0.0.0.0:5000
* Debug mode: off
```

### **Step 3: Test Health Endpoint**

Once running, test the health endpoint:
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-20T...",
  "openai_configured": true,
  "anthropic_configured": false,
  "default_vector_store": "vs_687584b54f908191b0a21ffa42948fb5",
  "concurrency_limits": {
    "max_concurrent_requests": 20,
    "rate_limit_per_minute": 200
  }
}
```

## 🔧 **Common Issues & Solutions**

### **Issue 1: Service Won't Start**

**Error:** `ModuleNotFoundError` or import errors

**Solution:** Check your `requirements.txt` has all dependencies:
```
flask==3.0.0
flask-cors==4.0.0
openai==1.51.2
anthropic==0.25.1
requests==2.31.0
python-dotenv==1.0.0
```

### **Issue 2: OpenAI Not Configured**

**Error:** `openai_configured: false` in health check

**Solution:** 
1. Verify `OPENAI_API_KEY` secret is set correctly
2. Check the key has sufficient credits/permissions
3. Test with: `curl -H "Authorization: Bearer YOUR_API_KEY" https://api.openai.com/v1/models`

### **Issue 3: Vector Store Not Found**

**Error:** Vector store errors in logs

**Solution:**
1. Verify `DEFAULT_VECTOR_STORE_ID` matches your existing vector store
2. Check vector store exists: Use OpenAI Playground or API to verify

### **Issue 4: Service Not Accessible After Deploy**

**Error:** 404 or connection refused

**Solution:**
1. Ensure `main.py` has: `app.run(host='0.0.0.0', port=5000)`
2. Check deployment logs in Replit console
3. Verify no syntax errors in Python files

## 📋 **Deployment Checklist**

- [ ] All Python files copied to LLM service project
- [ ] `requirements.txt` contains all dependencies
- [ ] Environment secrets configured
- [ ] Service starts locally without errors
- [ ] Health endpoint returns "healthy" status
- [ ] OpenAI configuration shows as `true`
- [ ] Default vector store is configured
- [ ] Deploy button clicked in Replit
- [ ] Deployment completes successfully
- [ ] Public URL is accessible
- [ ] Authentication endpoints work properly

## 🧪 **Quick Test Commands**

Once deployed, test these endpoints with your actual URL:

```bash
# Replace YOUR_URL with your actual deployment URL
export LLM_URL="https://your-project-name.replit.app"
export API_KEY="your-service-api-key"

# Test health
curl "$LLM_URL/health"

# Test info
curl "$LLM_URL/info"

# Test authentication (should get 401)
curl -X POST "$LLM_URL/documents/search" \
  -H "Content-Type: application/json" \
  -d '{"query":"test"}'

# Test with auth (should work)
curl -X POST "$LLM_URL/documents/search" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"query":"test"}'
```

## 🎯 **What Happens Next**

Once your LLM service is deployed and accessible:

1. **You provide the deployment URL** (e.g., `https://your-service.replit.app`)
2. **I update the Investment Portal** integration to use your service
3. **We test the complete workflow** end-to-end
4. **Your microservices architecture is complete**

---

**Current Status:** Waiting for LLM service deployment URL

Let me know:
1. Your deployment URL once available
2. Any errors you encounter during deployment
3. Results of the health check test