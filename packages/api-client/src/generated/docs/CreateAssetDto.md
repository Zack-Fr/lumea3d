# CreateAssetDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**originalName** | **string** | Original filename of the uploaded asset | [default to undefined]
**mimeType** | **string** | MIME type of the asset file | [default to undefined]
**fileSize** | **number** | File size in bytes | [default to undefined]
**status** | **string** | Current processing status of the asset | [optional] [default to undefined]
**originalUrl** | **string** | URL to the original uploaded file | [optional] [default to undefined]
**meshoptUrl** | **string** | URL to the meshopt-compressed version | [optional] [default to undefined]
**dracoUrl** | **string** | URL to the Draco-compressed version | [optional] [default to undefined]
**navmeshUrl** | **string** | URL to the generated navigation mesh | [optional] [default to undefined]
**license** | **string** | Asset license type | [optional] [default to undefined]
**reportJson** | **object** | Processing report in JSON format | [optional] [default to undefined]
**errorMessage** | **string** | Error message if processing failed | [optional] [default to undefined]
**processedAt** | **string** | Timestamp when processing completed | [optional] [default to undefined]

## Example

```typescript
import { CreateAssetDto } from './api';

const instance: CreateAssetDto = {
    originalName,
    mimeType,
    fileSize,
    status,
    originalUrl,
    meshoptUrl,
    dracoUrl,
    navmeshUrl,
    license,
    reportJson,
    errorMessage,
    processedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
