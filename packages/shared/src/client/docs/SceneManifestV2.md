# SceneManifestV2


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**scene** | **object** | Scene metadata | [default to undefined]
**items** | **Array&lt;string&gt;** | Scene items with transforms and materials | [default to undefined]
**categories** | **object** | Asset categories referenced in the scene with enhanced metadata support | [default to undefined]
**generatedAt** | **string** | Generation timestamp | [default to undefined]

## Example

```typescript
import { SceneManifestV2 } from './api';

const instance: SceneManifestV2 = {
    scene,
    items,
    categories,
    generatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
