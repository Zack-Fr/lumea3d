# ScenesSSEApi

All URIs are relative to *http://localhost:3001*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**scenesSSEControllerStreamSceneEvents**](#scenesssecontrollerstreamsceneevents) | **GET** /projects/{projectId}/scenes/{sceneId}/events | Connect to scene events via Server-Sent Events (SSE)|

# **scenesSSEControllerStreamSceneEvents**
> scenesSSEControllerStreamSceneEvents()

Fallback for realtime scene updates when WebSockets are not available

### Example

```typescript
import {
    ScenesSSEApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ScenesSSEApi(configuration);

let projectId: string; //Project ID (default to undefined)
let sceneId: string; //Scene ID (default to undefined)
let clientId: string; // (default to undefined)

const { status, data } = await apiInstance.scenesSSEControllerStreamSceneEvents(
    projectId,
    sceneId,
    clientId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectId** | [**string**] | Project ID | defaults to undefined|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **clientId** | [**string**] |  | defaults to undefined|


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

