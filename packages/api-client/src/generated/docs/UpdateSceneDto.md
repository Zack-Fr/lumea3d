# UpdateSceneDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** | Name of the 3D scene | [optional] [default to undefined]
**scale** | **number** | Scene scale factor | [optional] [default to undefined]
**exposure** | **number** | Scene exposure level | [optional] [default to undefined]
**envHdriUrl** | **string** | Environment HDRI texture URL | [optional] [default to undefined]
**envIntensity** | **number** | Environment light intensity | [optional] [default to undefined]
**spawnPositionX** | **number** | Spawn position X coordinate | [optional] [default to undefined]
**spawnPositionY** | **number** | Spawn position Y coordinate (height) | [optional] [default to undefined]
**spawnPositionZ** | **number** | Spawn position Z coordinate | [optional] [default to undefined]
**spawnYawDeg** | **number** | Spawn rotation yaw in degrees | [optional] [default to undefined]
**navmeshAssetId** | **string** | Navmesh asset ID for pathfinding | [optional] [default to undefined]

## Example

```typescript
import { UpdateSceneDto } from './api';

const instance: UpdateSceneDto = {
    name,
    scale,
    exposure,
    envHdriUrl,
    envIntensity,
    spawnPositionX,
    spawnPositionY,
    spawnPositionZ,
    spawnYawDeg,
    navmeshAssetId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
