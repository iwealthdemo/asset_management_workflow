# OpenAI API Payload for Cross-Document Search

## When Both Documents (67, 68) Are Selected

Based on the current implementation, here's the exact payload sent to OpenAI Responses API:

### Document Details Used:
- **Document 67 (HDFC)**: 
  - Full filename: `RZx3lEIKHpiF6nay-6gak-HDFC Bank_Annual Report_2019-20.pdf`
  - Original filename: `HDFC Bank_Annual Report_2019-20.pdf`
  - OpenAI File ID: `file-xxxxx` (from analysis_result)

- **Document 68 (Reliance)**: 
  - Full filename: `QwRKM363xsSQWv8YvLXR4-Reliance_Annual-Report_2019-20.pdf`
  - Original filename: `Reliance_Annual-Report_2019-20.pdf`  
  - OpenAI File ID: `file-yyyyy` (from analysis_result)

### OpenAI Responses API Payload Structure:

```json
{
  "model": "gpt-4o",
  "tools": [
    {
      "type": "file_search",
      "vector_store_ids": ["vs_687584b54f908191b0a21ffa42948fb5"],
      "filters": {
        "type": "or",
        "filters": [
          {
            "type": "eq",
            "key": "file_id",
            "value": "file-xxxxx"
          },
          {
            "type": "eq", 
            "key": "file_id",
            "value": "file-yyyyy"
          }
        ]
      }
    }
  ],
  "input": "I want you to search within these 2 specific documents (using their full filenames with vector store prefix):\n\n- \"RZx3lEIKHpiF6nay-6gak-HDFC Bank_Annual Report_2019-20.pdf\" (Original: \"HDFC Bank_Annual Report_2019-20.pdf\", OpenAI File ID: file-xxxxx)\n- \"QwRKM363xsSQWv8YvLXR4-Reliance_Annual-Report_2019-20.pdf\" (Original: \"Reliance_Annual-Report_2019-20.pdf\", OpenAI File ID: file-yyyyy)\n\nPlease search ONLY within these documents to answer the following question: [USER_QUERY]\n\nFull Document Filenames (with vector store prefix):\nRZx3lEIKHpiF6nay-6gak-HDFC Bank_Annual Report_2019-20.pdf, QwRKM363xsSQWv8YvLXR4-Reliance_Annual-Report_2019-20.pdf\n\nImportant instructions:\n1. Focus your search exclusively on the documents listed above by their full filenames (including vector store prefix)\n2. Do not use information from any other documents in the vector store\n3. If the answer requires information from multiple documents, synthesize the information and clearly indicate which full filename contains each piece of information\n4. When referencing sources, use the full filenames with vector store prefix that I provided above\n5. Ensure your search is limited to these specific documents: RZx3lEIKHpiF6nay-6gak-HDFC Bank_Annual Report_2019-20.pdf, QwRKM363xsSQWv8YvLXR4-Reliance_Annual-Report_2019-20.pdf",
  "previous_response_id": "resp_xxxxx_if_exists"
}
```

### Key Features of the Payload:

1. **File Filtering**: Uses OpenAI's native `filters` with `"type": "or"` to search only in selected documents
2. **Full Filenames**: Includes complete filenames with vector store prefix in the input query
3. **File ID Filtering**: Uses OpenAI File IDs for precise document selection
4. **Vector Store Scoping**: Restricts search to specific vector store
5. **Conversation Continuity**: Includes `previous_response_id` if available for context

### Filtering Logic:
- **Single Document**: Uses `"type": "eq"` filter
- **Multiple Documents**: Uses `"type": "or"` with array of `"eq"` filters
- **No Selection**: Searches entire vector store (no filters)