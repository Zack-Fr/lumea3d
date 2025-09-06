# CreateProjectSceneDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** | Initial scene name | [optional] [default to undefined]
**spawn** | [**CreateProjectSpawnDto**](CreateProjectSpawnDto.md) | Spawn configuration for the initial scene | [optional] [default to undefined]
**navmesh_asset_id** | **string** | Navmesh asset ID | [optional] [default to undefined]
**shell_asset_id** | **string** | Shell asset ID | [optional] [default to undefined]
**exposure** | **number** | Environment exposure setting | [optional] [default to undefined]

## Example

```typescript
import { CreateProjectSceneDto } from './api';

const instance: CreateProjectSceneDto = {
    name,
    spawn,
    navmesh_asset_id,
    shell_asset_id,
    exposure,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
