// This will be inserted into the actual service to debug the response format
const debugResponse = (response) => {
  console.log('=== FULL RESPONSE DEBUG ===');
  console.log('Type:', typeof response);
  console.log('Keys:', Object.keys(response));
  
  if (response.output && Array.isArray(response.output)) {
    console.log('Output array length:', response.output.length);
    response.output.forEach((item, index) => {
      console.log(`Output[${index}]:`, typeof item, Object.keys(item));
      if (item.content && Array.isArray(item.content)) {
        console.log(`  Content array length:`, item.content.length);
        item.content.forEach((contentItem, contentIndex) => {
          console.log(`  Content[${contentIndex}]:`, typeof contentItem, Object.keys(contentItem));
          if (contentItem.text) {
            console.log(`  Text preview:`, contentItem.text.substring(0, 100));
          }
        });
      }
    });
  }
  
  // Try direct field access
  if (response.text) {
    console.log('Direct text field:', response.text.substring(0, 100));
  }
  
  if (response.output_text) {
    console.log('Output_text field:', response.output_text.substring(0, 100));
  }
  
  return response;
};

module.exports = debugResponse;
