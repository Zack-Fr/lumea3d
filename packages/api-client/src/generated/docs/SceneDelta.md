# SceneDelta


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**fromVersion** | **number** | Scene version this delta applies to | [default to undefined]
**toVersion** | **number** | Target scene version after applying delta | [default to undefined]
**operations** | **Array&lt;string&gt;** | Operations to apply | [default to undefined]
**timestamp** | **string** | Delta generation timestamp | [default to undefined]

## Example

```typescript
import { SceneDelta } from './api';

const instance: SceneDelta = {
    fromVersion,
    toVersion,
    operations,
    timestamp,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
