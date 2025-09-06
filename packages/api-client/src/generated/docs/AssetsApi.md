# AssetsApi

All URIs are relative to *http://localhost:3001*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**assetsControllerCreateAsset**](#assetscontrollercreateasset) | **POST** /assets | |
|[**assetsControllerDeleteAsset**](#assetscontrollerdeleteasset) | **DELETE** /assets/{id} | |
|[**assetsControllerGenerateDownloadUrl**](#assetscontrollergeneratedownloadurl) | **POST** /assets/{id}/download-url | |
|[**assetsControllerGenerateUploadUrl**](#assetscontrollergenerateuploadurl) | **POST** /assets/upload-url | |
|[**assetsControllerGetAsset**](#assetscontrollergetasset) | **GET** /assets/{id} | |
|[**assetsControllerGetAssetStatus**](#assetscontrollergetassetstatus) | **GET** /assets/{id}/status | |
|[**assetsControllerGetAssetVariants**](#assetscontrollergetassetvariants) | **GET** /assets/{id}/variants | |
|[**assetsControllerGetProcessingStatus**](#assetscontrollergetprocessingstatus) | **GET** /assets/{id}/processing-status | |
|[**assetsControllerGetUserAssets**](#assetscontrollergetuserassets) | **GET** /assets | |
|[**assetsControllerHandleUploadComplete**](#assetscontrollerhandleuploadcomplete) | **POST** /assets/{id}/upload-complete | |
|[**assetsControllerRetryProcessing**](#assetscontrollerretryprocessing) | **POST** /assets/{id}/retry-processing | |
|[**assetsControllerUpdateAsset**](#assetscontrollerupdateasset) | **PUT** /assets/{id} | |

# **assetsControllerCreateAsset**
> assetsControllerCreateAsset(createAssetDto)


### Example

```typescript
import {
    AssetsApi,
    Configuration,
    CreateAssetDto
} from './api';

const configuration = new Configuration();
const apiInstance = new AssetsApi(configuration);

let createAssetDto: CreateAssetDto; //

const { status, data } = await apiInstance.assetsControllerCreateAsset(
    createAssetDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createAssetDto** | **CreateAssetDto**|  | |


### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **assetsControllerDeleteAsset**
> assetsControllerDeleteAsset()


### Example

```typescript
import {
    AssetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AssetsApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.assetsControllerDeleteAsset(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


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
|**204** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **assetsControllerGenerateDownloadUrl**
> assetsControllerGenerateDownloadUrl(body)


### Example

```typescript
import {
    AssetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AssetsApi(configuration);

let id: string; // (default to undefined)
let variant: string; // (default to undefined)
let body: object; //

const { status, data } = await apiInstance.assetsControllerGenerateDownloadUrl(
    id,
    variant,
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |
| **id** | [**string**] |  | defaults to undefined|
| **variant** | [**string**] |  | defaults to undefined|


### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **assetsControllerGenerateUploadUrl**
> assetsControllerGenerateUploadUrl(body)


### Example

```typescript
import {
    AssetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AssetsApi(configuration);

let body: object; //

const { status, data } = await apiInstance.assetsControllerGenerateUploadUrl(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **assetsControllerGetAsset**
> assetsControllerGetAsset()


### Example

```typescript
import {
    AssetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AssetsApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.assetsControllerGetAsset(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


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

# **assetsControllerGetAssetStatus**
> assetsControllerGetAssetStatus()


### Example

```typescript
import {
    AssetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AssetsApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.assetsControllerGetAssetStatus(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


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

# **assetsControllerGetAssetVariants**
> assetsControllerGetAssetVariants()


### Example

```typescript
import {
    AssetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AssetsApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.assetsControllerGetAssetVariants(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


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

# **assetsControllerGetProcessingStatus**
> assetsControllerGetProcessingStatus()


### Example

```typescript
import {
    AssetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AssetsApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.assetsControllerGetProcessingStatus(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


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

# **assetsControllerGetUserAssets**
> assetsControllerGetUserAssets()


### Example

```typescript
import {
    AssetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AssetsApi(configuration);

const { status, data } = await apiInstance.assetsControllerGetUserAssets();
```

### Parameters
This endpoint does not have any parameters.


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

# **assetsControllerHandleUploadComplete**
> assetsControllerHandleUploadComplete()


### Example

```typescript
import {
    AssetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AssetsApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.assetsControllerHandleUploadComplete(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


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

# **assetsControllerRetryProcessing**
> assetsControllerRetryProcessing()


### Example

```typescript
import {
    AssetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AssetsApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.assetsControllerRetryProcessing(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


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

# **assetsControllerUpdateAsset**
> assetsControllerUpdateAsset(body)


### Example

```typescript
import {
    AssetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AssetsApi(configuration);

let id: string; // (default to undefined)
let body: object; //

const { status, data } = await apiInstance.assetsControllerUpdateAsset(
    id,
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |
| **id** | [**string**] |  | defaults to undefined|


### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

