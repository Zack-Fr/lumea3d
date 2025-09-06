# AuthenticationApi

All URIs are relative to *http://localhost:3001*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**authControllerGetProfile**](#authcontrollergetprofile) | **GET** /auth/profile | Get current user profile|
|[**authControllerLogin**](#authcontrollerlogin) | **POST** /auth/login | Login with email and password|
|[**authControllerLogout**](#authcontrollerlogout) | **POST** /auth/logout | Logout user|
|[**authControllerRefresh**](#authcontrollerrefresh) | **POST** /auth/refresh | Refresh access token|
|[**authControllerRegister**](#authcontrollerregister) | **POST** /auth/register | Register a new user|

# **authControllerGetProfile**
> object authControllerGetProfile()


### Example

```typescript
import {
    AuthenticationApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

const { status, data } = await apiInstance.authControllerGetProfile();
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

# **authControllerLogin**
> object authControllerLogin(authControllerLoginRequest)


### Example

```typescript
import {
    AuthenticationApi,
    Configuration,
    AuthControllerLoginRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

let authControllerLoginRequest: AuthControllerLoginRequest; //

const { status, data } = await apiInstance.authControllerLogin(
    authControllerLoginRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **authControllerLoginRequest** | **AuthControllerLoginRequest**|  | |


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
|**200** | User successfully logged in |  -  |
|**401** | Invalid credentials |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authControllerLogout**
> authControllerLogout()


### Example

```typescript
import {
    AuthenticationApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

const { status, data } = await apiInstance.authControllerLogout();
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
|**200** | User successfully logged out |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authControllerRefresh**
> object authControllerRefresh(authControllerRefreshRequest)


### Example

```typescript
import {
    AuthenticationApi,
    Configuration,
    AuthControllerRefreshRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

let authControllerRefreshRequest: AuthControllerRefreshRequest; //

const { status, data } = await apiInstance.authControllerRefresh(
    authControllerRefreshRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **authControllerRefreshRequest** | **AuthControllerRefreshRequest**|  | |


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
|**200** | Token successfully refreshed |  -  |
|**401** | Invalid refresh token |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authControllerRegister**
> object authControllerRegister(authControllerRegisterRequest)


### Example

```typescript
import {
    AuthenticationApi,
    Configuration,
    AuthControllerRegisterRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

let authControllerRegisterRequest: AuthControllerRegisterRequest; //

const { status, data } = await apiInstance.authControllerRegister(
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
|**201** | User successfully registered |  -  |
|**409** | User with this email already exists |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

