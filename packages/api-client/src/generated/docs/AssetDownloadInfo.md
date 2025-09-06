# AssetDownloadInfo


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**assetId** | **string** | Asset ID | [default to undefined]
**categoryKey** | **string** | Category key | [default to undefined]
**filename** | **string** | Original filename | [default to undefined]
**downloadUrl** | **string** | Presigned download URL | [default to undefined]
**cdnUrl** | **string** | CDN URL if available | [optional] [default to undefined]
**variant** | **string** | Asset variant | [default to undefined]
**fileSize** | **number** | File size in bytes | [default to undefined]
**contentType** | **string** | Content type | [default to undefined]
**cacheHeaders** | **object** | Cache headers | [default to undefined]
**expiresAt** | **string** | URL expiration timestamp | [default to undefined]

## Example

```typescript
import { AssetDownloadInfo } from './api';

const instance: AssetDownloadInfo = {
    assetId,
    categoryKey,
    filename,
    downloadUrl,
    cdnUrl,
    variant,
    fileSize,
    contentType,
    cacheHeaders,
    expiresAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
