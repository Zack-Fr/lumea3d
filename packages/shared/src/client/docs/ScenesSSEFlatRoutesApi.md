# ScenesSSEFlatRoutesApi

All URIs are relative to *http://localhost:3001*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**flatScenesSSEControllerStreamSceneEvents**](#flatscenesssecontrollerstreamsceneevents) | **GET** /scenes/{sceneId}/events | Connect to scene events via Server-Sent Events (SSE) - Flat Route|

# **flatScenesSSEControllerStreamSceneEvents**
> flatScenesSSEControllerStreamSceneEvents()

Flat route alias for realtime scene updates when WebSockets are not available. Supports Last-Event-ID for reconnection.

### Example

```typescript
import {
    ScenesSSEFlatRoutesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ScenesSSEFlatRoutesApi(configuration);

let sceneId: string; //Scene ID (default to undefined)
let lastEventId: string; // (default to undefined)
let clientId: string; //Optional client identifier for reconnection (optional) (default to undefined)
let lastEventID: string; //Last received event ID for resuming connection (optional) (default to undefined)

const { status, data } = await apiInstance.flatScenesSSEControllerStreamSceneEvents(
    sceneId,
    lastEventId,
    clientId,
    lastEventID
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **lastEventId** | [**string**] |  | defaults to undefined|
| **clientId** | [**string**] | Optional client identifier for reconnection | (optional) defaults to undefined|
| **lastEventID** | [**string**] | Last received event ID for resuming connection | (optional) defaults to undefined|


### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

