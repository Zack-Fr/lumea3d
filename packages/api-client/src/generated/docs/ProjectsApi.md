# ProjectsApi

All URIs are relative to *http://localhost:3001*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**projectsControllerCreate**](#projectscontrollercreate) | **POST** /projects | Create a new project|
|[**projectsControllerFindAll**](#projectscontrollerfindall) | **GET** /projects | Get user projects|
|[**projectsControllerFindOne**](#projectscontrollerfindone) | **GET** /projects/{id} | Get project details|

# **projectsControllerCreate**
> ProjectsControllerCreate201Response projectsControllerCreate(createProjectDto)

Creates a new project with auto-membership (ADMIN role) and optional initial scene configuration

### Example

```typescript
import {
    ProjectsApi,
    Configuration,
    CreateProjectDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ProjectsApi(configuration);

let createProjectDto: CreateProjectDto; //

const { status, data } = await apiInstance.projectsControllerCreate(
    createProjectDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createProjectDto** | **CreateProjectDto**|  | |


### Return type

**ProjectsControllerCreate201Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Project created successfully with auto-membership and initial scene |  -  |
|**400** | Invalid input data |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **projectsControllerFindAll**
> Array<ProjectsControllerFindAll200ResponseInner> projectsControllerFindAll()

Retrieves all projects where the user is a member

### Example

```typescript
import {
    ProjectsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProjectsApi(configuration);

const { status, data } = await apiInstance.projectsControllerFindAll();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<ProjectsControllerFindAll200ResponseInner>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of user projects with scene summary |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **projectsControllerFindOne**
> ProjectsControllerFindAll200ResponseInner projectsControllerFindOne()

Retrieves detailed information about a specific project (only if user is a member)

### Example

```typescript
import {
    ProjectsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProjectsApi(configuration);

let id: string; //Project UUID (default to undefined)

const { status, data } = await apiInstance.projectsControllerFindOne(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Project UUID | defaults to undefined|


### Return type

**ProjectsControllerFindAll200ResponseInner**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Project details with scenes |  -  |
|**401** | Unauthorized |  -  |
|**404** | Project not found or access denied |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

