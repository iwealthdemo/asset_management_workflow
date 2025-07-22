# Manual Test Guide: Document Analysis Workflow

## Steps to Test Document Summary Feature

### 1. Login as Analyst
- Navigate to the application in browser
- Login with: `analyst1` / `admin123`

### 2. Create New Investment Proposal
- Go to "New Investment" page
- Fill in:
  - Asset Type: Equity
  - Target Company: Tesla Inc
  - Amount: $50,000,000
  - Expected Return: 15.5%
  - Risk Level: Medium
  - Description: "Investment in Tesla stock - leading electric vehicle company with strong growth potential and expanding into energy storage and autonomous driving technology."
- Save as Draft first

### 3. Upload Test Document
- Click "Upload Documents" button
- Upload a PDF or text file (use any financial document)
- Verify document appears in "Attached Documents" section

### 4. Monitor Document Processing
- Watch for background job processing indicator
- Document should show:
  - Initial status: "Processing"
  - Progress updates: "1/4", "2/4", etc.
  - Final status: "Processed"

### 5. Check Document Summary
- Look for "Document Summary" section (NOT "AI Insights")
- Verify Summary card is NOT shown (should be removed)
- Check that Document Summary contains comprehensive analysis (should be 1000+ characters)

### 6. Submit for Approval
- Click "Submit for Approval" 
- Proposal status should change from "Draft" to "New"

### 7. Test My Investments View
- Go to "My Investments"
- Verify proposal appears with documents
- Check Document Summary is visible and properly labeled

### 8. Test My Tasks View (Manager Perspective)
- Logout from analyst1
- Login as: `manager1` / `admin123`
- Go to "My Tasks"
- Find the Tesla proposal task
- Expand task details
- Verify:
  - Documents section shows attached documents
  - Document Summary (not AI Insights) is visible
  - Same comprehensive analysis appears

## Expected Results

✅ **Summary Card Removed**: No separate "Summary" card should appear
✅ **Renamed Section**: "AI Insights" should now be "Document Summary"
✅ **Comprehensive Content**: Document Summary should contain detailed analysis (1000+ chars)
✅ **Both Views**: Changes should appear in both My Investments and My Tasks
✅ **Background Processing**: Documents should process automatically and show progress

## Test Document Content
If you need test content, create a text file with:

```
TESLA INC (TSLA) - INVESTMENT ANALYSIS REPORT

EXECUTIVE SUMMARY
Tesla Inc. is a leading electric vehicle and clean energy company with significant growth potential.

FINANCIAL HIGHLIGHTS
- Revenue (2023): $96.8 billion
- Net Income: $15.0 billion  
- Gross Margin: 19.3%
- Cash: $34.1 billion

INVESTMENT THESIS
1. Market Leadership in EVs
2. Technology Advantage
3. Expansion Opportunities
4. Manufacturing Scale

RECOMMENDATION: BUY
Target Price: $280
Risk Level: Medium
```

Save as `tesla-analysis.txt` and upload this to test the workflow.