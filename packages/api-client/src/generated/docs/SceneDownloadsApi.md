# SceneDownloadsApi

All URIs are relative to *http://localhost:3001*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**downloadControllerDownloadAsset**](#downloadcontrollerdownloadasset) | **GET** /projects/{projectId}/scenes/{sceneId}/download/assets/{assetId} | Download specific asset|
|[**downloadControllerDownloadBatch**](#downloadcontrollerdownloadbatch) | **POST** /projects/{projectId}/scenes/{sceneId}/download/batch | Download specific scene assets|
|[**downloadControllerDownloadManifest**](#downloadcontrollerdownloadmanifest) | **GET** /projects/{projectId}/scenes/{sceneId}/download/manifest | Download all assets in scene manifest|
|[**downloadControllerGetAssetMetadata**](#downloadcontrollergetassetmetadata) | **GET** /projects/{projectId}/scenes/{sceneId}/download/assets/{assetId}/metadata | Get asset metadata for caching|
|[**downloadControllerRedirectToAsset**](#downloadcontrollerredirecttoasset) | **GET** /projects/{projectId}/scenes/{sceneId}/download/assets/{assetId}/redirect | Direct asset download with redirect|

# **downloadControllerDownloadAsset**
> AssetDownloadInfo downloadControllerDownloadAsset()

Generates presigned download URL for a specific asset with caching headers

### Example

```typescript
import {
    SceneDownloadsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SceneDownloadsApi(configuration);

let projectId: string; //Project ID (default to undefined)
let sceneId: string; //Scene ID (default to undefined)
let assetId: string; //Asset ID (default to undefined)
let variant: 'original' | 'meshopt' | 'draco' | 'navmesh'; //Asset variant to download (optional) (default to undefined)
let cacheDuration: number; //Cache duration in seconds (optional) (default to undefined)
let includeCdn: boolean; //Include CDN URLs if available (optional) (default to undefined)

const { status, data } = await apiInstance.downloadControllerDownloadAsset(
    projectId,
    sceneId,
    assetId,
    variant,
    cacheDuration,
    includeCdn
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectId** | [**string**] | Project ID | defaults to undefined|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **assetId** | [**string**] | Asset ID | defaults to undefined|
| **variant** | [**&#39;original&#39; | &#39;meshopt&#39; | &#39;draco&#39; | &#39;navmesh&#39;**]**Array<&#39;original&#39; &#124; &#39;meshopt&#39; &#124; &#39;draco&#39; &#124; &#39;navmesh&#39;>** | Asset variant to download | (optional) defaults to undefined|
| **cacheDuration** | [**number**] | Cache duration in seconds | (optional) defaults to undefined|
| **includeCdn** | [**boolean**] | Include CDN URLs if available | (optional) defaults to undefined|


### Return type

**AssetDownloadInfo**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Asset download URL generated successfully |  -  |
|**404** | Asset not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **downloadControllerDownloadBatch**
> BatchDownloadResponse downloadControllerDownloadBatch(batchDownloadDto)

Generates presigned download URLs for specified asset categories in the scene

### Example

```typescript
import {
    SceneDownloadsApi,
    Configuration,
    BatchDownloadDto
} from './api';

const configuration = new Configuration();
const apiInstance = new SceneDownloadsApi(configuration);

let projectId: string; //Project ID (default to undefined)
let sceneId: string; //Scene ID (default to undefined)
let batchDownloadDto: BatchDownloadDto; //

const { status, data } = await apiInstance.downloadControllerDownloadBatch(
    projectId,
    sceneId,
    batchDownloadDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **batchDownloadDto** | **BatchDownloadDto**|  | |
| **projectId** | [**string**] | Project ID | defaults to undefined|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|


### Return type

**BatchDownloadResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Batch download URLs generated successfully |  -  |
|**404** | Scene not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **downloadControllerDownloadManifest**
> BatchDownloadResponse downloadControllerDownloadManifest()

Generates presigned download URLs for all assets referenced in the scene

### Example

```typescript
import {
    SceneDownloadsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SceneDownloadsApi(configuration);

let projectId: string; //Project ID (default to undefined)
let sceneId: string; //Scene ID (default to undefined)
let variant: 'original' | 'meshopt' | 'draco' | 'navmesh'; //Asset variant to download (optional) (default to undefined)
let cacheDuration: number; //Cache duration in seconds (optional) (default to undefined)
let includeCdn: boolean; //Include CDN URLs if available (optional) (default to undefined)

const { status, data } = await apiInstance.downloadControllerDownloadManifest(
    projectId,
    sceneId,
    variant,
    cacheDuration,
    includeCdn
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectId** | [**string**] | Project ID | defaults to undefined|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **variant** | [**&#39;original&#39; | &#39;meshopt&#39; | &#39;draco&#39; | &#39;navmesh&#39;**]**Array<&#39;original&#39; &#124; &#39;meshopt&#39; &#124; &#39;draco&#39; &#124; &#39;navmesh&#39;>** | Asset variant to download | (optional) defaults to undefined|
| **cacheDuration** | [**number**] | Cache duration in seconds | (optional) defaults to undefined|
| **includeCdn** | [**boolean**] | Include CDN URLs if available | (optional) defaults to undefined|


### Return type

**BatchDownloadResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Manifest download URLs generated successfully |  -  |
|**404** | Scene not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **downloadControllerGetAssetMetadata**
> downloadControllerGetAssetMetadata()

Returns asset metadata including ETag and Last-Modified for client-side caching

### Example

```typescript
import {
    SceneDownloadsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SceneDownloadsApi(configuration);

let projectId: string; //Project ID (default to undefined)
let sceneId: string; //Scene ID (default to undefined)
let assetId: string; //Asset ID (default to undefined)

const { status, data } = await apiInstance.downloadControllerGetAssetMetadata(
    projectId,
    sceneId,
    assetId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectId** | [**string**] | Project ID | defaults to undefined|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **assetId** | [**string**] | Asset ID | defaults to undefined|


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
|**200** | Asset metadata retrieved successfully |  -  |
|**404** | Asset not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **downloadControllerRedirectToAsset**
> downloadControllerRedirectToAsset()

Redirects to the presigned URL for immediate download with proper cache headers

### Example

```typescript
import {
    SceneDownloadsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SceneDownloadsApi(configuration);

let projectId: string; //Project ID (default to undefined)
let sceneId: string; //Scene ID (default to undefined)
let assetId: string; //Asset ID (default to undefined)
let variant: 'original' | 'meshopt' | 'draco' | 'navmesh'; //Asset variant to download (optional) (default to undefined)
let cacheDuration: number; //Cache duration in seconds (optional) (default to undefined)
let includeCdn: boolean; //Include CDN URLs if available (optional) (default to undefined)

const { status, data } = await apiInstance.downloadControllerRedirectToAsset(
    projectId,
    sceneId,
    assetId,
    variant,
    cacheDuration,
    includeCdn
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectId** | [**string**] | Project ID | defaults to undefined|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **assetId** | [**string**] | Asset ID | defaults to undefined|
| **variant** | [**&#39;original&#39; | &#39;meshopt&#39; | &#39;draco&#39; | &#39;navmesh&#39;**]**Array<&#39;original&#39; &#124; &#39;meshopt&#39; &#124; &#39;draco&#39; &#124; &#39;navmesh&#39;>** | Asset variant to download | (optional) defaults to undefined|
| **cacheDuration** | [**number**] | Cache duration in seconds | (optional) defaults to undefined|
| **includeCdn** | [**boolean**] | Include CDN URLs if available | (optional) defaults to undefined|


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
|**302** | Redirect to asset download URL |  -  |
|**404** | Asset not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

