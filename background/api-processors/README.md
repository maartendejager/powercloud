# API Processors

This directory contains modules for processing API responses from various endpoints used in the PowerCloud extension.

## Structure

- **index.js**: Exports all processor functions for easy imports in the service worker
- **card-processor.js**: Handles card detail requests and response processing
- **book-processor.js**: Handles book detail requests and response processing
- **administration-processor.js**: Handles administration detail requests and response processing
- **balance-account-processor.js**: Handles balance account detail requests and response processing
- **utils.js**: Shared utility functions used by multiple processors

## Usage

Import the required processors in your module:

```javascript
import { 
  processCardDetailsRequest,
  processBookDetailsRequest,
  // ... other processors
} from './api-processors/index.js';
```

## Responsibilities

Each processor is responsible for:

1. Making the appropriate API call through the shared API module
2. Processing and extracting relevant data from the response
3. Handling errors in a consistent way
4. Sending the processed response back to the caller
