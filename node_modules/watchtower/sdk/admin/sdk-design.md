## Design SDK API Surface

### Design Methodology
- Extension SDK that    can be added to a program; not required 
- Lightweight, configurable



### High Level Structure
1. Signal Capture Layer
2. Event Normalization and Enrichment
3. Local Queue + Batching
4. Transport Layer
5. Configuration and Initialization

### 1) Signal Capture Layer
- Errors/Exceptions
	- Global error catching
	- Provide functions so users can manually log errors to watchtower
- Performance Metrics
- Capturing logs
  - Override the console.log function to a parasitic function
    - Store the original console.log functions so they can still be called later
    - For each method, create a wrapper that for each call:
      - Receives the arguments
      - Sends them to Watchtower
      - Calls the original console method with the same arguments
  - List of console functions:
    - console.log
    - console.info
    - console.warn
    - console.error
    - Optional:
      - console.debug
      - console.trace
      - console.group 

### 2) Event Parsing
- Normalizes the event into consistent schema that the backend expects.
- Schemas can be found under sdk\watchtower-sdk\src\types

### 3) Local Queue + Batching
- Push events in a queue
  - Seperate queue for each event type
- Post them once one of the two conditions are hit
  - These conditions will have a base number but maybe can also be changed on init by user
  - They will also not be identical per event
    - Errors need to be flushed quickly
    - Logs have higher volume, flushed slowly
    - Spans medium volume
  - Conditions:
    - Time based flush  
    - Count-based flush 
- Implement a batching engine which will:
  - Maintain seperate queues for logs, errors, and spans
  - Collect events as they occur
  - Flush queues based on time or event count
  - Send bacthes to the backend 

### 4) Transport Layer
- HTTPS POST
  - Send JSON packets to backend
  - NEEDS TO BE CODESIGNED WITH BACKEND
    - What does authentication look like?
    - Where do the POSTs go?
    - What does backend respond with?
  - Tentative schemas for error, log, performance were made

### 5) Config and init
We want the user to be able to call init once and have watchtower running within their codebase.
Export an init function which takes as params the necessary variables. The default value is in parentheses:
- api_key
- service (test),
- environment (testing),
- thresholds:
  - max error time (1000)
  - max error count (10)
  - max log time (3000)
  - max log count (50)
  - max span time (2000)
  - max span count (25)
- captureErrors (true) //can be implemented later



# Resources:

Microsoft - [Creating an SDK](https://learn.microsoft.com/en-us/visualstudio/extensibility/creating-a-software-development-kit?view=visualstudio)\
IBM - [API vs SDK](https://www.youtube.com/watch?v=kG-fLp9BTRo) \
JSON - [JSON Docs](https://www.json.org/json-en.html)
