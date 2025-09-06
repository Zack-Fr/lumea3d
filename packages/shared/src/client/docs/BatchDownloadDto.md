# BatchDownloadDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**categoryKeys** | **Array&lt;string&gt;** | Category keys to include in batch download | [default to undefined]
**variant** | **string** | Asset variant to download for all items | [optional] [default to undefined]
**cacheDuration** | **number** | Cache duration in seconds | [optional] [default to undefined]
**includeCdn** | **boolean** | Include CDN URLs if available | [optional] [default to undefined]

## Example

```typescript
import { BatchDownloadDto } from './api';

const instance: BatchDownloadDto = {
    categoryKeys,
    variant,
    cacheDuration,
    includeCdn,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
