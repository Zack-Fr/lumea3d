# FlatScenesApi

All URIs are relative to *http://localhost:3001*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**flatScenesControllerAddItem**](#flatscenescontrolleradditem) | **POST** /scenes/{sceneId}/items | Add an item to a scene|
|[**flatScenesControllerFindOne**](#flatscenescontrollerfindone) | **GET** /scenes/{sceneId} | Get a specific scene with items|
|[**flatScenesControllerGenerateDelta**](#flatscenescontrollergeneratedelta) | **GET** /scenes/{sceneId}/delta | Generate delta between scene versions|
|[**flatScenesControllerGenerateManifest**](#flatscenescontrollergeneratemanifest) | **GET** /scenes/{sceneId}/manifest | Generate scene manifest for client consumption|
|[**flatScenesControllerGetSceneCategories**](#flatscenescontrollergetscenecategories) | **GET** /scenes/{sceneId}/categories | Get available categories in scene|
|[**flatScenesControllerGetVersion**](#flatscenescontrollergetversion) | **GET** /scenes/{sceneId}/version | Get current scene version|
|[**flatScenesControllerRemove**](#flatscenescontrollerremove) | **DELETE** /scenes/{sceneId} | Delete a scene and all its items|
|[**flatScenesControllerRemoveItem**](#flatscenescontrollerremoveitem) | **DELETE** /scenes/{sceneId}/items/{itemId} | Remove an item from a scene|
|[**flatScenesControllerUpdate**](#flatscenescontrollerupdate) | **PATCH** /scenes/{sceneId} | Update scene properties|
|[**flatScenesControllerUpdateItem**](#flatscenescontrollerupdateitem) | **PATCH** /scenes/{sceneId}/items/{itemId} | Update a scene item|

# **flatScenesControllerAddItem**
> flatScenesControllerAddItem(createSceneItemDto)

Flat route - no project ID required in path. Requires If-Match header for optimistic locking.

### Example

```typescript
import {
    FlatScenesApi,
    Configuration,
    CreateSceneItemDto
} from './api';

const configuration = new Configuration();
const apiInstance = new FlatScenesApi(configuration);

let sceneId: string; //Scene ID (default to undefined)
let ifMatch: string; // (default to undefined)
let ifMatch2: string; //Expected scene version for optimistic locking (default to undefined)
let createSceneItemDto: CreateSceneItemDto; //

const { status, data } = await apiInstance.flatScenesControllerAddItem(
    sceneId,
    ifMatch,
    ifMatch2,
    createSceneItemDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createSceneItemDto** | **CreateSceneItemDto**|  | |
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **ifMatch** | [**string**] |  | defaults to undefined|
| **ifMatch2** | [**string**] | Expected scene version for optimistic locking | defaults to undefined|


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
|**201** | Scene item created successfully |  -  |
|**400** | Invalid item data or If-Match header missing |  -  |
|**403** | Insufficient permissions |  -  |
|**404** | Scene or category not found |  -  |
|**412** | Precondition Failed - version conflict |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **flatScenesControllerFindOne**
> flatScenesControllerFindOne()

Flat route - no project ID required in path

### Example

```typescript
import {
    FlatScenesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new FlatScenesApi(configuration);

let sceneId: string; //Scene ID (default to undefined)

const { status, data } = await apiInstance.flatScenesControllerFindOne(
    sceneId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|


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
|**200** | Scene retrieved successfully |  -  |
|**403** | Insufficient permissions |  -  |
|**404** | Scene not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **flatScenesControllerGenerateDelta**
> SceneDelta flatScenesControllerGenerateDelta()

Flat route - returns operations needed to transform scene from one version to another

### Example

```typescript
import {
    FlatScenesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new FlatScenesApi(configuration);

let sceneId: string; //Scene ID (default to undefined)
let fromVersion: number; //Source version (default to undefined)
let toVersion: number; //Target version (default to undefined)

const { status, data } = await apiInstance.flatScenesControllerGenerateDelta(
    sceneId,
    fromVersion,
    toVersion
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **fromVersion** | [**number**] | Source version | defaults to undefined|
| **toVersion** | [**number**] | Target version | defaults to undefined|


### Return type

**SceneDelta**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Scene delta generated successfully |  -  |
|**403** | Insufficient permissions |  -  |
|**404** | Scene not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **flatScenesControllerGenerateManifest**
> SceneManifestV2 flatScenesControllerGenerateManifest()

Flat route - returns a complete scene manifest with all items, transforms, and asset references. Supports category filtering.

### Example

```typescript
import {
    FlatScenesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new FlatScenesApi(configuration);

let sceneId: string; //Scene ID (default to undefined)
let categories: string; //Comma-separated list of category keys to include in manifest. If not provided, all categories are included. (optional) (default to undefined)
let includeMetadata: boolean; //Include additional category metadata like descriptions, tags, and configuration (optional) (default to undefined)

const { status, data } = await apiInstance.flatScenesControllerGenerateManifest(
    sceneId,
    categories,
    includeMetadata
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **categories** | [**string**] | Comma-separated list of category keys to include in manifest. If not provided, all categories are included. | (optional) defaults to undefined|
| **includeMetadata** | [**boolean**] | Include additional category metadata like descriptions, tags, and configuration | (optional) defaults to undefined|


### Return type

**SceneManifestV2**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Scene manifest generated successfully |  -  |
|**403** | Insufficient permissions |  -  |
|**404** | Scene not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **flatScenesControllerGetSceneCategories**
> FlatScenesControllerGetSceneCategories200Response flatScenesControllerGetSceneCategories()

Flat route - returns all unique categories used by items in the scene with their metadata

### Example

```typescript
import {
    FlatScenesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new FlatScenesApi(configuration);

let sceneId: string; //Scene ID (default to undefined)

const { status, data } = await apiInstance.flatScenesControllerGetSceneCategories(
    sceneId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|


### Return type

**FlatScenesControllerGetSceneCategories200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Scene categories retrieved successfully |  -  |
|**403** | Insufficient permissions |  -  |
|**404** | Scene not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **flatScenesControllerGetVersion**
> flatScenesControllerGetVersion()

Flat route - returns the current version number for optimistic locking

### Example

```typescript
import {
    FlatScenesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new FlatScenesApi(configuration);

let sceneId: string; //Scene ID (default to undefined)

const { status, data } = await apiInstance.flatScenesControllerGetVersion(
    sceneId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|


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
|**200** | Scene version retrieved successfully |  -  |
|**403** | Insufficient permissions |  -  |
|**404** | Scene not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **flatScenesControllerRemove**
> flatScenesControllerRemove()

Flat route - no project ID required in path

### Example

```typescript
import {
    FlatScenesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new FlatScenesApi(configuration);

let sceneId: string; //Scene ID (default to undefined)

const { status, data } = await apiInstance.flatScenesControllerRemove(
    sceneId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|


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
|**204** | Scene deleted successfully |  -  |
|**403** | Insufficient permissions |  -  |
|**404** | Scene not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **flatScenesControllerRemoveItem**
> flatScenesControllerRemoveItem()

Flat route - no project ID required in path. Requires If-Match header for optimistic locking.

### Example

```typescript
import {
    FlatScenesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new FlatScenesApi(configuration);

let sceneId: string; //Scene ID (default to undefined)
let itemId: string; //Scene item ID (default to undefined)
let ifMatch: string; // (default to undefined)
let ifMatch2: string; //Expected scene version for optimistic locking (default to undefined)

const { status, data } = await apiInstance.flatScenesControllerRemoveItem(
    sceneId,
    itemId,
    ifMatch,
    ifMatch2
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **itemId** | [**string**] | Scene item ID | defaults to undefined|
| **ifMatch** | [**string**] |  | defaults to undefined|
| **ifMatch2** | [**string**] | Expected scene version for optimistic locking | defaults to undefined|


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
|**204** | Scene item removed successfully |  -  |
|**400** | If-Match header missing or invalid |  -  |
|**403** | Scene item is locked or insufficient permissions |  -  |
|**404** | Scene item not found |  -  |
|**412** | Precondition Failed - version conflict |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **flatScenesControllerUpdate**
> flatScenesControllerUpdate(updateSceneDto)

Flat route - no project ID required in path. Requires If-Match header for optimistic locking.

### Example

```typescript
import {
    FlatScenesApi,
    Configuration,
    UpdateSceneDto
} from './api';

const configuration = new Configuration();
const apiInstance = new FlatScenesApi(configuration);

let sceneId: string; //Scene ID (default to undefined)
let ifMatch: string; // (default to undefined)
let ifMatch2: string; //Expected scene version for optimistic locking (default to undefined)
let updateSceneDto: UpdateSceneDto; //

const { status, data } = await apiInstance.flatScenesControllerUpdate(
    sceneId,
    ifMatch,
    ifMatch2,
    updateSceneDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateSceneDto** | **UpdateSceneDto**|  | |
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **ifMatch** | [**string**] |  | defaults to undefined|
| **ifMatch2** | [**string**] | Expected scene version for optimistic locking | defaults to undefined|


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
|**200** | Scene updated successfully |  -  |
|**400** | If-Match header missing or invalid |  -  |
|**403** | Insufficient permissions |  -  |
|**404** | Scene not found |  -  |
|**412** | Precondition Failed - version conflict |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **flatScenesControllerUpdateItem**
> flatScenesControllerUpdateItem(updateSceneItemDto)

Flat route - no project ID required in path. Requires If-Match header for optimistic locking.

### Example

```typescript
import {
    FlatScenesApi,
    Configuration,
    UpdateSceneItemDto
} from './api';

const configuration = new Configuration();
const apiInstance = new FlatScenesApi(configuration);

let sceneId: string; //Scene ID (default to undefined)
let itemId: string; //Scene item ID (default to undefined)
let ifMatch: string; // (default to undefined)
let ifMatch2: string; //Expected scene version for optimistic locking (default to undefined)
let updateSceneItemDto: UpdateSceneItemDto; //

const { status, data } = await apiInstance.flatScenesControllerUpdateItem(
    sceneId,
    itemId,
    ifMatch,
    ifMatch2,
    updateSceneItemDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateSceneItemDto** | **UpdateSceneItemDto**|  | |
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **itemId** | [**string**] | Scene item ID | defaults to undefined|
| **ifMatch** | [**string**] |  | defaults to undefined|
| **ifMatch2** | [**string**] | Expected scene version for optimistic locking | defaults to undefined|


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
|**200** | Scene item updated successfully |  -  |
|**400** | If-Match header missing or invalid |  -  |
|**403** | Scene item is locked or insufficient permissions |  -  |
|**404** | Scene item not found |  -  |
|**412** | Precondition Failed - version conflict |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

