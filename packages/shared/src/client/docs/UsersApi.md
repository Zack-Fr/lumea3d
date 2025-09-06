# UsersApi

All URIs are relative to *http://localhost:3001*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**usersControllerChangePassword**](#userscontrollerchangepassword) | **PUT** /users/me/password | Change current user password|
|[**usersControllerCreateUser**](#userscontrollercreateuser) | **POST** /users | Create a new user (Admin only)|
|[**usersControllerDeleteUser**](#userscontrollerdeleteuser) | **DELETE** /users/{id} | Delete user by ID (Admin only)|
|[**usersControllerGetCurrentUser**](#userscontrollergetcurrentuser) | **GET** /users/me | Get current user profile|
|[**usersControllerGetUserById**](#userscontrollergetuserbyid) | **GET** /users/{id} | Get user by ID (Admin only or own profile)|
|[**usersControllerGetUserStats**](#userscontrollergetuserstats) | **GET** /users/stats | Get user statistics (Admin only)|
|[**usersControllerGetUsers**](#userscontrollergetusers) | **GET** /users | Get all users with pagination and filtering (Admin only)|
|[**usersControllerUpdateCurrentUser**](#userscontrollerupdatecurrentuser) | **PUT** /users/me | Update current user profile|
|[**usersControllerUpdateUser**](#userscontrollerupdateuser) | **PUT** /users/{id} | Update user by ID (Admin only)|

# **usersControllerChangePassword**
> usersControllerChangePassword(usersControllerChangePasswordRequest)


### Example

```typescript
import {
    UsersApi,
    Configuration,
    UsersControllerChangePasswordRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

let usersControllerChangePasswordRequest: UsersControllerChangePasswordRequest; //

const { status, data } = await apiInstance.usersControllerChangePassword(
    usersControllerChangePasswordRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **usersControllerChangePasswordRequest** | **UsersControllerChangePasswordRequest**|  | |


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
|**200** | Password changed successfully |  -  |
|**400** | Current password is incorrect |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **usersControllerCreateUser**
> object usersControllerCreateUser(authControllerRegisterRequest)


### Example

```typescript
import {
    UsersApi,
    Configuration,
    AuthControllerRegisterRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

let authControllerRegisterRequest: AuthControllerRegisterRequest; //

const { status, data } = await apiInstance.usersControllerCreateUser(
    authControllerRegisterRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **authControllerRegisterRequest** | **AuthControllerRegisterRequest**|  | |


### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | User successfully created |  -  |
|**401** | Unauthorized |  -  |
|**403** | Access denied - Admin role required |  -  |
|**409** | User with this email already exists |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **usersControllerDeleteUser**
> usersControllerDeleteUser()


### Example

```typescript
import {
    UsersApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.usersControllerDeleteUser(
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
|**200** | User deleted successfully |  -  |
|**400** | Cannot delete own account |  -  |
|**401** | Unauthorized |  -  |
|**403** | Access denied - Admin role required |  -  |
|**404** | User not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **usersControllerGetCurrentUser**
> object usersControllerGetCurrentUser()


### Example

```typescript
import {
    UsersApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

const { status, data } = await apiInstance.usersControllerGetCurrentUser();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | User profile retrieved successfully |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **usersControllerGetUserById**
> object usersControllerGetUserById()


### Example

```typescript
import {
    UsersApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.usersControllerGetUserById(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | User retrieved successfully |  -  |
|**401** | Unauthorized |  -  |
|**403** | Access denied |  -  |
|**404** | User not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **usersControllerGetUserStats**
> object usersControllerGetUserStats()


### Example

```typescript
import {
    UsersApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

const { status, data } = await apiInstance.usersControllerGetUserStats();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | User statistics retrieved successfully |  -  |
|**401** | Unauthorized |  -  |
|**403** | Access denied - Admin role required |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **usersControllerGetUsers**
> object usersControllerGetUsers()


### Example

```typescript
import {
    UsersApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

let page: number; //Page number (default: 1) (optional) (default to undefined)
let limit: number; //Items per page (default: 10) (optional) (default to undefined)
let role: 'GUEST' | 'CLIENT' | 'DESIGNER' | 'ADMIN'; //Filter by role (optional) (default to undefined)
let search: string; //Search by name or email (optional) (default to undefined)
let isActive: boolean; //Filter by active status (optional) (default to undefined)

const { status, data } = await apiInstance.usersControllerGetUsers(
    page,
    limit,
    role,
    search,
    isActive
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **page** | [**number**] | Page number (default: 1) | (optional) defaults to undefined|
| **limit** | [**number**] | Items per page (default: 10) | (optional) defaults to undefined|
| **role** | [**&#39;GUEST&#39; | &#39;CLIENT&#39; | &#39;DESIGNER&#39; | &#39;ADMIN&#39;**]**Array<&#39;GUEST&#39; &#124; &#39;CLIENT&#39; &#124; &#39;DESIGNER&#39; &#124; &#39;ADMIN&#39;>** | Filter by role | (optional) defaults to undefined|
| **search** | [**string**] | Search by name or email | (optional) defaults to undefined|
| **isActive** | [**boolean**] | Filter by active status | (optional) defaults to undefined|


### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Users retrieved successfully |  -  |
|**401** | Unauthorized |  -  |
|**403** | Access denied - Admin role required |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **usersControllerUpdateCurrentUser**
> object usersControllerUpdateCurrentUser(usersControllerUpdateCurrentUserRequest)


### Example

```typescript
import {
    UsersApi,
    Configuration,
    UsersControllerUpdateCurrentUserRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

let usersControllerUpdateCurrentUserRequest: UsersControllerUpdateCurrentUserRequest; //

const { status, data } = await apiInstance.usersControllerUpdateCurrentUser(
    usersControllerUpdateCurrentUserRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **usersControllerUpdateCurrentUserRequest** | **UsersControllerUpdateCurrentUserRequest**|  | |


### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Profile updated successfully |  -  |
|**401** | Unauthorized |  -  |
|**409** | Email already taken |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **usersControllerUpdateUser**
> object usersControllerUpdateUser(usersControllerUpdateUserRequest)


### Example

```typescript
import {
    UsersApi,
    Configuration,
    UsersControllerUpdateUserRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new UsersApi(configuration);

let id: string; // (default to undefined)
let usersControllerUpdateUserRequest: UsersControllerUpdateUserRequest; //

const { status, data } = await apiInstance.usersControllerUpdateUser(
    id,
    usersControllerUpdateUserRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **usersControllerUpdateUserRequest** | **UsersControllerUpdateUserRequest**|  | |
| **id** | [**string**] |  | defaults to undefined|


### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | User updated successfully |  -  |
|**401** | Unauthorized |  -  |
|**403** | Access denied - Admin role required |  -  |
|**404** | User not found |  -  |
|**409** | Email already taken |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

