# ScenesLegacyDeprecatedApi

All URIs are relative to *http://localhost:3001*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**scenesControllerAddItem**](#scenescontrolleradditem) | **POST** /projects/{projectId}/scenes/{sceneId}/items | Add an item to a scene|
|[**scenesControllerCreate**](#scenescontrollercreate) | **POST** /projects/{projectId}/scenes | Create a new 3D scene|
|[**scenesControllerFindAll**](#scenescontrollerfindall) | **GET** /projects/{projectId}/scenes | Get all scenes in a project|
|[**scenesControllerFindOne**](#scenescontrollerfindone) | **GET** /projects/{projectId}/scenes/{sceneId} | Get a specific scene with items|
|[**scenesControllerGenerateDelta**](#scenescontrollergeneratedelta) | **GET** /projects/{projectId}/scenes/{sceneId}/delta | Generate delta between scene versions|
|[**scenesControllerGenerateManifest**](#scenescontrollergeneratemanifest) | **GET** /projects/{projectId}/scenes/{sceneId}/manifest | Generate scene manifest for client consumption|
|[**scenesControllerGetVersion**](#scenescontrollergetversion) | **GET** /projects/{projectId}/scenes/{sceneId}/version | Get current scene version|
|[**scenesControllerRemove**](#scenescontrollerremove) | **DELETE** /projects/{projectId}/scenes/{sceneId} | Delete a scene and all its items|
|[**scenesControllerRemoveItem**](#scenescontrollerremoveitem) | **DELETE** /projects/{projectId}/scenes/{sceneId}/items/{itemId} | Remove an item from a scene|
|[**scenesControllerUpdate**](#scenescontrollerupdate) | **PATCH** /projects/{projectId}/scenes/{sceneId} | Update scene properties|
|[**scenesControllerUpdateItem**](#scenescontrollerupdateitem) | **PATCH** /projects/{projectId}/scenes/{sceneId}/items/{itemId} | Update a scene item|

# **scenesControllerAddItem**
> scenesControllerAddItem(createSceneItemDto)


### Example

```typescript
import {
    ScenesLegacyDeprecatedApi,
    Configuration,
    CreateSceneItemDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ScenesLegacyDeprecatedApi(configuration);

let projectId: string; //Project ID (default to undefined)
let sceneId: string; //Scene ID (default to undefined)
let createSceneItemDto: CreateSceneItemDto; //

const { status, data } = await apiInstance.scenesControllerAddItem(
    projectId,
    sceneId,
    createSceneItemDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createSceneItemDto** | **CreateSceneItemDto**|  | |
| **projectId** | [**string**] | Project ID | defaults to undefined|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|


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
|**400** | Invalid item data |  -  |
|**404** | Scene or category not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **scenesControllerCreate**
> scenesControllerCreate(createSceneDto)

DEPRECATED: Use flat route POST /scenes instead. Will be removed on 2025-11-05.

### Example

```typescript
import {
    ScenesLegacyDeprecatedApi,
    Configuration,
    CreateSceneDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ScenesLegacyDeprecatedApi(configuration);

let projectId: string; //Project ID (default to undefined)
let createSceneDto: CreateSceneDto; //
let sunset: string; //Date when this endpoint will be removed (optional) (default to undefined)
let deprecation: string; //Indicates this endpoint is deprecated (optional) (default to undefined)

const { status, data } = await apiInstance.scenesControllerCreate(
    projectId,
    createSceneDto,
    sunset,
    deprecation
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createSceneDto** | **CreateSceneDto**|  | |
| **projectId** | [**string**] | Project ID | defaults to undefined|
| **sunset** | [**string**] | Date when this endpoint will be removed | (optional) defaults to undefined|
| **deprecation** | [**string**] | Indicates this endpoint is deprecated | (optional) defaults to undefined|


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
|**201** | Scene created successfully |  -  |
|**400** | Invalid scene data |  -  |
|**404** | Project not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **scenesControllerFindAll**
> scenesControllerFindAll()


### Example

```typescript
import {
    ScenesLegacyDeprecatedApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ScenesLegacyDeprecatedApi(configuration);

let projectId: string; //Project ID (default to undefined)

const { status, data } = await apiInstance.scenesControllerFindAll(
    projectId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectId** | [**string**] | Project ID | defaults to undefined|


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
|**200** | Scenes retrieved successfully |  -  |
|**404** | Project not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **scenesControllerFindOne**
> scenesControllerFindOne()


### Example

```typescript
import {
    ScenesLegacyDeprecatedApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ScenesLegacyDeprecatedApi(configuration);

let projectId: string; //Project ID (default to undefined)
let sceneId: string; //Scene ID (default to undefined)

const { status, data } = await apiInstance.scenesControllerFindOne(
    projectId,
    sceneId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectId** | [**string**] | Project ID | defaults to undefined|
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
|**404** | Scene not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **scenesControllerGenerateDelta**
> SceneDelta scenesControllerGenerateDelta()

Returns operations needed to transform scene from one version to another

### Example

```typescript
import {
    ScenesLegacyDeprecatedApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ScenesLegacyDeprecatedApi(configuration);

let projectId: string; //Project ID (default to undefined)
let sceneId: string; //Scene ID (default to undefined)
let fromVersion: number; //Source version (default to undefined)
let toVersion: number; //Target version (default to undefined)

const { status, data } = await apiInstance.scenesControllerGenerateDelta(
    projectId,
    sceneId,
    fromVersion,
    toVersion
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectId** | [**string**] | Project ID | defaults to undefined|
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
|**404** | Scene not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **scenesControllerGenerateManifest**
> SceneManifestV2 scenesControllerGenerateManifest()

DEPRECATED: Use flat route GET /scenes/{sceneId}/manifest instead. Will be removed on 2025-11-05. Returns a complete scene manifest with all items, transforms, and asset references

### Example

```typescript
import {
    ScenesLegacyDeprecatedApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ScenesLegacyDeprecatedApi(configuration);

let projectId: string; //Project ID (default to undefined)
let sceneId: string; //Scene ID (default to undefined)
let link: string; //Link to successor endpoint (optional) (default to undefined)

const { status, data } = await apiInstance.scenesControllerGenerateManifest(
    projectId,
    sceneId,
    link
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectId** | [**string**] | Project ID | defaults to undefined|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **link** | [**string**] | Link to successor endpoint | (optional) defaults to undefined|


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
|**404** | Scene not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **scenesControllerGetVersion**
> scenesControllerGetVersion()

Returns the current version number for optimistic locking

### Example

```typescript
import {
    ScenesLegacyDeprecatedApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ScenesLegacyDeprecatedApi(configuration);

let projectId: string; //Project ID (default to undefined)
let sceneId: string; //Scene ID (default to undefined)

const { status, data } = await apiInstance.scenesControllerGetVersion(
    projectId,
    sceneId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectId** | [**string**] | Project ID | defaults to undefined|
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
|**404** | Scene not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **scenesControllerRemove**
> scenesControllerRemove()


### Example

```typescript
import {
    ScenesLegacyDeprecatedApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ScenesLegacyDeprecatedApi(configuration);

let projectId: string; //Project ID (default to undefined)
let sceneId: string; //Scene ID (default to undefined)

const { status, data } = await apiInstance.scenesControllerRemove(
    projectId,
    sceneId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectId** | [**string**] | Project ID | defaults to undefined|
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
|**404** | Scene not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **scenesControllerRemoveItem**
> scenesControllerRemoveItem()


### Example

```typescript
import {
    ScenesLegacyDeprecatedApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ScenesLegacyDeprecatedApi(configuration);

let projectId: string; //Project ID (default to undefined)
let sceneId: string; //Scene ID (default to undefined)
let itemId: string; //Scene item ID (default to undefined)

const { status, data } = await apiInstance.scenesControllerRemoveItem(
    projectId,
    sceneId,
    itemId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectId** | [**string**] | Project ID | defaults to undefined|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **itemId** | [**string**] | Scene item ID | defaults to undefined|


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
|**403** | Scene item is locked |  -  |
|**404** | Scene item not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **scenesControllerUpdate**
> scenesControllerUpdate(updateSceneDto)


### Example

```typescript
import {
    ScenesLegacyDeprecatedApi,
    Configuration,
    UpdateSceneDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ScenesLegacyDeprecatedApi(configuration);

let projectId: string; //Project ID (default to undefined)
let sceneId: string; //Scene ID (default to undefined)
let updateSceneDto: UpdateSceneDto; //
let version: number; //Expected scene version for optimistic locking (optional) (default to undefined)

const { status, data } = await apiInstance.scenesControllerUpdate(
    projectId,
    sceneId,
    updateSceneDto,
    version
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateSceneDto** | **UpdateSceneDto**|  | |
| **projectId** | [**string**] | Project ID | defaults to undefined|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **version** | [**number**] | Expected scene version for optimistic locking | (optional) defaults to undefined|


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
|**404** | Scene not found |  -  |
|**409** | Version conflict |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **scenesControllerUpdateItem**
> scenesControllerUpdateItem(updateSceneItemDto)


### Example

```typescript
import {
    ScenesLegacyDeprecatedApi,
    Configuration,
    UpdateSceneItemDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ScenesLegacyDeprecatedApi(configuration);

let projectId: string; //Project ID (default to undefined)
let sceneId: string; //Scene ID (default to undefined)
let itemId: string; //Scene item ID (default to undefined)
let updateSceneItemDto: UpdateSceneItemDto; //

const { status, data } = await apiInstance.scenesControllerUpdateItem(
    projectId,
    sceneId,
    itemId,
    updateSceneItemDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateSceneItemDto** | **UpdateSceneItemDto**|  | |
| **projectId** | [**string**] | Project ID | defaults to undefined|
| **sceneId** | [**string**] | Scene ID | defaults to undefined|
| **itemId** | [**string**] | Scene item ID | defaults to undefined|


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
|**403** | Scene item is locked |  -  |
|**404** | Scene item not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

