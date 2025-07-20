# Proposal View Differences Analysis

## Key Differences Between Initiator and Approver Views

### 1. **Layout Structure**
- **Initiator (MyInvestments)**: Shows proposals in compact card format with expandable details
- **Approver (MyTasks)**: Shows proposals in task format with expandable details, but uses 3-column grid layout

### 2. **Information Display**
- **Initiator**: Shows all proposal details in expanded card view
- **Approver**: Shows proposal details in task context with approval actions

### 3. **Layout Grid Issues**
- **MyTasks.tsx (Approver)**: Uses 3-column grid: `grid-cols-1 md:grid-cols-3`
- **InvestmentDetailsInline.tsx (Initiator)**: Also uses 3-column grid in some sections

### 4. **Field Display Differences**
Both views should show the same information but the layout may be inconsistent:

#### Common Fields Both Should Display:
- Request ID
- Target Company  
- Amount
- Expected Return
- Risk Level
- Investment Rationale/Description
- Approval History
- Documents & Analysis

#### Potential Issues:
1. **Grid Layout**: Both use 3-column layout which might cause display inconsistencies
2. **Field Ordering**: May be different between views
3. **Styling**: Different background colors or spacing
4. **Content Truncation**: Fields might be truncated differently

## Recommended Fixes:
1. Ensure both views use consistent field ordering
2. Standardize grid layouts and responsive behavior
3. Make sure all fields display with the same formatting
4. Verify document analysis appears consistently