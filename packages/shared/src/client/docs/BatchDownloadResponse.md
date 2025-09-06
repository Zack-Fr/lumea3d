# BatchDownloadResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**sceneId** | **string** | Scene ID | [default to undefined]
**sceneName** | **string** | Scene name | [default to undefined]
**assets** | [**Array&lt;AssetDownloadInfo&gt;**](AssetDownloadInfo.md) | Assets available for download | [default to undefined]
**totalSize** | **number** | Total file size in bytes | [default to undefined]
**assetCount** | **number** | Number of assets | [default to undefined]
**generatedAt** | **string** | Batch generation timestamp | [default to undefined]

## Example

```typescript
import { BatchDownloadResponse } from './api';

const instance: BatchDownloadResponse = {
    sceneId,
    sceneName,
    assets,
    totalSize,
    assetCount,
    generatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
